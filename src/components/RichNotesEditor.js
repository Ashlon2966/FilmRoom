import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../firebaseConfig';

export default function RichNotesEditor({ roomId = 'main-room', noteId = 'production-master-notes' }) {
  const richTextRef = useRef();
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load existing note from Cloud Firestore on mount
  useEffect(() => {
    const fetchNote = async () => {
      try {
        const noteRef = doc(db, 'rooms', roomId, 'richNotes', noteId);
        const docSnap = await getDoc(noteRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHtmlContent(data.content || '');
        }
      } catch (error) {
        console.error('Failed to load note:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [roomId, noteId]);

  // 2. Pick image from device, upload to Firebase Storage, and insert into editor
  const handleInsertImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to insert pictures.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      try {
        setIsSaving(true);
        const response = await fetch(localUri);
        const blob = await response.blob();
        const storagePath = `rooms/${roomId}/notes_media/${Date.now()}.jpg`;
        const storageReference = ref(storage, storagePath);

        await uploadBytesResumable(storageReference, blob);
        const downloadUrl = await getDownloadURL(storageReference);

        // Inject the image directly into the active editor cursor position
        richTextRef.current?.insertImage(downloadUrl);
      } catch (error) {
        Alert.alert('Upload Failed', error.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 3. Save note to Cloud Firestore
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const currentHtml = await richTextRef.current?.getContentHtml();
      const noteRef = doc(db, 'rooms', roomId, 'richNotes', noteId);

      await setDoc(
        noteRef,
        {
          content: currentHtml,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser ? auth.currentUser.email : 'Anonymous Filmmaker',
        },
        { merge: true }
      );

      Alert.alert('Saved', 'Your notes have been synchronized with the cloud.');
    } catch (error) {
      Alert.alert('Save Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Export as Printable PDF / Direct to Google Drive
  const handleExportPDF = async () => {
    try {
      const currentHtml = await richTextRef.current?.getContentHtml();
      const formattedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #222;
              line-height: 1.6;
            }
            h1, h2, h3 { color: #111; }
            img { max-width: 100%; border-radius: 6px; margin: 10px 0; }
            blockquote { border-left: 4px solid #e50914; margin-left: 0; padding-left: 14px; color: #555; }
          </style>
        </head>
        <body>
          <h2>FilmRoom Production Notes</h2>
          <hr />
          ${currentHtml}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: formattedHtml });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Note to Google Drive',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      Alert.alert('PDF Export Error', error.message);
    }
  };

  // 5. Export as Plain Text (.txt)
  const handleExportTXT = async () => {
    try {
      const currentHtml = await richTextRef.current?.getContentHtml();
      // Simple regex stripping HTML tags to get raw text
      const cleanText = currentHtml.replace(/<[^>]*>?/gm, '');

      const filePath = `${FileSystem.documentDirectory}FilmRoom_Notes_${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(filePath, cleanText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Save Text Note to Google Drive',
        });
      }
    } catch (error) {
      Alert.alert('Text Export Error', error.message);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading production notes...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Top Action Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WORD NOTES</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleExportTXT}>
            <Text style={styles.btnText}>.TXT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleExportPDF}>
            <Text style={styles.btnText}>Drive/PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveToCloud} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Word-style Formatting Toolbar */}
      <RichToolbar
        editor={richTextRef}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.setUnderline,
          actions.heading1,
          actions.heading2,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.blockquote,
          actions.setStrikethrough,
          'insertCustomImage',
        ]}
        iconMap={{
          insertCustomImage: () => <Text style={styles.toolbarIcon}>📷</Text>,
        }}
        insertCustomImage={handleInsertImage}
        style={styles.toolbar}
        iconTint="#AAAAAA"
        selectedIconTint="#E50914"
      />

      {/* Document Canvas */}
      <ScrollView style={styles.editorContainer}>
        <RichEditor
          ref={richTextRef}
          initialContentHTML={htmlContent}
          placeholder="Start writing your script notes, blocking directions, or shot ideas..."
          editorStyle={{
            backgroundColor: '#18181a',
            color: '#FFFFFF',
            placeholderColor: '#777777',
            contentCSSText: 'font-size: 15px; min-height: 400px; padding: 12px;',
          }}
          style={styles.richEditor}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#888', marginTop: 10, fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: '#262626',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnText: { color: '#BBB', fontWeight: 'bold', fontSize: 12 },
  saveBtn: {
    backgroundColor: '#e50914',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  toolbar: {
    backgroundColor: '#1f1f23',
    borderBottomWidth: 1,
    borderColor: '#2d2d30',
  },
  toolbarIcon: { fontSize: 15 },
  editorContainer: { flex: 1, padding: 8 },
  richEditor: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    minHeight: 450,
  },
});
