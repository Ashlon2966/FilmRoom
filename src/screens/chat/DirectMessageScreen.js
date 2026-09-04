import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BackButton from '../../components/BackButton';

export default function DirectMessageScreen({ route, navigation }) {
  const { peerUser } = route.params || {};
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const flatListRef = useRef(null);

  const threadId =
    currentUser?.uid < peerUser?.id
      ? `${currentUser?.uid}_${peerUser?.id}`
      : `${peerUser?.id}_${currentUser?.uid}`;

  // Stream messages from Firestore
  useEffect(() => {
    if (!threadId) return;

    const messagesRef = collection(db, 'direct_messages', threadId, 'chats');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMessages(loaded);
    });

    return () => unsubscribe();
  }, [threadId]);

  // Send message
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');

    try {
      const messagesRef = collection(db, 'direct_messages', threadId, 'chats');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: userProfile?.fullName || currentUser.email,
        text: textToSend.trim(),
        createdAt: serverTimestamp(),
      });

      const threadRef = doc(db, 'direct_threads', threadId);
      await setDoc(
        threadRef,
        {
          participantIds: [currentUser.uid, peerUser.id],
          lastMessageText: textToSend.trim(),
          lastMessageAt: serverTimestamp(),
          participants: {
            [currentUser.uid]: {
              name: userProfile?.fullName || currentUser.email,
              username: userProfile?.username || 'user',
            },
            [peerUser.id]: {
              name: peerUser.fullName || peerUser.name || 'Filmmaker',
              username: peerUser.username || 'crew',
            },
          },
        },
        { merge: true }
      );
    } catch (error) {
      Alert.alert('Send Error', error.message);
    }
  };

  // Option 1: Clear Chat (Wipes message docs, retains conversation in recents)
  const handleClearChat = async () => {
    setIsMenuVisible(false);
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const messagesRef = collection(db, 'direct_messages', threadId, 'chats');
              const snap = await getDocs(messagesRef);
              const deletions = snap.docs.map((d) => deleteDoc(d.ref));
              await Promise.all(deletions);

              await updateDoc(doc(db, 'direct_threads', threadId), {
                lastMessageText: 'Chat cleared',
                lastMessageAt: serverTimestamp(),
              });
              setMessages([]);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Option 2: Delete Chat (Wipes messages AND deletes the thread from recents list)
  const handleDeleteChat = async () => {
    setIsMenuVisible(false);
    Alert.alert(
      'Delete Chat',
      'This will delete the messages and remove this thread from your recents list (connection remains).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const messagesRef = collection(db, 'direct_messages', threadId, 'chats');
              const snap = await getDocs(messagesRef);
              const deletions = snap.docs.map((d) => deleteDoc(d.ref));
              await Promise.all(deletions);

              await deleteDoc(doc(db, 'direct_threads', threadId));
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Option 3: Block Filmmaker
  const handleBlockUser = async () => {
    setIsMenuVisible(false);
    Alert.alert(
      'Block Filmmaker',
      `Are you sure you want to block ${peerUser?.fullName || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, {
                blockedUids: arrayUnion(peerUser.id),
              });
              Alert.alert('Blocked', 'User has been blocked.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme?.background || '#0c0d0e' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Header with Back Arrow and 3 Dots on Far Right */}
      <View style={[styles.header, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <View style={styles.headerLeft}>
          <BackButton />
          <View style={styles.headerInfo}>
            <Text style={[styles.peerName, { color: theme?.text || '#ffffff' }]}>
              {peerUser?.fullName || peerUser?.name || 'Filmmaker'}
            </Text>
            <Text style={[styles.peerUsername, { color: theme?.textSecondary || '#9ca3af' }]}>
              @{peerUser?.username || 'crew'}
            </Text>
          </View>
        </View>

        {/* 3 Dots Option Menu Icon */}
        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}
          onPress={() => setIsMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuIcon, { color: theme?.text || '#ffffff' }]}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.senderId === currentUser?.uid;
          return (
            <View style={[styles.messageRow, isMe ? styles.myRow : styles.peerRow]}>
              <View
                style={[
                  styles.messageBubble,
                  isMe
                    ? { backgroundColor: theme?.primary || '#f5a623' }
                    : { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830', borderWidth: 1 },
                ]}
              >
                <Text style={[styles.messageText, { color: isMe ? '#000000' : theme?.text || '#ffffff' }]}>
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme?.textSecondary || '#9ca3af' }]}>
              No messages here yet.
            </Text>
          </View>
        }
      />

      {/* Multiline Input Bar */}
      <View style={[styles.inputContainer, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <TextInput
          style={[styles.input, { color: theme?.text || '#ffffff' }]}
          placeholder="Message..."
          placeholderTextColor={theme?.textMuted || '#64748b'}
          value={inputText}
          onChangeText={setInputText}
          multiline={true}
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="center"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: inputText.trim() ? (theme?.primary || '#f5a623') : '#33373d' },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
        >
          <Text style={[styles.sendButtonText, { color: inputText.trim() ? '#000000' : '#888888' }]}>
            Send
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3-Dots Action Dropdown Modal */}
      <Modal visible={isMenuVisible} animationType="fade" transparent onRequestClose={() => setIsMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setIsMenuVisible(false)}>
          <View style={[styles.dropdownMenu, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
            <TouchableOpacity style={styles.menuOption} onPress={handleClearChat}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🧹</Text>
              <Text style={[styles.menuOptionText, { color: theme?.text || '#ffffff' }]}>Clear Chat</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme?.cardBorder || '#242830' }]} />

            <TouchableOpacity style={styles.menuOption} onPress={handleDeleteChat}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🗑</Text>
              <Text style={[styles.menuOptionText, { color: theme?.text || '#ffffff' }]}>Delete Chat</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme?.cardBorder || '#242830' }]} />

            <TouchableOpacity style={styles.menuOption} onPress={handleBlockUser}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🚫</Text>
              <Text style={[styles.menuOptionText, { color: '#f87171' }]}>Block Filmmaker</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    flex: 1,
  },
  peerName: {
    fontSize: 16,
    fontWeight: '900',
  },
  peerUsername: {
    fontSize: 12,
    marginTop: 2,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: '900',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    marginTop: 180,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  peerRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
  },
  input: {
    flex: 1,
    fontSize: 14,
    minHeight: 38,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 54,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 190,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    elevation: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  menuDivider: {
    height: 1,
    marginVertical: 2,
  },
});