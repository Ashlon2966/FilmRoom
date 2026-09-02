import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import RoleBadge from '../../components/RoleBadge';

export default function ChatScreen() {
  const { currentUser, userProfile } = useAuth();
  const { activeRoomId, roomData } = useRoom();
  const { theme } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const flatListRef = useRef(null);

  // Check if current user has Director or Producer privileges
  const userRoomRoles =
    roomData?.members?.[currentUser?.uid]?.roles ||
    userProfile?.roles ||
    [];
  const isDirectorOrLead = userRoomRoles.some((role) =>
    ['Director', 'Producer'].includes(role)
  );

  // Listen for real-time room chat messages
  useEffect(() => {
    if (!activeRoomId) return;

    const messagesRef = collection(db, 'rooms', activeRoomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMessages(loaded);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  // Send message with optional anonymous flag
  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeRoomId) return;

    const currentRole = userRoomRoles[0] || 'Crew';
    const messagePayload = {
      text: inputText.trim(),
      senderId: currentUser.uid,
      senderName: userProfile?.fullName || currentUser.displayName || currentUser.email,
      senderUsername: userProfile?.username || 'crew',
      senderRole: currentRole,
      isAnonymous: isAnonymous,
      createdAt: serverTimestamp(),
    };

    setInputText('');

    try {
      await addDoc(collection(db, 'rooms', activeRoomId, 'messages'), messagePayload);
    } catch (error) {
      Alert.alert('Send Error', error.message);
    }
  };

  // Delete a specific message
  const handleDeleteMessage = (messageItem) => {
    const isOwner = messageItem.senderId === currentUser?.uid;

    if (!isOwner && !isDirectorOrLead) {
      Alert.alert('Restricted', 'Only the sender or the Director can delete this message.');
      return;
    }

    Alert.alert('Delete Message', 'Remove this message from the production room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'rooms', activeRoomId, 'messages', messageItem.id));
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // Clear entire room chat (Director/Producer only)
  const handleClearRoomChat = () => {
    if (!isDirectorOrLead) {
      Alert.alert('Restricted', 'Only Directors or Producers can clear room chat history.');
      return;
    }

    Alert.alert('Clear Chat', 'Permanently delete all messages in this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            const messagesRef = collection(db, 'rooms', activeRoomId, 'messages');
            const snapshot = await getDocs(messagesRef);
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          } catch (err) {
            Alert.alert('Clear Failed', err.message);
          }
        },
      },
    ]);
  };

  const renderMessageItem = ({ item }) => {
    const isMine = item.senderId === currentUser?.uid;

    // Determine displayed sender name
    let displayedName = item.senderName;
    if (item.isAnonymous) {
      if (isMine) {
        displayedName = 'You (Sent Anonymously)';
      } else if (isDirectorOrLead) {
        // Director override: reveals real sender identity
        displayedName = `Anonymous [Director Reveal: ${item.senderName} (@${item.senderUsername})]`;
      } else {
        displayedName = 'Anonymous Crew';
      }
    }

    return (
      <TouchableOpacity
        onLongPress={() => handleDeleteMessage(item)}
        activeOpacity={0.8}
        style={[
          styles.messageBubbleContainer,
          isMine ? styles.myBubbleContainer : styles.otherBubbleContainer,
        ]}
      >
        <View style={styles.senderHeader}>
          <Text
            style={[
              styles.senderName,
              { color: item.isAnonymous ? '#f5a623' : theme.textSecondary },
            ]}
          >
            {displayedName}
          </Text>
          {!item.isAnonymous && <RoleBadge role={item.senderRole} size="small" />}
        </View>

        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isMine
                ? theme.primary
                : item.isAnonymous
                ? '#2c2214'
                : theme.card,
              borderColor: item.isAnonymous ? '#f5a623' : 'transparent',
              borderWidth: item.isAnonymous ? 1 : 0,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: '#ffffff' }]}>{item.text}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Controls Header */}
      <View style={[styles.topBar, { borderColor: theme.border }]}>
        <View style={styles.anonToggleRow}>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#444', true: '#f5a623' }}
            thumbColor="#ffffff"
          />
          <Text style={[styles.anonLabel, { color: isAnonymous ? '#f5a623' : theme.textSecondary }]}>
            {isAnonymous ? 'Incognito Mode ON' : 'Send as Yourself'}
          </Text>
        </View>

        {isDirectorOrLead && (
          <TouchableOpacity onPress={handleClearRoomChat} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No production messages yet. Long-press any message to delete.
            </Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          style={[styles.textInput, { color: theme.text }]}
          placeholder={isAnonymous ? 'Type anonymously...' : 'Message the crew...'}
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: isAnonymous ? '#f5a623' : theme.primary }]}
          onPress={handleSendMessage}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  anonToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  anonLabel: { fontSize: 12, fontWeight: '700' },
  clearBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#333' },
  clearBtnText: { color: '#e50914', fontSize: 11, fontWeight: 'bold' },
  listContent: { padding: 14, paddingBottom: 20 },
  messageBubbleContainer: { marginVertical: 6, maxWidth: '85%' },
  myBubbleContainer: { alignSelf: 'flex-end' },
  otherBubbleContainer: { alignSelf: 'flex-start' },
  senderHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  senderName: { fontSize: 11, fontWeight: '700' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  messageText: { fontSize: 14, lineHeight: 19 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', fontSize: 13, fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  sendButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});