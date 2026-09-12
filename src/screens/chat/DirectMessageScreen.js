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
  ActivityIndicator,
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
import { isConnectionAccepted } from '../../services/connectionService';

export default function DirectMessageScreen({ route, navigation }) {
  const { peerUser } = route.params || {};
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const flatListRef = useRef(null);

  const peerId = peerUser?.id || peerUser?.uid;
  const threadId =
    currentUser?.uid && peerId
      ? currentUser.uid < peerId
        ? `${currentUser.uid}_${peerId}`
        : `${peerId}_${currentUser.uid}`
      : null;

  // Blocked status check (bilateral)
  const isBlockedByMe = (userProfile?.blockedUids || []).includes(peerId);
  const [isBlockedByPeer, setIsBlockedByPeer] = useState(false);

  useEffect(() => {
    if (!peerId || !currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', peerId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsBlockedByPeer((data.blockedUids || []).includes(currentUser.uid));
      }
    });
    return () => unsub();
  }, [peerId, currentUser?.uid]);

  const isBlocked = isBlockedByMe || isBlockedByPeer;

  // Check connection status
  useEffect(() => {
    let isMounted = true;
    const verifyConnection = async () => {
      if (currentUser?.uid && peerId) {
        const accepted = await isConnectionAccepted(currentUser.uid, peerId);
        if (isMounted) {
          setIsConnected(accepted);
          setCheckingConnection(false);
        }
      } else {
        if (isMounted) setCheckingConnection(false);
      }
    };
    verifyConnection();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, peerId]);

  // Stream messages from Firestore
  useEffect(() => {
    if (!threadId) return;

    const messagesRef = collection(db, 'direct_messages', threadId, 'chats');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMessages(loaded);
      },
      (error) => {
        console.error('Messages stream error:', error);
      }
    );

    return () => unsubscribe();
  }, [threadId]);

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !threadId || isBlocked || isSending || !isConnected) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const messagesRef = collection(db, 'direct_messages', threadId, 'chats');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: userProfile?.fullName || currentUser.email,
        text: textToSend,
        createdAt: serverTimestamp(),
      });

      const threadRef = doc(db, 'direct_threads', threadId);
      await setDoc(
        threadRef,
        {
          participantIds: [currentUser.uid, peerId],
          lastMessageText: textToSend,
          lastMessageAt: serverTimestamp(),
          participants: {
            [currentUser.uid]: {
              name: userProfile?.fullName || currentUser.email,
              username: userProfile?.username || 'user',
              photoURL: userProfile?.photoURL || null,
              role: userProfile?.roles?.[0] || 'Filmmaker',
            },
            [peerId]: {
              name: peerUser.fullName || peerUser.name || 'Filmmaker',
              username: peerUser.username || 'crew',
              photoURL: peerUser.photoURL || peerUser.avatar || null,
              role: peerUser.roles?.[0] || peerUser.role || 'Crew',
            },
          },
        },
        { merge: true }
      );
    } catch (error) {
      Alert.alert('Send Error', error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Option 1: Clear Chat (Wipes message documents, preserves thread and connection)
  const handleClearChat = async () => {
    setIsMenuVisible(false);
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this conversation? The connection will remain active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Messages',
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

  // Option 2: Delete Chat (Removes thread from recent chats, preserves connection)
  const handleDeleteChat = async () => {
    setIsMenuVisible(false);
    Alert.alert(
      'Delete Chat',
      'This removes the conversation from your recent chats list. Your filmmaker connection remains intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Chat',
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
      `Block ${peerUser?.fullName || peerUser?.name || 'this filmmaker'}? You will no longer be able to message each other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, {
                blockedUids: arrayUnion(peerId),
              });
              Alert.alert('Blocked', 'Filmmaker has been blocked.');
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
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Stationary Top Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.cardBorder },
        ]}
      >
        <View style={styles.headerLeft}>
          <BackButton />
          <View style={styles.headerInfo}>
            <Text style={[styles.peerName, { color: theme.text }]} numberOfLines={1}>
              {peerUser?.fullName || peerUser?.name || 'Filmmaker'}
            </Text>
            <Text style={[styles.peerUsername, { color: theme.textSecondary }]} numberOfLines={1}>
              @{peerUser?.username || 'crew'}
            </Text>
          </View>
        </View>

        {/* 3-Dots Action Menu */}
        <TouchableOpacity
          style={[
            styles.menuBtn,
            { backgroundColor: theme.surface, borderColor: theme.cardBorder },
          ]}
          onPress={() => setIsMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuIcon, { color: theme.text }]}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Blocked Alert Banner */}
      {isBlockedByMe && (
        <View style={[styles.blockedBanner, { backgroundColor: theme.dangerBg }]}>
          <Text style={[styles.blockedBannerText, { color: theme.text }]}>
            You have blocked this filmmaker. Unblock in settings to message.
          </Text>
        </View>
      )}

      {!isBlockedByMe && isBlockedByPeer && (
        <View style={[styles.blockedBanner, { backgroundColor: '#2a1a1a', borderColor: '#522b2b', borderWidth: 1 }]}>
          <Text style={[styles.blockedBannerText, { color: '#f87171' }]}>
            This filmmaker is currently unavailable for messaging.
          </Text>
        </View>
      )}

      {/* Connection Required Banner */}
      {!isConnected && !checkingConnection && (
        <View style={[styles.blockedBanner, { backgroundColor: '#2a1a1a', borderColor: '#522b2b', borderWidth: 1 }]}>
          <Text style={[styles.blockedBannerText, { color: '#f87171' }]}>
            ⚠️ Connection Required: Messaging is restricted until a mutual contact request is accepted.
          </Text>
        </View>
      )}

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
                     ? { backgroundColor: theme.primary }
                    : {
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                        borderWidth: 1,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: isMe ? '#000000' : theme.text },
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyIcon, { color: theme.textMuted }]}>💬</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No messages yet. Send a message to start collaborating.
            </Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.card, borderTopColor: theme.cardBorder },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={
            !isConnected
              ? 'Messaging locked (Connection required)...'
              : isBlocked
              ? 'Filmmaker is unavailable'
              : 'Write a message...'
          }
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline={true}
          blurOnSubmit={false}
          editable={!isBlocked && isConnected}
          returnKeyType="default"
          textAlignVertical="center"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim() && !isBlocked && isConnected ? theme.primary : '#242830',
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isBlockedByMe || isSending || !isConnected}
          activeOpacity={0.8}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text
              style={[
                styles.sendButtonText,
                { color: inputText.trim() && !isBlockedByMe && isConnected ? '#000000' : theme.textMuted },
              ]}
            >
              Send
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 3-Dots Action Dropdown Modal */}
      <Modal
        visible={isMenuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setIsMenuVisible(false)}>
          <View
            style={[
              styles.dropdownMenu,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <TouchableOpacity style={styles.menuOption} onPress={handleClearChat}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🧹</Text>
              <Text style={[styles.menuOptionText, { color: theme.text }]}>Clear Chat</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.cardBorder }]} />

            <TouchableOpacity style={styles.menuOption} onPress={handleDeleteChat}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🗑</Text>
              <Text style={[styles.menuOptionText, { color: theme.text }]}>Delete Chat</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.cardBorder }]} />

            <TouchableOpacity style={styles.menuOption} onPress={handleBlockUser}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🚫</Text>
              <Text style={[styles.menuOptionText, { color: theme.danger }]}>
                Block Filmmaker
              </Text>
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
    marginLeft: 8,
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
  blockedBanner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  blockedBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 120,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
    paddingHorizontal: 12,
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
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 54,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 200,
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