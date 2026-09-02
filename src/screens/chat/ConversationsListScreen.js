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
} from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { findUserByUsername } from '../../services/userService';

export default function ConversationsListScreen({ navigation }) {
  const { currentUser } = useAuth();
  const { theme } = useTheme();

  const [threads, setThreads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);

  // Stream all conversations without requiring a Firestore composite index
  useEffect(() => {
    if (!currentUser) return;

    const threadsRef = collection(db, 'direct_threads');
    // Query only with array-contains (no server-side orderBy to avoid composite index requirement)
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

        // Sort locally in memory by timestamp descending
        loadedThreads.sort((a, b) => {
          const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
          const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
          return timeB - timeA;
        });

        setThreads(loadedThreads);
      },
      (error) => {
        console.error('Threads listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Open chat with searched user
  const handleStartChatWithUser = async () => {
    if (!searchUsername.trim()) return;
    setSearching(true);

    try {
      const foundUser = await findUserByUsername(searchUsername);
      if (!foundUser) {
        Alert.alert('Filmmaker Not Found', 'No user exists with that username.');
      } else if (foundUser.id === currentUser.uid) {
        Alert.alert('Notice', 'You cannot start a direct message thread with yourself.');
      } else {
        setModalVisible(false);
        setSearchUsername('');
        navigation.navigate('DirectMessage', {
          peerUser: {
            id: foundUser.id,
            fullName: foundUser.fullName || foundUser.username,
            username: foundUser.username,
          },
        });
      }
    } catch (error) {
      Alert.alert('Search Error', error.message);
    } finally {
      setSearching(false);
    }
  };

  // Filter threads based on top search bar
  const filteredThreads = threads.filter((thread) => {
    const peer = thread.participantsData?.[
      thread.participantIds.find((id) => id !== currentUser.uid)
    ];
    if (!peer) return false;
    const matchName = peer.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchUsername = peer.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchUsername;
  });

  const renderThreadItem = ({ item }) => {
    const peerId = item.participantIds.find((id) => id !== currentUser.uid);
    const peer = item.participantsData?.[peerId] || { fullName: 'Filmmaker', username: 'crew' };

    return (
      <TouchableOpacity
        style={[styles.threadCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() =>
          navigation.navigate('DirectMessage', {
            peerUser: { id: peerId, ...peer },
          })
        }
      >
        <View style={[styles.avatarCircle, { backgroundColor: theme.surface }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>
            {peer.fullName ? peer.fullName[0].toUpperCase() : 'U'}
          </Text>
        </View>

        <View style={styles.threadInfo}>
          <View style={styles.threadHeader}>
            <Text style={[styles.threadName, { color: theme.text }]} numberOfLines={1}>
              {peer.fullName}
            </Text>
            <Text style={[styles.threadTime, { color: theme.textSecondary }]}>
              {item.lastMessageTime || ''}
            </Text>
          </View>
          <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.lastMessageText || 'Tap to send a message...'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        renderItem={renderThreadItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No conversations yet. Tap the + button to text a filmmaker.
            </Text>
          </View>
        }
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Start Chat Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>NEW MESSAGE</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Enter the filmmaker's username:
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="e.g., chris_nolan"
              placeholderTextColor={theme.textSecondary}
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.surface }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handleStartChatWithUser}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Chat</Text>
                )}
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
  searchBox: {
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { fontSize: 14 },
  listContent: { paddingHorizontal: 12, paddingBottom: 80 },
  threadCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  threadInfo: { flex: 1 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  threadName: { fontSize: 14, fontWeight: '700', maxWidth: '70%' },
  threadTime: { fontSize: 11 },
  lastMessage: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', fontSize: 13, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabIcon: { color: '#ffffff', fontSize: 30, lineHeight: 32, fontWeight: '300' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 10, borderWidth: 1, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  modalSubtitle: { fontSize: 12, marginTop: 4, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 6, padding: 10, fontSize: 14, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
});