import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../firebaseConfig';

export default function NotesEditor({ roomId = 'demo-room' }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Listen for realtime note updates from Cloud Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'notes'),
      where('roomId', '==', roomId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedNotes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotes(fetchedNotes);
      },
      (error) => {
        console.error('Firestore listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // Helper: Upload local URI to Firebase Storage
  const uploadToStorage = async (uri, name) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `rooms/${roomId}/notes/${Date.now()}_${name}`);
    await uploadBytesResumable(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  // 2. Pick an image from gallery
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Gallery access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.fileName || `media_${Date.now()}.jpg`,
          type: asset.type === 'video' ? 'video' : 'image',
        },
      ]);
    }
  };

  // 3. Pick a document (PDF, Word, Script, etc.)
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachments((prev) => [
          ...prev,
          {
            uri: file.uri,
            name: file.name,
            type: 'document',
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error picking document', err.message);
    }
  };

  // 4. Save note and upload all attachments
  const handleSaveNote = async () => {
    if (!title.trim() && !body.trim()) {
      Alert.alert('Empty Note', 'Please provide a title or note content.');
      return;
    }

    setIsUploading(true);

    try {
      // Upload pending attachments to Firebase Storage
      const uploadedUrls = [];
      for (const item of attachments) {
        const downloadUrl = await uploadToStorage(item.uri, item.name);
        uploadedUrls.push({
          name: item.name,
          url: downloadUrl,
          type: item.type,
        });
      }

      // Save note document in Firestore
      await addDoc(collection(db, 'notes'), {
        roomId: roomId,
        title: title.trim(),
        content: body.trim(),
        attachments: uploadedUrls,
        authorEmail: auth.currentUser ? auth.currentUser.email : 'Anonymous',
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setBody('');
      setAttachments([]);
    } catch (error) {
      Alert.alert('Upload Failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 5. Export note to Google Drive / Device Share
  const handleExportNote = async (item) => {
    const fileContent = `FILMROOM PRODUCTION NOTE\nTITLE: ${item.title}\nAUTHOR: ${item.authorEmail}\n\nCONTENT:\n${item.content}\n\nATTACHMENTS:\n${
      item.attachments && item.attachments.length > 0
        ? item.attachments.map((a) => `- ${a.name}: ${a.url}`).join('\n')
        : 'None'
    }`;

    const path = `${FileSystem.documentDirectory}${item.title.replace(/\s+/g, '_') || 'Note'}.txt`;

    try {
      await FileSystem.writeAsStringAsync(path, fileContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'text/plain',
          dialogTitle: 'Save Note to Google Drive',
        });
      }
    } catch (e) {
      Alert.alert('Export Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Editor Box */}
      <View style={styles.editorBox}>
        <TextInput
          style={styles.titleInput}
          placeholder="Note Title (e.g., Scene 4 Lighting Setup)"
          placeholderTextColor="#777"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.bodyInput}
          placeholder="Write script notes, director comments, blocking instructions..."
          placeholderTextColor="#666"
          value={body}
          onChangeText={setBody}
          multiline
        />

        {/* Attachment Queue */}
        {attachments.length > 0 && (
          <View style={styles.attachmentList}>
            {attachments.map((att, idx) => (
              <View key={idx} style={styles.fileChip}>
                <Text style={styles.fileChipText} numberOfLines={1}>
                  📎 {att.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.toolsLeft}>
            <TouchableOpacity style={styles.toolBtn} onPress={handlePickImage}>
              <Text style={styles.toolBtnText}>+ Photo/Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={handlePickDocument}>
              <Text style={styles.toolBtnText}>+ Doc/PDF</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveNote}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Note</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes List */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => handleExportNote(item)}
              >
                <Text style={styles.shareBtnText}>Save to Drive</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardAuthor}>{item.authorEmail}</Text>
            <Text style={styles.cardBody}>{item.content}</Text>

            {/* Render Remote Media Links */}
            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.savedAttachments}>
                {item.attachments.map((att, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.linkButton}
                    onPress={() => Linking.openURL(att.url)}
                  >
                    <Text style={styles.linkText}>🔗 Open {att.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 12 },
  editorBox: {
    backgroundColor: '#1c1c1e',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  titleInput: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderColor: '#333',
    paddingBottom: 8,
    marginBottom: 10,
  },
  bodyInput: {
    color: '#DDD',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  attachmentList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  fileChip: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fileChipText: { color: '#AAA', fontSize: 11 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  toolsLeft: { flexDirection: 'row', gap: 8 },
  toolBtn: {
    backgroundColor: '#2c2c2e',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  toolBtnText: { color: '#BBB', fontSize: 12, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#e50914',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  card: {
    backgroundColor: '#181818',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
  shareBtn: { backgroundColor: '#333', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  shareBtnText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  cardAuthor: { color: '#666', fontSize: 11, marginVertical: 4 },
  cardBody: { color: '#CCC', fontSize: 13, marginTop: 4, lineHeight: 18 },
  savedAttachments: { marginTop: 10, gap: 6 },
  linkButton: {
    backgroundColor: '#222',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#e50914',
  },
  linkText: { color: '#4da6ff', fontSize: 12, fontWeight: '600' },
});
