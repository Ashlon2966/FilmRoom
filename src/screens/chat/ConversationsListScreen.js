import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { findUserByUsername } from '../../services/userService';
import {
  streamAcceptedConnections,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
} from '../../services/connectionService';

export default function ConversationsListScreen({ navigation }) {
  const { currentUser } = useAuth();
  const { theme } = useTheme();

  const [activeSegment, setActiveSegment] = useState('CHATS'); // 'CHATS' | 'CONNECTIONS'
  const [threads, setThreads] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);

  // Search & New Message Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);

  // 1. Stream direct message threads
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingThreads(false);
      return;
    }

    const threadsRef = collection(db, 'direct_threads');
    const q = query(
      threadsRef,
      where('participantIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedThreads = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // Sort in memory by lastMessageAt descending
        loadedThreads.sort((a, b) => {
          const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
          const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
          return timeB - timeA;
        });

        setThreads(loadedThreads);
        setLoadingThreads(false);
      },
      (error) => {
        console.error('Threads listener error:', error);
        setLoadingThreads(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Stream accepted connections
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubConnections = streamAcceptedConnections(
      currentUser.uid,
      (list) => setConnections(list),
      (err) => console.warn('Connections stream error:', err.message)
    );

    return () => {
      unsubConnections();
    };
  }, [currentUser]);

  // Format message timestamps
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Open chat with accepted connection
  const handleOpenNewChat = () => {
    if (connections.length === 0) {
      Alert.alert(
        'Professional Connection Required',
        'FilmRoom requires an accepted contact request before direct messaging is enabled. Browse the Explore directory to discover filmmakers and establish a connection.'
      );
      return;
    }
    setModalVisible(true);
  };

  const handleSelectConnectionToChat = (conn) => {
    const peerId = (conn.users || []).find((id) => id !== currentUser.uid);
    const peer = conn.userData?.[peerId] || conn.participants?.[peerId] || {};
    setModalVisible(false);
    navigation.navigate('DirectMessage', {
      peerUser: {
        id: peerId,
        fullName: peer.fullName || peer.name || 'Filmmaker',
        username: peer.username || 'crew',
        photoURL: peer.photoURL || null,
        role: peer.role || peer.roles?.[0] || 'Filmmaker',
      },
    });
  };

  // Connection actions
  const handleAcceptRequest = async (item) => {
    try {
      await acceptConnectionRequest(item.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeclineRequest = async (item) => {
    try {
      await rejectConnectionRequest(item.id);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleRemoveConnection = (connectionId, peerName) => {
    Alert.alert(
      'Remove Connection',
      `Remove connection with ${peerName}? Your message history will remain intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeConnection(connectionId);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Filtered threads list
  const filteredThreads = threads.filter((thread) => {
    const peerId = (thread.participantIds || []).find((id) => id !== currentUser.uid);
    const peer = thread.participants?.[peerId];
    if (!peer) return false;
    const matchName = (peer.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchUsername = (peer.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchUsername;
  });

  // Filtered connections list
  const filteredConnections = connections.filter((conn) => {
    const peerId = (conn.users || []).find((id) => id !== currentUser.uid);
    const peer = conn.userData?.[peerId];
    if (!peer) return false;
    const matchName = (peer.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchUsername = (peer.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchUsername;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            COMMUNICATIONS
          </Text>
          <TouchableOpacity
            style={[styles.newMsgBtn, { backgroundColor: theme.primary }]}
            onPress={handleOpenNewChat}
            activeOpacity={0.8}
          >
            <Text style={styles.newMsgBtnText}>+ New Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Control: Messages vs Connections */}
        <View style={styles.segmentBar}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'CHATS' && {
                borderBottomColor: theme.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveSegment('CHATS')}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeSegment === 'CHATS' ? theme.primary : theme.textMuted },
              ]}
            >
              Messages ({threads.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'CONNECTIONS' && {
                borderBottomColor: theme.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveSegment('CONNECTIONS')}
          >
            <View style={styles.connectionTabRow}>
              <Text
                style={[
                  styles.segmentText,
                  { color: activeSegment === 'CONNECTIONS' ? theme.primary : theme.textMuted },
                ]}
              >
                Connections ({connections.length})
              </Text>
              {pendingRequests.length > 0 && (
                <View style={[styles.pendingBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.pendingBadgeText}>{pendingRequests.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={
              activeSegment === 'CHATS'
                ? 'Search conversations...'
                : 'Search connections...'
            }
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Segment 1: Messages */}
      {activeSegment === 'CHATS' && (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const peerId = (item.participantIds || []).find((id) => id !== currentUser.uid);
            const peer = item.participants?.[peerId] || {
              name: 'Filmmaker',
              username: 'crew',
              role: 'Crew',
              photoURL: null,
            };

            return (
              <TouchableOpacity
                style={[
                  styles.threadCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
                onPress={() =>
                  navigation.navigate('DirectMessage', {
                    peerUser: { id: peerId, ...peer },
                  })
                }
                activeOpacity={0.7}
              >
                {peer.photoURL ? (
                  <Image source={{ uri: peer.photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarCircle, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {peer.name ? peer.name[0].toUpperCase() : 'F'}
                    </Text>
                  </View>
                )}

                <View style={styles.threadInfo}>
                  <View style={styles.threadHeader}>
                    <Text style={[styles.threadName, { color: theme.text }]} numberOfLines={1}>
                      {peer.name}
                    </Text>
                    <Text style={[styles.threadTime, { color: theme.textSecondary }]}>
                      {formatTimestamp(item.lastMessageAt)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.lastMessage, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.lastMessageText || 'Tap to send a message...'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loadingThreads ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 60 }} />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, { color: theme.textMuted }]}>💬</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  Connect with filmmakers or tap "+ New Chat" to start collaborating.
                </Text>
              </View>
            )
          }
        />
      )}

      {/* Segment 2: Connections */}
      {activeSegment === 'CONNECTIONS' && (
        <FlatList
          data={filteredConnections}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            pendingRequests.length > 0 ? (
              <View style={styles.pendingSection}>
                <Text style={[styles.sectionHeading, { color: theme.primary }]}>
                  PENDING INCOMING REQUESTS ({pendingRequests.length})
                </Text>
                {pendingRequests.map((req) => {
                  const initiator = req.userData?.[req.initiatorId] || {
                    fullName: 'Filmmaker',
                    username: 'crew',
                    role: 'Crew',
                    photoURL: null,
                  };

                  return (
                    <View
                      key={req.id}
                      style={[
                        styles.pendingCard,
                        { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                    >
                      <View style={styles.pendingInfoRow}>
                        {initiator.photoURL ? (
                          <Image source={{ uri: initiator.photoURL }} style={styles.avatarImage} />
                        ) : (
                          <View style={[styles.avatarCircle, { backgroundColor: theme.surface }]}>
                            <Text style={[styles.avatarText, { color: theme.primary }]}>
                              {initiator.fullName ? initiator.fullName[0].toUpperCase() : 'F'}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.threadName, { color: theme.text }]}>
                            {initiator.fullName}
                          </Text>
                          <Text style={[styles.subRole, { color: theme.textSecondary }]}>
                            @{initiator.username} • {initiator.role}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.pendingActionsRow}>
                        <TouchableOpacity
                          style={[styles.declineBtn, { borderColor: theme.cardBorder }]}
                          onPress={() => handleDeclineRequest(req)}
                        >
                          <Text style={[styles.declineBtnText, { color: theme.textSecondary }]}>
                            Decline
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                          onPress={() => handleAcceptRequest(req)}
                        >
                          <Text style={styles.acceptBtnText}>Accept Connection</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 16 }]}>
                  MY CONNECTIONS ({connections.length})
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const peerId = (item.users || []).find((id) => id !== currentUser.uid);
            const peer = item.userData?.[peerId] || {
              fullName: 'Filmmaker',
              username: 'crew',
              role: 'Crew',
              photoURL: null,
            };

            return (
              <View
                style={[
                  styles.connectionCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                {peer.photoURL ? (
                  <Image source={{ uri: peer.photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarCircle, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {peer.fullName ? peer.fullName[0].toUpperCase() : 'F'}
                    </Text>
                  </View>
                )}

                <View style={styles.threadInfo}>
                  <Text style={[styles.threadName, { color: theme.text }]} numberOfLines={1}>
                    {peer.fullName}
                  </Text>
                  <Text style={[styles.subRole, { color: theme.textSecondary }]}>
                    @{peer.username} • {peer.role}
                  </Text>
                </View>

                <View style={styles.connectionActions}>
                  <TouchableOpacity
                    style={[styles.msgSmallBtn, { backgroundColor: theme.primary }]}
                    onPress={() =>
                      navigation.navigate('DirectMessage', {
                        peerUser: {
                          id: peerId,
                          fullName: peer.fullName,
                          username: peer.username,
                          photoURL: peer.photoURL,
                          role: peer.role,
                        },
                      })
                    }
                  >
                    <Text style={styles.msgSmallBtnText}>Message</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.removeIconBtn, { borderColor: theme.cardBorder }]}
                    onPress={() => handleRemoveConnection(item.id, peer.fullName)}
                  >
                    <Text style={{ color: theme.textMuted, fontSize: 13 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            pendingRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, { color: theme.textMuted }]}>🤝</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No connections yet</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  Browse the Talent Directory to discover and connect with filmmakers.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Start Chat Modal - Select From Accepted Connections */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder, maxHeight: '80%' },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>NEW DIRECT MESSAGE</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Select from your verified professional connections:
            </Text>

            <FlatList
              data={connections}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 300, marginVertical: 10 }}
              renderItem={({ item }) => {
                const peerId = (item.users || []).find((id) => id !== currentUser.uid);
                const peer = item.userData?.[peerId] || item.participants?.[peerId] || {};
                return (
                  <TouchableOpacity
                    style={[styles.connectionPickerItem, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                    onPress={() => handleSelectConnectionToChat(item)}
                    activeOpacity={0.8}
                  >
                    {peer.photoURL ? (
                      <Image source={{ uri: peer.photoURL }} style={styles.connAvatar} />
                    ) : (
                      <View style={[styles.connAvatarPlaceholder, { backgroundColor: theme.card }]}>
                        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                          {peer.fullName ? peer.fullName[0].toUpperCase() : 'F'}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                        {peer.fullName || peer.name || 'Filmmaker'}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                        @{peer.username || 'crew'} • {peer.role || 'Connected'}
                      </Text>
                    </View>
                    <Text style={{ color: theme.primary, fontSize: 16 }}>💬</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                  No accepted connections found.
                </Text>
              }
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.surface, width: '100%', alignItems: 'center' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 44,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  newMsgBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newMsgBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  segmentBar: {
    flexDirection: 'row',
    marginTop: 12,
    borderBottomWidth: 1,
    borderColor: '#242830',
  },
  segmentItem: {
    paddingVertical: 10,
    marginRight: 18,
  },
  connectionTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  pendingBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  searchBox: {
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  searchInput: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  threadCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
  },
  threadInfo: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  threadName: {
    fontSize: 14,
    fontWeight: '800',
    maxWidth: '70%',
  },
  threadTime: {
    fontSize: 11,
  },
  lastMessage: {
    fontSize: 12,
  },
  subRole: {
    fontSize: 11,
    marginTop: 2,
  },
  pendingSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  pendingCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  pendingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  connectionCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  connectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  msgSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  msgSmallBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  removeIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  modalSubmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  connectionPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  connAvatar: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  connAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});