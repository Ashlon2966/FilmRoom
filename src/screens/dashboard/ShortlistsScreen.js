import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  streamShortlists,
  createShortlist,
  deleteShortlist,
  removeTalentFromShortlist,
} from '../../services/shortlistService';
import FilmmakerDetailModal from '../../components/FilmmakerDetailModal';

export default function ShortlistsScreen({ navigation }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();

  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShortlist, setSelectedShortlist] = useState(null);
  const [selectedFilmmaker, setSelectedFilmmaker] = useState(null);

  // New list modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = streamShortlists(currentUser.uid, (lists) => {
      setShortlists(lists);
      setLoading(false);
      // If a shortlist is currently viewed, update its reference
      if (selectedShortlist) {
        const updated = lists.find((l) => l.id === selectedShortlist.id);
        setSelectedShortlist(updated || null);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid, selectedShortlist?.id]);

  const handleCreateShortlist = async () => {
    if (!newListName.trim()) return;
    setIsCreating(true);
    try {
      await createShortlist(currentUser.uid, { name: newListName.trim() });
      setNewListName('');
      setIsCreateModalOpen(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteShortlist = (list) => {
    Alert.alert(
      'Delete Shortlist',
      `Are you sure you want to delete "${list.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteShortlist(currentUser.uid, list.id);
            if (selectedShortlist?.id === list.id) {
              setSelectedShortlist(null);
            }
          },
        },
      ]
    );
  };

  const handleRemoveTalent = async (talentUid) => {
    if (!selectedShortlist) return;
    try {
      await removeTalentFromShortlist(currentUser.uid, selectedShortlist.id, talentUid);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => {
              if (selectedShortlist) {
                setSelectedShortlist(null);
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={[styles.backBtnText, { color: theme.text }]}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme.primary }]}
            onPress={() => setIsCreateModalOpen(true)}
          >
            <Text style={styles.createBtnText}>+ New Shortlist</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.mainTitle, { color: theme.text }]}>
          {selectedShortlist ? selectedShortlist.name.toUpperCase() : 'MY PRIVATE SHORTLISTS'}
        </Text>
        <Text style={[styles.subTitle, { color: theme.textSecondary }]}>
          {selectedShortlist
            ? `${(selectedShortlist.talentList || []).length} curated creatives for this production`
            : 'Private talent collections organized for upcoming casting and production slates'}
        </Text>
      </View>

      {/* Content Feed */}
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : selectedShortlist ? (
        /* TALENT CARDS INSIDE SELECTED SHORTLIST */
        <FlatList
          data={selectedShortlist.talentList || []}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.talentCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={styles.talentInfoRow}
                onPress={() =>
                  setSelectedFilmmaker({
                    id: item.uid,
                    name: item.name,
                    username: item.username,
                    role: item.role,
                    photoURL: item.photoURL,
                    location: item.location,
                    unionStatus: item.unionStatus,
                  })
                }
                activeOpacity={0.85}
              >
                {item.photoURL ? (
                  <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                      {item.name ? item.name[0].toUpperCase() : 'F'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                    {item.unionStatus && item.unionStatus !== 'Non-Union' && (
                      <View style={styles.unionPill}>
                        <Text style={styles.unionText}>{item.unionStatus}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.roleText, { color: theme.primary }]}>{item.role}</Text>
                  {item.location ? (
                    <Text style={[styles.locText, { color: theme.textSecondary }]}>
                      📍 {item.location}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.talentCardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.cardBorder }]}
                  onPress={() =>
                    setSelectedFilmmaker({
                      id: item.uid,
                      name: item.name,
                      username: item.username,
                      role: item.role,
                      photoURL: item.photoURL,
                      location: item.location,
                      unionStatus: item.unionStatus,
                    })
                  }
                >
                  <Text style={{ color: theme.text, fontSize: 11, fontWeight: '700' }}>
                    View Dossier
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.removeBtn, { borderColor: theme.cardBorder }]}
                  onPress={() => handleRemoveTalent(item.uid)}
                >
                  <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '700' }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>★</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Shortlist is currently empty
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Browse the Talent Directory to discover actors and key creatives, then tap "★ Save" on their dossier to add them here.
              </Text>
            </View>
          }
        />
      ) : (
        /* SHORTLISTS OVERVIEW LIST */
        <FlatList
          data={shortlists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const count = (item.talentList || []).length;
            return (
              <TouchableOpacity
                style={[styles.shortlistCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => setSelectedShortlist(item)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.shortlistTitle, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.shortlistMeta, { color: theme.textSecondary }]}>
                    {count} {count === 1 ? 'Creatives Saved' : 'Creatives Saved'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.deleteListBtn}
                    onPress={() => handleDeleteShortlist(item)}
                  >
                    <Text style={{ color: theme.textMuted, fontSize: 14 }}>🗑</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.primary, fontSize: 16 }}>➔</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No shortlists created</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Create private shortlists to organize your casting choices and crew packages for upcoming projects.
              </Text>
            </View>
          }
        />
      )}

      {/* Create Shortlist Modal */}
      <Modal visible={isCreateModalOpen} transparent animationType="fade" onRequestClose={() => setIsCreateModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCreateModalOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>CREATE SHORTLIST</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Enter a name for your private talent collection
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Lead Actors - Feature Slate, DPs"
              placeholderTextColor={theme.textMuted}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setIsCreateModalOpen(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCreateBtn, { backgroundColor: theme.primary }]}
                onPress={handleCreateShortlist}
                disabled={isCreating || !newListName.trim()}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.modalCreateBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Detail Modal for inspecting talent from shortlist */}
      <FilmmakerDetailModal
        visible={!!selectedFilmmaker}
        filmmaker={selectedFilmmaker}
        onClose={() => setSelectedFilmmaker(null)}
        onSendPitch={() => {
          const peer = selectedFilmmaker;
          setSelectedFilmmaker(null);
          navigation.navigate('RequestsTab', {
            screen: 'DirectMessage',
            params: {
              peerUser: {
                id: peer.id,
                fullName: peer.name,
                username: peer.username,
                photoURL: peer.photoURL || null,
                role: peer.role,
              },
            },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  createBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 60,
  },
  shortlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  shortlistTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  shortlistMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  deleteListBtn: {
    padding: 6,
  },
  talentCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  talentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  unionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#18202c',
  },
  unionText: {
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '700',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  locText: {
    fontSize: 11,
    marginTop: 2,
  },
  talentCardActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#242830',
    paddingTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  modalInput: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalCreateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  modalCreateBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
});
