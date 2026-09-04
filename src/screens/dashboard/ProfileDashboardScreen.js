import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileDashboardScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('Showreel');
  const [isAvailable, setIsAvailable] = useState(userProfile?.isAvailable ?? true);

  // In-Place Edit Modal
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile?.fullName || '');
  const [editBio, setEditBio] = useState(userProfile?.bio || '');
  const [editDayRate, setEditDayRate] = useState(userProfile?.dayRate || '');
  const [editLocation, setEditLocation] = useState(userProfile?.location || '');
  const [editExperience, setEditExperience] = useState(userProfile?.experience || '');
  const [isSaving, setIsSaving] = useState(false);

  // Equipment Kit Management
  const [newKitText, setNewKitText] = useState('');
  const equipmentList = userProfile?.equipment || [];

  const handleToggleAvailability = async () => {
    const nextState = !isAvailable;
    setIsAvailable(nextState);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isAvailable: nextState,
        });
      } catch (err) {
        console.error('Failed to toggle availability:', err);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          fullName: editName.trim(),
          bio: editBio.trim(),
          dayRate: editDayRate.trim(),
          location: editLocation.trim(),
          experience: editExperience.trim(),
        });
      }
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Save Failed', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKitItem = async () => {
    if (!newKitText.trim() || !currentUser) return;
    const updatedList = [...equipmentList, newKitText.trim()];
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        equipment: updatedList,
      });
      setNewKitText('');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveKitItem = async (index) => {
    if (!currentUser) return;
    const updatedList = equipmentList.filter((_, i) => i !== index);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        equipment: updatedList,
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background || '#0c0d0e' }]} contentContainerStyle={styles.content}>
      {/* Top Header Controls: Edit Profile on Top-Left, Settings on Top-Right */}
      <View style={styles.topControlRow}>
        <TouchableOpacity
          style={[styles.actionIconBtn, { borderColor: theme.cardBorder || '#242830' }]}
          onPress={() => {
            setEditName(userProfile?.fullName || '');
            setEditBio(userProfile?.bio || '');
            setEditDayRate(userProfile?.dayRate || '');
            setEditLocation(userProfile?.location || '');
            setEditExperience(userProfile?.experience || '');
            setIsEditing(true);
          }}
        >
          <Text style={[styles.controlText, { color: theme.text || '#ffffff' }]}>✎ Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionIconBtn, { borderColor: theme.cardBorder || '#242830' }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Header: Avatar & Availability Pill on Left, Details on Right */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarColumn}>
          <View style={styles.avatarWrapper}>
            {userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface || '#121417' }]}>
                <Text style={[styles.avatarInitial, { color: theme.primary || '#f5a623' }]}>
                  {userProfile?.fullName ? userProfile.fullName[0].toUpperCase() : 'F'}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.avatarOnlineDot,
                { backgroundColor: isAvailable ? theme.accentGreen || '#22c55e' : '#888888' },
              ]}
            />
          </View>

          {/* Availability pill positioned directly below avatar */}
          <TouchableOpacity
            style={[styles.statusUnderAvatarBtn, { borderColor: isAvailable ? '#1e3d29' : '#333333' }]}
            onPress={handleToggleAvailability}
          >
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? theme.accentGreen || '#22c55e' : '#888888' }]} />
            <Text style={[styles.statusUnderAvatarText, { color: isAvailable ? '#4ade80' : theme.textSecondary || '#9ca3af' }]}>
              {isAvailable ? 'Available' : 'Busy'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={[styles.fullName, { color: theme.text || '#ffffff' }]}>
              {userProfile?.fullName || 'Filmmaker'}
            </Text>
            {userProfile?.roles && userProfile.roles.length > 0 && (
              <View style={[styles.departmentBadge, { backgroundColor: '#2a2215' }]}>
                <Text style={[styles.departmentText, { color: theme.primary || '#f5a623' }]}>
                  {userProfile.roles[0]}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.metaLocation, { color: theme.textSecondary || '#9ca3af' }]}>
            @{userProfile?.username || 'crew'}
            {userProfile?.location ? ` • 📍 ${userProfile.location}` : ''}
            {userProfile?.experience ? ` • ${userProfile.experience}` : ''}
          </Text>

          {userProfile?.dayRate ? (
            <Text style={[styles.rateHighlight, { color: theme.primary || '#f5a623' }]}>
              {userProfile.dayRate}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Bio Section */}
      <Text style={[styles.bioText, { color: theme.textSecondary || '#9ca3af' }]}>
        {userProfile?.bio ? userProfile.bio : 'No bio added yet. Tap "Edit Profile" to add your experience.'}
      </Text>

      {/* Departments */}
      {userProfile?.roles && userProfile.roles.length > 0 && (
        <View style={styles.genreSection}>
          <Text style={[styles.genreLabel, { color: theme.textMuted || '#64748b' }]}>Departments:</Text>
          {userProfile.roles.map((r) => (
            <View key={r} style={[styles.genreChip, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
              <Text style={[styles.genreChipText, { color: theme.textSecondary || '#9ca3af' }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 4 Tabs Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNavRow}>
        {[
          { key: 'Showreel', label: '🎬 Showreel' },
          { key: 'Stills & Posters', label: '🖼 Stills & Posters' },
          { key: 'Equipment Kit', label: `🔧 Equipment Kit (${equipmentList.length})` },
          { key: 'Credits & Accolades', label: '🎗 Credits & Accolades' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && { borderBottomColor: theme.primary || '#f5a623', borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabButtonText, { color: isActive ? theme.primary || '#f5a623' : theme.textMuted || '#64748b' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'Showreel' && (
        <View style={styles.tabContainer}>
          <View style={[styles.videoPlaceholder, { backgroundColor: '#000000', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={{ fontSize: 40 }}>🎬</Text>
            <Text style={{ color: theme.textSecondary || '#9ca3af', marginTop: 8, fontSize: 12 }}>
              {userProfile?.showreelUrl ? userProfile.showreelUrl : 'No showreel link attached yet.'}
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'Stills & Posters' && (
        <View style={styles.tabContainer}>
          <View style={[styles.emptyTabCard, { borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={{ color: theme.textSecondary || '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
              No production stills or festival posters uploaded.
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'Equipment Kit' && (
        <View style={styles.tabContainer}>
          <View style={styles.addKitRow}>
            <TextInput
              style={[styles.addKitInput, { backgroundColor: theme.card || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
              placeholder="Add camera package, lens set, audio gear..."
              placeholderTextColor={theme.textMuted || '#64748b'}
              value={newKitText}
              onChangeText={setNewKitText}
            />
            <TouchableOpacity style={[styles.addKitBtn, { backgroundColor: theme.primary || '#f5a623' }]} onPress={handleAddKitItem}>
              <Text style={styles.addKitBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {equipmentList.length > 0 ? (
            equipmentList.map((item, index) => (
              <View key={index} style={[styles.gearCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
                <Text style={{ color: theme.primary || '#f5a623', marginRight: 10 }}>✔</Text>
                <Text style={[styles.gearTitle, { color: theme.text || '#ffffff' }]}>{item}</Text>
                <TouchableOpacity onPress={() => handleRemoveKitItem(index)} style={styles.removeGearBtn}>
                  <Text style={{ color: theme.textMuted || '#64748b', fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.textSecondary || '#9ca3af', fontStyle: 'italic', marginTop: 10 }}>
              No owned gear listed.
            </Text>
          )}
        </View>
      )}

      {activeTab === 'Credits & Accolades' && (
        <View style={styles.tabContainer}>
          <View style={[styles.emptyTabCard, { borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={{ color: theme.textSecondary || '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
              No project credits or festival honors listed yet.
            </Text>
          </View>
        </View>
      )}

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.modalTitle, { color: theme.text || '#ffffff' }]}>EDIT PROFILE</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>DISPLAY NAME</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>BIO / EXPERIENCE</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830', height: 70 }]}
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>LOCATION</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={editLocation}
                onChangeText={setEditLocation}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>EXPERIENCE</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={editExperience}
                onChangeText={setEditExperience}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>DAY RATE & TERMS</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={editDayRate}
                onChangeText={setEditDayRate}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: theme.surface || '#121417' }]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={{ color: theme.textSecondary || '#9ca3af', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  <Text style={{ color: '#000000', fontWeight: 'bold' }}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Text>
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
  content: { padding: 16, paddingTop: 44, paddingBottom: 60 },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#121417',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: { fontSize: 12, fontWeight: '700' },
  profileHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatarColumn: { alignItems: 'center', marginRight: 14 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 68, height: 68, borderRadius: 10 },
  avatarPlaceholder: { width: 68, height: 68, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: 'bold' },
  avatarOnlineDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#0c0d0e' },
  statusUnderAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#121417',
    marginTop: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusUnderAvatarText: { fontSize: 10, fontWeight: '800' },
  nameBlock: { flex: 1, paddingTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  fullName: { fontSize: 18, fontWeight: '900' },
  departmentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  departmentText: { fontSize: 10, fontWeight: 'bold' },
  metaLocation: { fontSize: 11, marginTop: 4 },
  rateHighlight: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  bioText: { fontSize: 13, lineHeight: 19, marginVertical: 10 },
  genreSection: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  genreLabel: { fontSize: 11, fontWeight: '600' },
  genreChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  genreChipText: { fontSize: 11, fontWeight: '600' },
  tabNavRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#222', marginBottom: 16 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 12, marginRight: 8 },
  tabButtonText: { fontSize: 13, fontWeight: '700' },
  tabContainer: { marginTop: 4 },
  videoPlaceholder: { height: 180, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTabCard: { padding: 24, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  addKitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addKitInput: { flex: 1, borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, fontSize: 13 },
  addKitBtn: { paddingHorizontal: 14, borderRadius: 6, justifyContent: 'center' },
  addKitBtnText: { color: '#000000', fontSize: 12, fontWeight: '800' },
  gearCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, borderWidth: 1, marginBottom: 8 },
  gearTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  removeGearBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { maxHeight: '90%', borderRadius: 12, borderWidth: 1, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  modalInput: { borderRadius: 6, borderWidth: 1, padding: 10, fontSize: 13 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  modalSaveBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6 },
});