import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  streamShortlists,
  createShortlist,
  addTalentToShortlist,
  removeTalentFromShortlist,
} from '../services/shortlistService';

export default function SaveToShortlistModal({ visible, talent, onClose }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();

  const [shortlists, setShortlists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    if (!visible || !currentUser?.uid) return;

    const unsubscribe = streamShortlists(currentUser.uid, (lists) => {
      setShortlists(lists);
      setLoadingLists(false);
    });

    return () => unsubscribe();
  }, [visible, currentUser?.uid]);

  if (!talent) return null;

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setIsCreating(true);
    try {
      const created = await createShortlist(currentUser.uid, { name: newListName.trim() });
      // Automatically add this talent to the newly created shortlist
      await addTalentToShortlist(currentUser.uid, created.id, talent);
      setNewListName('');
      Alert.alert('Shortlist Created', `"${created.name}" created with ${talent.name} added.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleTalent = async (list) => {
    const isAlreadyInList = (list.talentList || []).some((t) => t.uid === talent.id);
    try {
      if (isAlreadyInList) {
        await removeTalentFromShortlist(currentUser.uid, list.id, talent.id);
      } else {
        await addTalentToShortlist(currentUser.uid, list.id, talent);
      }
    } catch (err) {
      Alert.alert('Update Failed', err.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>PRIVATE SHORTLIST</Text>
              <Text style={[styles.subTitle, { color: theme.textSecondary }]}>
                Save {talent.name} ({talent.role || 'Talent'}) for upcoming productions
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeX, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Create Shortlist Input */}
          <View style={styles.createRow}>
            <TextInput
              style={[
                styles.createInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="New shortlist name (e.g. Lead Actors, DPs)..."
              placeholderTextColor={theme.textMuted}
              value={newListName}
              onChangeText={setNewListName}
            />
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateList}
              disabled={isCreating || !newListName.trim()}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.createBtnText}>+ Create</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Shortlists Feed */}
          {loadingLists ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {shortlists.length > 0 ? (
                shortlists.map((list) => {
                  const isInList = (list.talentList || []).some((t) => t.uid === talent.id);
                  return (
                    <TouchableOpacity
                      key={list.id}
                      style={[
                        styles.listItem,
                        {
                          backgroundColor: isInList ? '#141a24' : theme.surface,
                          borderColor: isInList ? theme.primary : theme.cardBorder,
                        },
                      ]}
                      onPress={() => handleToggleTalent(list)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listName, { color: isInList ? theme.primary : theme.text }]}>
                          {list.name}
                        </Text>
                        <Text style={[styles.listMeta, { color: theme.textMuted }]}>
                          {(list.talentList || []).length} Saved Talent
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.checkBadge,
                          {
                            backgroundColor: isInList ? theme.primary : 'transparent',
                            borderColor: isInList ? theme.primary : theme.cardBorder,
                          },
                        ]}
                      >
                        <Text style={{ color: isInList ? '#000000' : theme.textMuted, fontSize: 11, fontWeight: '900' }}>
                          {isInList ? '✔ Saved' : '+ Add'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
                    No private shortlists yet. Type a name above to create your first talent list.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
            onPress={onClose}
          >
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeX: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  createInput: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  createBtn: {
    paddingHorizontal: 14,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  listName: {
    fontSize: 14,
    fontWeight: '800',
  },
  listMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  checkBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  doneBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
});
