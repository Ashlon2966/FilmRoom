import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import RoleBadge from '../../components/RoleBadge';
import CustomButton from '../../components/CustomButton';

const ALL_ROLES = [
  'Director',
  'Scriptwriter',
  'Producer',
  'Cinematographer',
  'Camera Operator',
  'Actor',
  'Sound Designer',
  'Boom Operator',
  'Gaffer (Lighting)',
  'Grip (Rigging)',
  'Production Designer',
  'Editor',
  'Production Assistant (PA / Helper)',
  'Runner / General Crew',
];

export default function ProfileDashboardScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { switchRoom } = useRoom();
  const { theme } = useTheme();

  const [invitations, setInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRoles, setEditRoles] = useState([]);
  const [editAvatarBase64, setEditAvatarBase64] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Stream incoming room invitations in real time
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'invitations'),
      where('recipientId', '==', currentUser.uid),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedInvites = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setInvitations(loadedInvites);
        setLoadingInvites(false);
      },
      (error) => {
        console.error('Invitations listener error:', error);
        setLoadingInvites(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Open Edit Modal with current values
  const handleOpenEdit = () => {
    setEditName(userProfile?.fullName || '');
    setEditBio(userProfile?.bio || '');
    setEditRoles(userProfile?.roles || []);
    setEditAvatarBase64(userProfile?.photoURL || null);
    setIsEditModalOpen(true);
  };

  const handlePickEditAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to change photo.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      const asset = res.assets[0];
      if (asset.base64) {
        setEditAvatarBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  };

  const toggleEditRole = (role) => {
    if (editRoles.includes(role)) {
      setEditRoles(editRoles.filter((r) => r !== role));
    } else {
      setEditRoles([...editRoles, role]);
    }
  };

  const handleSaveEditProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Display name cannot be empty.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        fullName: editName.trim(),
        displayName: editName.trim(),
        bio: editBio.trim(),
        roles: editRoles,
        photoURL: editAvatarBase64,
      });

      setIsEditModalOpen(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAcceptInvite = async (invite) => {
    try {
      const roomRef = doc(db, 'rooms', invite.roomId);
      await updateDoc(roomRef, {
        memberUids: arrayUnion(currentUser.uid),
        [`members.${currentUser.uid}`]: {
          displayName: userProfile?.fullName || currentUser.email,
          email: currentUser.email,
          roles: invite.assignedRoles || ['Crew'],
          joinedAt: new Date().toISOString(),
        },
      });

      await deleteDoc(doc(db, 'invitations', invite.id));

      Alert.alert('Joined Room', `You have joined "${invite.roomTitle}"!`, [
        {
          text: 'Enter Room',
          onPress: () => {
            switchRoom(invite.roomId);
            navigation.navigate('FilmsTab', { screen: 'StagePipeline' });
          },
        },
        { text: 'Later', style: 'cancel' },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      await deleteDoc(doc(db, 'invitations', inviteId));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme?.background || '#121212' }]} contentContainerStyle={styles.content}>
      {/* Top Header Bar with Settings Gear */}
      <View style={styles.topBar}>
        <Text style={[styles.pageTitle, { color: theme?.text || '#FFF' }]}>FILMMAKER PROFILE</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={[styles.settingsIconBtn, { backgroundColor: theme?.card || '#1c1c1e' }]}
        >
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: theme?.card || '#1c1c1e', borderColor: theme?.border || '#2c2c2e' }]}>
        <View style={styles.headerRow}>
          {userProfile?.photoURL ? (
            <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme?.surface || '#2c2c2e' }]}>
              <Text style={[styles.avatarInitial, { color: theme?.primary || '#e50914' }]}>
                {userProfile?.fullName ? userProfile.fullName[0].toUpperCase() : 'F'}
              </Text>
            </View>
          )}

          <View style={styles.infoCol}>
            <Text style={[styles.fullName, { color: theme?.text || '#FFF' }]}>
              {userProfile?.fullName || 'Filmmaker'}
            </Text>
            <Text style={[styles.username, { color: theme?.textSecondary || '#888' }]}>
              @{userProfile?.username || 'crew'}
            </Text>
            <Text style={[styles.email, { color: theme?.textSecondary || '#888' }]}>
              {currentUser?.email}
            </Text>
          </View>
        </View>

        {userProfile?.bio ? (
          <Text style={[styles.bio, { color: theme?.textSecondary || '#AAA' }]}>
            {userProfile.bio}
          </Text>
        ) : null}

        {/* Roles Badges */}
        <Text style={[styles.sectionHeading, { color: theme?.textSecondary || '#888' }]}>SKILLS & DEPARTMENTS</Text>
        <View style={styles.rolesRow}>
          {userProfile?.roles && userProfile.roles.length > 0 ? (
            userProfile.roles.map((r) => <RoleBadge key={r} role={r} />)
          ) : (
            <Text style={{ color: theme?.textSecondary || '#888', fontSize: 12 }}>No default roles assigned.</Text>
          )}
        </View>

        {/* Edit Profile Trigger Button */}
        <TouchableOpacity
          style={[styles.editButton, { borderColor: theme?.border || '#333' }]}
          onPress={handleOpenEdit}
        >
          <Text style={[styles.editButtonText, { color: theme?.text || '#FFF' }]}>✎ Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Incoming Room Invitations */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme?.text || '#FFF' }]}>INCOMING FILM INVITATIONS</Text>
        <Text style={[styles.badgeCount, { backgroundColor: theme?.primary || '#e50914' }]}>
          {invitations.length}
        </Text>
      </View>

      {loadingInvites ? (
        <ActivityIndicator color={theme?.primary || '#e50914'} style={{ marginVertical: 20 }} />
      ) : invitations.length > 0 ? (
        invitations.map((inv) => (
          <View
            key={inv.id}
            style={[styles.inviteCard, { backgroundColor: theme?.card || '#1c1c1e', borderColor: theme?.border || '#2c2c2e' }]}
          >
            <View style={styles.inviteInfo}>
              <Text style={[styles.roomName, { color: theme?.text || '#FFF' }]}>{inv.roomTitle}</Text>
              <Text style={[styles.inviter, { color: theme?.textSecondary || '#888' }]}>
                Invited by {inv.senderName}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                {inv.assignedRoles?.map((r) => (
                  <RoleBadge key={r} role={r} size="small" />
                ))}
              </View>
            </View>

            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme?.primary || '#e50914' }]}
                onPress={() => handleAcceptInvite(inv)}
              >
                <Text style={styles.btnText}>Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme?.surface || '#2c2c2e' }]}
                onPress={() => handleRejectInvite(inv.id)}
              >
                <Text style={[styles.btnText, { color: theme?.textSecondary || '#888' }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <View style={[styles.emptyBox, { borderColor: theme?.border || '#2c2c2e' }]}>
          <Text style={[styles.emptyText, { color: theme?.textSecondary || '#888' }]}>
            No pending room invitations.
          </Text>
        </View>
      )}

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme?.card || '#1c1c1e', borderColor: theme?.border || '#333' }]}>
            <Text style={[styles.modalTitle, { color: theme?.text || '#FFF' }]}>EDIT PROFILE</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.editAvatarWrapper} onPress={handlePickEditAvatar}>
                {editAvatarBase64 ? (
                  <Image source={{ uri: editAvatarBase64 }} style={styles.editAvatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={{ color: '#AAA' }}>+ Photo</Text>
                  </View>
                )}
                <Text style={styles.changePhotoText}>Change Avatar</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Display Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme?.surface || '#2c2c2e', color: theme?.text || '#FFF' }]}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme?.surface || '#2c2c2e', color: theme?.text || '#FFF', height: 70 }]}
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />

              <Text style={styles.fieldLabel}>Select Roles</Text>
              <View style={styles.rolesGrid}>
                {ALL_ROLES.map((role) => {
                  const sel = editRoles.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleChip, sel && { backgroundColor: theme?.primary || '#e50914' }]}
                      onPress={() => toggleEditRole(role)}
                    >
                      <Text style={[styles.roleChipText, sel && { color: '#FFF' }]}>{role}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: theme?.surface || '#2c2c2e' }]}
                  onPress={() => setIsEditModalOpen(false)}
                >
                  <Text style={{ color: theme?.text || '#FFF' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme?.primary || '#e50914' }]}
                  onPress={handleSaveEditProfile}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 40, paddingBottom: 60 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  settingsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: 'bold' },
  infoCol: { flex: 1 },
  fullName: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  username: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  email: { fontSize: 11, marginTop: 2 },
  bio: { fontSize: 13, marginTop: 12, lineHeight: 18 },
  sectionHeading: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  editButton: {
    marginTop: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  editButtonText: { fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  badgeCount: { color: '#FFF', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  inviteCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteInfo: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: 'bold' },
  inviter: { fontSize: 12, marginVertical: 2 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyBox: { padding: 20, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center' },
  emptyText: { fontSize: 12, fontStyle: 'italic' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    maxHeight: '85%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
  editAvatarWrapper: { alignItems: 'center', marginBottom: 14 },
  editAvatarImage: { width: 70, height: 70, borderRadius: 35 },
  changePhotoText: { color: '#e50914', fontSize: 12, fontWeight: 'bold', marginTop: 6 },
  fieldLabel: { color: '#AAA', fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  modalInput: { borderRadius: 8, padding: 10, fontSize: 14 },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  roleChip: {
    backgroundColor: '#262626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  roleChipText: { color: '#888', fontSize: 11, fontWeight: '600' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20, marginBottom: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6 },
});