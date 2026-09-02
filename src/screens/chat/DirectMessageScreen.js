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
} from 'react-native';
import {
  collection,
  addDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function DirectMessageScreen({ route }) {
  const { peerUser } = route.params;
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myClearedTimestamp, setMyClearedTimestamp] = useState(0);
  const flatListRef = useRef(null);

  const threadId = [currentUser.uid, peerUser.id].sort().join('_');
  const isPeerBlockedByMe = userProfile?.blockedUsers?.includes(peerUser.id);
  const [isMeBlockedByPeer, setIsMeBlockedByPeer] = useState(false);

  // 1. Listen to thread metadata for one-sided clear timestamps
  useEffect(() => {
    const threadDocRef = doc(db, 'direct_threads', threadId);
    const unsubscribeThread = onSnapshot(threadDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const clearedMillis = data?.clearedAt?.[currentUser.uid] || 0;
        setMyClearedTimestamp(clearedMillis);
      }
    });

    return () => unsubscribeThread();
  }, [threadId, currentUser.uid]);

  // 2. Stream peer blocking state
  useEffect(() => {
    const peerDocRef = doc(db, 'users', peerUser.id);
    const unsubscribePeer = onSnapshot(peerDocRef, (snap) => {
      if (snap.exists()) {
        const peerData = snap.data();
        setIsMeBlockedByPeer(peerData?.blockedUsers?.includes(currentUser.uid) || false);
      }
    });

    return () => unsubscribePeer();
  }, [peerUser.id, currentUser.uid]);

  // 3. Stream messages, filtering out items prior to currentUser's clearedAt timestamp
  useEffect(() => {
    const messagesRef = collection(db, 'direct_messages', threadId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const allLoaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Filter: Show only messages sent after this user's clear action
      const visibleMessages = allLoaded.filter((msg) => {
        const msgMillis = msg.createdMillis || 0;
        return msgMillis >= myClearedTimestamp;
      });

      setMessages(visibleMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => unsubscribeMessages();
  }, [threadId, myClearedTimestamp]);

  // Send Direct Message & update parent thread metadata
  const handleSendDM = async () => {
    if (!inputText.trim()) return;

    if (isPeerBlockedByMe) {
      Alert.alert('Blocked', 'Unblock this user to send a message.');
      return;
    }
    if (isMeBlockedByPeer) {
      Alert.alert('Unavailable', 'You cannot message this user.');
      return;
    }

    const nowMillis = Date.now();
    const messagePayload = {
      text: inputText.trim(),
      senderId: currentUser.uid,
      senderUsername: userProfile?.username || 'user',
      isSystemMessage: false,
      createdMillis: nowMillis,
      createdAt: serverTimestamp(),
    };

    setInputText('');

    try {
      // Add message
      await addDoc(collection(db, 'direct_messages', threadId, 'messages'), messagePayload);

      // Upsert conversation thread for the inbox list
      await setDoc(
        doc(db, 'direct_threads', threadId),
        {
          participantIds: [currentUser.uid, peerUser.id],
          participantsData: {
            [currentUser.uid]: {
              fullName: userProfile?.fullName || currentUser.email,
              username: userProfile?.username || 'user',
            },
            [peerUser.id]: {
              fullName: peerUser.fullName || peerUser.username,
              username: peerUser.username,
            },
          },
          lastMessageText: messagePayload.text,
          lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastMessageAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // One-sided Clear Chat: Clears for the user and alerts the peer
  const handleClearMyChat = () => {
    Alert.alert(
      'Clear Chat',
      'Clear your message history? The other participant will receive a notice that you cleared your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const clearMillis = Date.now();
            try {
              // 1. Mark clear timestamp for current user in thread doc
              await setDoc(
                doc(db, 'direct_threads', threadId),
                {
                  clearedAt: {
                    [currentUser.uid]: clearMillis,
                  },
                },
                { merge: true }
              );

              // 2. Add system notice message visible to both parties
              await addDoc(collection(db, 'direct_messages', threadId, 'messages'), {
                text: `${userProfile?.fullName || `@${userProfile?.username}`} cleared their chat history.`,
                senderId: 'SYSTEM',
                isSystemMessage: true,
                createdMillis: clearMillis,
                createdAt: serverTimestamp(),
              });
            } catch (err) {
              Alert.alert('Clear Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Block / Unblock Toggle
  const handleToggleBlock = async () => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      if (isPeerBlockedByMe) {
        await updateDoc(userDocRef, {
          blockedUsers: arrayRemove(peerUser.id),
        });
        Alert.alert('Unblocked', `@${peerUser.username} has been unblocked.`);
      } else {
        Alert.alert('Block User', `Block 1-on-1 messages from @${peerUser.username}?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              await updateDoc(userDocRef, {
                blockedUsers: arrayUnion(peerUser.id),
              });
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Action Failed', err.message);
    }
  };

  const renderMessageItem = ({ item }) => {
    // System message banner (e.g., "[User] cleared their chat history")
    if (item.isSystemMessage) {
      return (
        <View style={styles.systemBanner}>
          <Text style={[styles.systemBannerText, { color: theme.textSecondary }]}>
            ℹ️ {item.text}
          </Text>
        </View>
      );
    }

    const isMine = item.senderId === currentUser.uid;
    return (
      <View style={[styles.bubbleWrapper, isMine ? styles.myWrapper : styles.peerWrapper]}>
        <View style={[styles.bubble, { backgroundColor: isMine ? theme.primary : theme.card }]}>
          <Text style={[styles.messageText, { color: '#ffffff' }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Header */}
      <View style={[styles.header, { borderColor: theme.border }]}>
        <View>
          <Text style={[styles.peerName, { color: theme.text }]}>{peerUser.fullName}</Text>
          <Text style={[styles.peerUsername, { color: theme.textSecondary }]}>
            @{peerUser.username}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearMyChat}>
            <Text style={styles.headerBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.blockBtn, isPeerBlockedByMe && styles.unblockBtn]}
            onPress={handleToggleBlock}
          >
            <Text style={styles.blockBtnText}>
              {isPeerBlockedByMe ? 'Unblock' : 'Block'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Message Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.feed}
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={[styles.emptyFeedText, { color: theme.textSecondary }]}>
              No messages here yet.
            </Text>
          </View>
        }
      />

      {/* Input Bar or Block Banner */}
      {isPeerBlockedByMe ? (
        <View style={[styles.blockedBanner, { backgroundColor: theme.surface }]}>
          <Text style={styles.blockedText}>You have blocked this user.</Text>
        </View>
      ) : isMeBlockedByPeer ? (
        <View style={[styles.blockedBanner, { backgroundColor: theme.surface }]}>
          <Text style={styles.blockedText}>This user is currently unavailable.</Text>
        </View>
      ) : (
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            style={[styles.textInput, { color: theme.text }]}
            placeholder="Send private message..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.primary }]}
            onPress={handleSendDM}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  peerName: { fontSize: 15, fontWeight: '800' },
  peerUsername: { fontSize: 12 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  clearBtn: { backgroundColor: '#333', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  headerBtnText: { color: '#ccc', fontSize: 12, fontWeight: '600' },
  blockBtn: { backgroundColor: '#b00020', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  unblockBtn: { backgroundColor: '#4caf50' },
  blockBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  feed: { padding: 14, paddingBottom: 20 },
  bubbleWrapper: { marginVertical: 4, maxWidth: '80%' },
  myWrapper: { alignSelf: 'flex-end' },
  peerWrapper: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  messageText: { fontSize: 14, lineHeight: 19 },
  systemBanner: { alignSelf: 'center', marginVertical: 10, paddingHorizontal: 12, paddingVertical: 4 },
  systemBannerText: { fontSize: 11, fontStyle: 'italic' },
  emptyFeed: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyFeedText: { textAlign: 'center', fontSize: 13, fontStyle: 'italic' },
  blockedBanner: { padding: 16, alignItems: 'center' },
  blockedText: { color: '#e50914', fontWeight: 'bold', fontSize: 13 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1 },
  textInput: { flex: 1, fontSize: 14, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  sendBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});