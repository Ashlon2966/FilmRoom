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
  Image,
} from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import FilmmakerDetailModal from './FilmmakerDetailModal';
import { sendNotification, NOTIFICATION_TYPES } from '../services/notificationService';

export const ROOM_ACCESS_LEVELS = [
  { key: 'Owner', label: 'Owner', desc: 'Full administration & delete access' },
  { key: 'Manager', label: 'Manager', desc: 'Can manage crew, schedules & stages' },
  { key: 'Crew', label: 'Crew', desc: 'Can edit stage assets, logs & call sheets' },
  { key: 'Cast', label: 'Cast', desc: 'Can view sides, call sheets & scripts' },
  { key: 'Viewer', label: 'Viewer', desc: 'Read-only access to production materials' },
];

export const PRODUCTION_ROLES = [
  'Director',
  'Producer',
  'Cinematographer',
  '1st Assistant Camera',
  'Gaffer',
  'Key Grip',
  'Sound Recordist / Mixer',
  'Actor / Cast',
  'Editor',
  'Colorist',
  'Production Designer',
  'Costume Designer',
  'Line Producer / UPM',
  'Script Supervisor',
  'Other Crew',
];

export default function RoomPeopleModal({ visible, roomId, roomData, onClose }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();

  // Determine current user's access level in this room
  const currentUserAccess =
    roomData?.members?.[currentUser?.uid]?.roomAccess ||
    (roomData?.creatorId === currentUser?.uid ? 'Owner' : 'Crew');

  const canManagePeople =
    roomData?.creatorId === currentUser?.uid ||
    currentUserAccess === 'Owner' ||
    currentUserAccess === 'Manager';

  // Active production members
  const members = roomData?.members || {};
  const memberList = Object.entries(members).map(([uid, m]) => ({
    uid,
    name: m.name || m.fullName || m.displayName || 'Crew Member',
    username: m.username || 'filmmaker',
    globalRole: m.globalRole || m.role || 'Filmmaker',
    productionRole: m.productionRole || m.roles?.[0] || 'Crew',
    roomAccess: m.roomAccess || 'Crew',
    photoURL: m.photoURL || null,
    addedAt: m.addedAt || null,
  }));

  // Add Person Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProductionRole, setSelectedProductionRole] = useState('Cinematographer');
  const [selectedRoomAccess, setSelectedRoomAccess] = useState('Crew');
  const [customRoleText, setCustomRoleText] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Edit Member Modal state
  const [editingMember, setEditingMember] = useState(null);
  const [editProductionRole, setEditProductionRole] = useState('');
  const [editRoomAccess, setEditRoomAccess] = useState('Crew');

  // Filmmaker Profile Modal state
  const [viewingFilmmaker, setViewingFilmmaker] = useState(null);

  // Search users in FilmRoom directory
  const handleSearchUsers = async (text) => {
    setSearchQuery(text);
    if (!text.trim() || text.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('fullName', '>=', text),
        where('fullName', '<=', text + '\uf8ff')
      );
      const snap = await getDocs(q);
      const results = [];
      snap.forEach((docSnap) => {
        const u = docSnap.data();
        if (docSnap.id !== currentUser?.uid) {
          results.push({
            id: docSnap.id,
            uid: docSnap.id,
            name: u.fullName || u.displayName || 'Filmmaker',
            username: u.username || 'filmmaker',
            role: u.role || u.roles?.[0] || 'Filmmaker',
            photoURL: u.photoURL || null,
            bio: u.bio || '',
            category: u.category || 'TALENT',
            showreelUrl: u.showreelUrl || null,
          });
        }
      });
      setSearchResults(results);
    } catch (_) {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  };

  // Add selected user to Room
  const handleAddPersonToRoom = async () => {
    if (!selectedUser || !roomId) return;
    const finalRole =
      selectedProductionRole === 'Other Crew' && customRoleText.trim()
        ? customRoleText.trim()
        : selectedProductionRole;

    setIsSavingMember(true);
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        [`members.${selectedUser.id}`]: {
          name: selectedUser.name,
          username: selectedUser.username,
          globalRole: selectedUser.role,
          productionRole: finalRole,
          roomAccess: selectedRoomAccess,
          photoURL: selectedUser.photoURL,
          addedAt: new Date().toISOString(),
        },
        memberUids: arrayUnion(selectedUser.id),
      });

      // Dispatch in-app notification
      sendNotification({
        recipientUid: selectedUser.id,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || 'Room Creator',
        type: NOTIFICATION_TYPES.ROOM_INVITATION,
        title: 'Added to Production Room',
        message: `You were added to "${roomData?.title || 'Production Room'}" as ${finalRole} (${selectedRoomAccess}).`,
        targetId: roomId,
        targetType: 'ROOM',
      });

      Alert.alert('✓ Person Added', `${selectedUser.name} has been added as ${finalRole} (${selectedRoomAccess}).`);
      setIsAddModalOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      setCustomRoleText('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add person to room.');
    } finally {
      setIsSavingMember(false);
    }
  };

  // Remove person from Room
  const handleRemovePerson = (member) => {
    Alert.alert(
      'Remove from Production',
      `Remove ${member.name} (${member.productionRole}) from this Production Room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const roomRef = doc(db, 'rooms', roomId);
              await updateDoc(roomRef, {
                [`members.${member.uid}`]: deleteField(),
                memberUids: arrayRemove(member.uid),
              });
              Alert.alert('✓ Removed', `${member.name} has been removed from this room.`);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Save changes to existing member's role or access
  const handleSaveMemberEdit = async () => {
    if (!editingMember || !roomId) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        [`members.${editingMember.uid}.productionRole`]: editProductionRole,
        [`members.${editingMember.uid}.roomAccess`]: editRoomAccess,
      });
      Alert.alert('✓ Member Updated', `${editingMember.name}'s production role is now ${editProductionRole}.`);
      setEditingMember(null);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>PRODUCTION ROOM PEOPLE</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {roomData?.title || 'Production'} • {memberList.length} Team Members
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Add Person Action */}
          {canManagePeople ? (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                setSelectedUser(null);
                setSearchQuery('');
                setSearchResults([]);
                setIsAddModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>+ Add Person to Production</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.readOnlyBanner, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <Text style={[styles.readOnlyText, { color: theme.textSecondary }]}>
                🔒 Read-only roster view. Only Room Owners & Managers can add or modify production personnel.
              </Text>
            </View>
          )}

          {/* Member Roster List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30, marginTop: 14 }}>
            {memberList.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: theme.cardBorder }]}>
                <Text style={{ fontSize: 32 }}>👥</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Crew Added Yet</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  Assemble your heads of department, cast, and collaborators above.
                </Text>
              </View>
            ) : (
              memberList.map((m) => (
                <View
                  key={m.uid}
                  style={[styles.memberCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.memberInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {m.photoURL ? (
                        <Image source={{ uri: m.photoURL }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: theme.surface }]}>
                          <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{m.name[0]?.toUpperCase()}</Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                        <Text style={[styles.roleLine, { color: theme.primary }]}>
                          {m.productionRole}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                          FilmRoom Role: {m.globalRole} • Access: {m.roomAccess}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions: View Profile, Edit, Remove */}
                  <View style={styles.memberActionRow}>
                    <TouchableOpacity
                      style={[styles.smallBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => setViewingFilmmaker({ id: m.uid, name: m.name, role: m.globalRole, photoURL: m.photoURL })}
                    >
                      <Text style={[styles.smallBtnText, { color: theme.textSecondary }]}>Profile</Text>
                    </TouchableOpacity>

                    {canManagePeople && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { borderColor: theme.cardBorder }]}
                        onPress={() => {
                          setEditingMember(m);
                          setEditProductionRole(m.productionRole);
                          setEditRoomAccess(m.roomAccess);
                        }}
                      >
                        <Text style={[styles.smallBtnText, { color: theme.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    )}

                    {canManagePeople && m.uid !== roomData?.creatorId && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { borderColor: '#b91c1c' }]}
                        onPress={() => handleRemovePerson(m)}
                      >
                        <Text style={[styles.smallBtnText, { color: '#f87171' }]}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* ── SUB-MODAL: ADD PERSON ── */}
          <Modal visible={isAddModalOpen} animationType="slide" transparent onRequestClose={() => setIsAddModalOpen(false)}>
            <View style={styles.subOverlay}>
              <View style={[styles.subCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <View style={styles.topRow}>
                  <Text style={[styles.title, { color: theme.text }]}>ADD PERSON TO PRODUCTION</Text>
                  <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                    <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  {/* Step 1: Search Directory */}
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SEARCH FILMNIGHT USERS *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="Type name (e.g. Alex, Maya)..."
                    placeholderTextColor={theme.textMuted}
                    value={searchQuery}
                    onChangeText={handleSearchUsers}
                  />

                  {/* Search Results */}
                  {isSearching && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 8 }} />}
                  {searchResults.length > 0 && !selectedUser && (
                    <View style={[styles.resultsList, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                      {searchResults.map((u) => (
                        <TouchableOpacity
                          key={u.id}
                          style={[styles.resultItem, { borderBottomColor: theme.cardBorder }]}
                          onPress={() => {
                            setSelectedUser(u);
                            setSearchResults([]);
                          }}
                        >
                          <Text style={[styles.resultName, { color: theme.text }]}>{u.name}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 11 }}>{u.role}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Selected Person Badge */}
                  {selectedUser && (
                    <View style={[styles.selectedUserCard, { backgroundColor: '#141a24', borderColor: '#2b3952' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: 14 }}>{selectedUser.name}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 11 }}>Global Role: {selectedUser.role}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedUser(null)}>
                        <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 2: Production Role (Decoupled from Global Role) */}
                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                    PRODUCTION ROLE IN THIS FILM *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {PRODUCTION_ROLES.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selectedProductionRole === role ? theme.primary : theme.background,
                              borderColor: theme.cardBorder,
                            },
                          ]}
                          onPress={() => setSelectedProductionRole(role)}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: selectedProductionRole === role ? '#000000' : theme.textSecondary,
                            }}
                          >
                            {role}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {selectedProductionRole === 'Other Crew' && (
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder, marginTop: 6 }]}
                      placeholder="Specify exact craft / title..."
                      placeholderTextColor={theme.textMuted}
                      value={customRoleText}
                      onChangeText={setCustomRoleText}
                    />
                  )}

                  {/* Step 3: Room Access Level */}
                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                    ROOM ACCESS PERMISSION *
                  </Text>
                  <View style={[styles.accessBox, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                    {ROOM_ACCESS_LEVELS.map((lvl) => (
                      <TouchableOpacity
                        key={lvl.key}
                        style={styles.accessRow}
                        onPress={() => setSelectedRoomAccess(lvl.key)}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            { borderColor: selectedRoomAccess === lvl.key ? theme.primary : theme.textMuted },
                          ]}
                        >
                          {selectedRoomAccess === lvl.key && (
                            <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.accessLabel, { color: theme.text }]}>{lvl.label}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 11 }}>{lvl.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.addSubmitBtn, { backgroundColor: theme.primary, opacity: selectedUser ? 1 : 0.6 }]}
                    onPress={handleAddPersonToRoom}
                    disabled={!selectedUser || isSavingMember}
                  >
                    {isSavingMember ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text style={styles.addSubmitBtnText}>Add Person to Production</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* ── SUB-MODAL: EDIT MEMBER ── */}
          {editingMember && (
            <Modal visible={!!editingMember} animationType="slide" transparent onRequestClose={() => setEditingMember(null)}>
              <View style={styles.subOverlay}>
                <View style={[styles.subCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  <View style={styles.topRow}>
                    <Text style={[styles.title, { color: theme.text }]}>EDIT {editingMember.name.toUpperCase()}</Text>
                    <TouchableOpacity onPress={() => setEditingMember(null)}>
                      <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PRODUCTION ROLE</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    value={editProductionRole}
                    onChangeText={setEditProductionRole}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>ROOM ACCESS</Text>
                  <View style={[styles.accessBox, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                    {ROOM_ACCESS_LEVELS.map((lvl) => (
                      <TouchableOpacity
                        key={lvl.key}
                        style={styles.accessRow}
                        onPress={() => setEditRoomAccess(lvl.key)}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            { borderColor: editRoomAccess === lvl.key ? theme.primary : theme.textMuted },
                          ]}
                        >
                          {editRoomAccess === lvl.key && (
                            <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />
                          )}
                        </View>
                        <Text style={[styles.accessLabel, { color: theme.text }]}>{lvl.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.addSubmitBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
                    onPress={handleSaveMemberEdit}
                  >
                    <Text style={styles.addSubmitBtnText}>Save Role Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          {/* View Member Profile Modal */}
          {viewingFilmmaker && (
            <FilmmakerDetailModal
              visible={!!viewingFilmmaker}
              filmmaker={viewingFilmmaker}
              onClose={() => setViewingFilmmaker(null)}
              onSendPitch={() => setViewingFilmmaker(null)}
            />
          )}
        </View>
      </View>
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
    height: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  addBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  addBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  emptyBox: {
    padding: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  memberCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  memberInfoCol: {
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
  },
  roleLine: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  memberActionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#242830',
    paddingTop: 10,
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  subCard: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  resultsList: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    maxHeight: 180,
  },
  resultItem: {
    padding: 10,
    borderBottomWidth: 1,
  },
  resultName: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  accessBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  accessLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addSubmitBtn: {
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addSubmitBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  readOnlyBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 4,
  },
  readOnlyText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
