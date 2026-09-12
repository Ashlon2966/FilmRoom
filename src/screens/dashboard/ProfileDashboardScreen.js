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
  Linking,
  Pressable,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  AVAILABILITY_CONFIG,
  AVAILABILITY_STATUS,
  ROLE_CATEGORIES,
  UNION_STATUSES,
  INDUSTRY_ROLES,
  getRolesByCategory,
  hasCapability,
} from '../../config/rolesConfig';

export default function ProfileDashboardScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState('Showreel');

  // Resolve current availability
  let currentAvailKey = AVAILABILITY_STATUS.AVAILABLE;
  let currentAvailDate = null;
  if (userProfile?.availability) {
    if (typeof userProfile.availability === 'object') {
      currentAvailKey = userProfile.availability.status || AVAILABILITY_STATUS.AVAILABLE;
      currentAvailDate = userProfile.availability.availableFromDate || null;
    } else if (typeof userProfile.availability === 'string') {
      currentAvailKey = userProfile.availability;
    }
  } else if (userProfile?.isAvailable === false) {
    currentAvailKey = AVAILABILITY_STATUS.BUSY;
  }

  const availCfg =
    AVAILABILITY_CONFIG[currentAvailKey] || AVAILABILITY_CONFIG[AVAILABILITY_STATUS.AVAILABLE];
  const availLabel =
    currentAvailKey === AVAILABILITY_STATUS.AVAILABLE_FROM && currentAvailDate
      ? `Avail: ${currentAvailDate}`
      : availCfg.shortLabel;

  // Availability Modal State
  const [isAvailModalOpen, setIsAvailModalOpen] = useState(false);
  const [selectedAvailStatus, setSelectedAvailStatus] = useState(currentAvailKey);
  const [availDateInput, setAvailDateInput] = useState(currentAvailDate || '');
  const [isSavingAvail, setIsSavingAvail] = useState(false);

  // In-Place Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDayRate, setEditDayRate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editCategory, setEditCategory] = useState(ROLE_CATEGORIES.TALENT);
  const [editRole, setEditRole] = useState(null);
  const [editUnionStatus, setEditUnionStatus] = useState('Non-Union');
  const [editLanguages, setEditLanguages] = useState('');
  const [editAgeRange, setEditAgeRange] = useState('');
  const [editShowreelUrl, setEditShowreelUrl] = useState('');
  const [editIsRepresented, setEditIsRepresented] = useState(false);
  const [editAgencyName, setEditAgencyName] = useState('');
  const [editManagerName, setEditManagerName] = useState('');
  const [editManagerEmail, setEditManagerEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Showreel Quick Attach
  const [quickShowreelInput, setQuickShowreelInput] = useState('');

  // Equipment Kit Management
  const [newKitText, setNewKitText] = useState('');
  const equipmentList = userProfile?.equipment || [];

  // Credits Management
  const [newCreditTitle, setNewCreditTitle] = useState('');
  const [newCreditRole, setNewCreditRole] = useState('');
  const creditsList = userProfile?.credits || [];

  // Open Availability Picker
  const handleOpenAvailModal = () => {
    setSelectedAvailStatus(currentAvailKey);
    setAvailDateInput(currentAvailDate || '');
    setIsAvailModalOpen(true);
  };

  // Save Availability to Firestore
  const handleSaveAvailability = async () => {
    if (!currentUser) return;
    setIsSavingAvail(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        availability: {
          status: selectedAvailStatus,
          availableFromDate:
            selectedAvailStatus === AVAILABILITY_STATUS.AVAILABLE_FROM
              ? availDateInput.trim()
              : null,
        },
        isAvailable: selectedAvailStatus === AVAILABILITY_STATUS.AVAILABLE,
      });
      setIsAvailModalOpen(false);
    } catch (err) {
      Alert.alert('Update Failed', err.message);
    } finally {
      setIsSavingAvail(false);
    }
  };

  // Open Edit Profile Modal and hydrate form
  const handleOpenEditModal = () => {
    setEditName(userProfile?.fullName || userProfile?.displayName || '');
    setEditBio(userProfile?.bio || '');
    setEditDayRate(userProfile?.dayRate || '');
    setEditLocation(userProfile?.location || userProfile?.city || '');
    setEditExperience(userProfile?.experience || '');
    setEditCategory(userProfile?.category || ROLE_CATEGORIES.TALENT);

    const matchedRole = INDUSTRY_ROLES.find(
      (r) => r.name === (userProfile?.role || userProfile?.roles?.[0])
    ) || getRolesByCategory(ROLE_CATEGORIES.TALENT)[0];
    setEditRole(matchedRole);

    setEditUnionStatus(userProfile?.unionStatus || 'Non-Union');
    setEditLanguages(
      Array.isArray(userProfile?.languages)
        ? userProfile.languages.join(', ')
        : userProfile?.languages || ''
    );
    setEditAgeRange(userProfile?.ageRange || '');
    setEditShowreelUrl(userProfile?.showreelUrl || '');
    setEditIsRepresented(!!userProfile?.representation?.isRepresented);
    setEditAgencyName(userProfile?.representation?.agencyName || '');
    setEditManagerName(userProfile?.representation?.managerName || '');
    setEditManagerEmail(userProfile?.representation?.managerEmail || '');

    setIsEditing(true);
  };

  // Save Full Profile
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Professional name cannot be empty.');
      return;
    }
    if (!currentUser) return;

    setIsSavingProfile(true);
    try {
      const languagesList = editLanguages
        ? editLanguages.split(',').map((l) => l.trim()).filter(Boolean)
        : [];

      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: editName.trim(),
        displayName: editName.trim(),
        bio: editBio.trim(),
        dayRate: editDayRate.trim(),
        location: editLocation.trim(),
        city: editLocation.trim(),
        experience: editExperience.trim(),
        category: editCategory,
        role: editRole?.name || 'Filmmaker',
        department: editRole?.department || 'Crew',
        isActor: !!editRole?.isActor,
        unionStatus: editUnionStatus,
        languages: languagesList,
        ageRange: editRole?.isActor ? editAgeRange.trim() : null,
        showreelUrl: editShowreelUrl.trim(),
        representation: {
          isRepresented: editIsRepresented,
          agencyName: editIsRepresented ? editAgencyName.trim() : null,
          managerName: editIsRepresented ? editManagerName.trim() : null,
          managerEmail: editIsRepresented ? editManagerEmail.trim() : null,
        },
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile dossier updated successfully.');
    } catch (error) {
      Alert.alert('Save Failed', error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Attach Showreel Quick
  const handleSaveQuickShowreel = async () => {
    if (!quickShowreelInput.trim() || !currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        showreelUrl: quickShowreelInput.trim(),
      });
      setQuickShowreelInput('');
      Alert.alert('Showreel Linked', 'Your portfolio reel link has been attached.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Equipment Add/Remove
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

  // Credits Add/Remove
  const handleAddCredit = async () => {
    if (!newCreditTitle.trim() || !currentUser) return;
    const newCreditObj = {
      title: newCreditTitle.trim(),
      type: newCreditRole.trim() || 'Key Creative',
    };
    const updatedCredits = [...creditsList, newCreditObj];
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        credits: updatedCredits,
      });
      setNewCreditTitle('');
      setNewCreditRole('');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveCredit = async (index) => {
    if (!currentUser) return;
    const updatedCredits = creditsList.filter((_, i) => i !== index);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        credits: updatedCredits,
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const isRepresented = !!userProfile?.representation?.isRepresented;
  const primaryRole = userProfile?.role || userProfile?.roles?.[0] || 'Filmmaker';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Controls */}
      <View style={styles.topControlRow}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              { backgroundColor: theme.surface, borderColor: theme.cardBorder },
            ]}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Text style={[styles.controlText, { color: theme.text }]}>✎ Edit Dossier</Text>
          </TouchableOpacity>

          {hasCapability(primaryRole, 'canShortlistTalent') && (
            <TouchableOpacity
              style={[
                styles.actionIconBtn,
                { backgroundColor: theme.surface, borderColor: theme.primary + '55' },
              ]}
              onPress={() => navigation.navigate('Shortlists')}
              activeOpacity={0.8}
            >
              <Text style={[styles.controlText, { color: theme.primary }]}>★ My Shortlists</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.actionIconBtn,
            { backgroundColor: theme.surface, borderColor: theme.cardBorder },
          ]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Header: Avatar & Interactive 4-State Availability directly beneath it */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarColumn}>
          <View style={[styles.avatarWrapper, { borderColor: theme.cardBorder }]}>
            {userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                  {userProfile?.fullName ? userProfile.fullName[0].toUpperCase() : 'F'}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.avatarOnlineDot,
                {
                  backgroundColor: availCfg.color,
                  borderColor: theme.background,
                },
              ]}
            />
          </View>

          {/* Interactive 4-state availability pill positioned directly below avatar */}
          <TouchableOpacity
            style={[
              styles.statusUnderAvatarBtn,
              {
                backgroundColor: availCfg.bgColor,
                borderColor: availCfg.color + '66',
              },
            ]}
            onPress={handleOpenAvailModal}
            activeOpacity={0.8}
          >
            <View style={[styles.statusDot, { backgroundColor: availCfg.color }]} />
            <Text style={[styles.statusUnderAvatarText, { color: availCfg.color }]}>
              {availLabel}
            </Text>
            <Text style={{ color: availCfg.color, fontSize: 8, marginLeft: 3 }}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={[styles.fullName, { color: theme.text }]} numberOfLines={1}>
              {userProfile?.fullName || userProfile?.displayName || 'Filmmaker'}
            </Text>
          </View>

          {/* Role & Union Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.departmentBadge, { backgroundColor: '#2a2215', borderColor: theme.primary + '55' }]}>
              <Text style={[styles.departmentText, { color: theme.primary }]}>
                {primaryRole}
              </Text>
            </View>

            {userProfile?.unionStatus && userProfile.unionStatus !== 'Non-Union' && (
              <View style={[styles.departmentBadge, { backgroundColor: '#18202c', borderColor: '#2b3952' }]}>
                <Text style={[styles.departmentText, { color: '#93c5fd' }]}>
                  {userProfile.unionStatus}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.metaLocation, { color: theme.textSecondary }]}>
            @{userProfile?.username || 'crew'}
            {userProfile?.location || userProfile?.city
              ? ` • 📍 ${userProfile.location || userProfile.city}`
              : ''}
            {userProfile?.experience ? ` • ${userProfile.experience}` : ''}
          </Text>

          {userProfile?.dayRate ? (
            <Text style={[styles.rateHighlight, { color: theme.primary }]}>
              Day Rate: <Text style={{ color: theme.text }}>{userProfile.dayRate}</Text>
            </Text>
          ) : null}
        </View>
      </View>

      {/* Representation Gateway Strip */}
      <View
        style={[
          styles.repGatewayCard,
          {
            backgroundColor: isRepresented ? '#141a24' : theme.card,
            borderColor: isRepresented ? '#2b3952' : theme.cardBorder,
          },
        ]}
      >
        <Text style={[styles.repGatewayLabel, { color: isRepresented ? '#93c5fd' : theme.text }]}>
          {isRepresented
            ? `🏛 Represented by ${userProfile?.representation?.agencyName || userProfile?.representation?.managerName || 'Agency'}`
            : '👤 Self-Represented Talent'}
        </Text>
        <Text style={[styles.repGatewayNote, { color: theme.textMuted }]}>
          {isRepresented
            ? 'Inquiries route through your designated representative. Private contact details remain protected.'
            : 'You receive professional casting and production contact requests directly via FilmRoom.'}
        </Text>
      </View>

      {/* Actor Age Range & Languages */}
      <View style={styles.detailsRow}>
        {userProfile?.ageRange ? (
          <View style={[styles.detailPill, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <Text style={[styles.detailPillText, { color: theme.text }]}>
              Playing Age: <Text style={{ color: theme.primary }}>{userProfile.ageRange}</Text>
            </Text>
          </View>
        ) : null}

        {userProfile?.languages && userProfile.languages.length > 0 ? (
          <View style={[styles.detailPill, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <Text style={[styles.detailPillText, { color: theme.text }]}>
              🗣{' '}
              {Array.isArray(userProfile.languages)
                ? userProfile.languages.join(', ')
                : userProfile.languages}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Bio Section */}
      <Text style={[styles.bioText, { color: theme.textSecondary }]}>
        {userProfile?.bio
          ? userProfile.bio
          : 'No professional bio added yet. Tap "Edit Profile Dossier" above to add your background and focus.'}
      </Text>

      {/* 3 Portfolio Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNavRow}>
        {[
          { key: 'Showreel', label: '🎬 Showreel' },
          { key: 'Equipment Kit', label: `🔧 Equipment Kit (${equipmentList.length})` },
          { key: 'Credits & Accolades', label: `🎗 Credits (${creditsList.length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                isActive && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: isActive ? theme.primary : theme.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'Showreel' && (
        <View style={styles.tabContainer}>
          {userProfile?.showreelUrl ? (
            <TouchableOpacity
              style={[
                styles.videoPlaceholder,
                { backgroundColor: '#000000', borderColor: theme.primary },
              ]}
              onPress={() => {
                Linking.openURL(userProfile.showreelUrl).catch(() =>
                  Alert.alert('Error', 'Unable to open showreel URL.')
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 36 }}>🎬</Text>
              <Text style={[styles.reelUrlLink, { color: theme.primary }]}>
                {userProfile.showreelUrl}
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 11 }}>
                Tap to preview externally (Vimeo / YouTube / Drive)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.emptyTabCard, { borderColor: theme.cardBorder }]}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
                No showreel attached to your dossier yet.
              </Text>
              <View style={styles.addKitRow}>
                <TextInput
                  style={[
                    styles.addKitInput,
                    { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                  ]}
                  placeholder="Paste Vimeo / YouTube / Drive reel URL..."
                  placeholderTextColor={theme.textMuted}
                  value={quickShowreelInput}
                  onChangeText={setQuickShowreelInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.addKitBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveQuickShowreel}
                >
                  <Text style={styles.addKitBtnText}>Attach</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {activeTab === 'Equipment Kit' && (
        <View style={styles.tabContainer}>
          <View style={styles.addKitRow}>
            <TextInput
              style={[
                styles.addKitInput,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.cardBorder,
                },
              ]}
              placeholder="Add camera body, anamorphic lenses, lighting kit..."
              placeholderTextColor={theme.textMuted}
              value={newKitText}
              onChangeText={setNewKitText}
            />
            <TouchableOpacity
              style={[styles.addKitBtn, { backgroundColor: theme.primary }]}
              onPress={handleAddKitItem}
            >
              <Text style={styles.addKitBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {equipmentList.length > 0 ? (
            equipmentList.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.gearCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <Text style={{ color: theme.primary, marginRight: 10 }}>✔</Text>
                <Text style={[styles.gearTitle, { color: theme.text }]}>{item}</Text>
                <TouchableOpacity onPress={() => handleRemoveKitItem(index)} style={styles.removeGearBtn}>
                  <Text style={{ color: theme.textMuted, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.textSecondary, fontStyle: 'italic', marginTop: 10 }}>
              No equipment listed yet. Add your gear packages above.
            </Text>
          )}
        </View>
      )}

      {activeTab === 'Credits & Accolades' && (
        <View style={styles.tabContainer}>
          <View style={styles.addCreditBox}>
            <TextInput
              style={[
                styles.addCreditInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="Project Title (e.g. Oppenheimer, The Bear)"
              placeholderTextColor={theme.textMuted}
              value={newCreditTitle}
              onChangeText={setNewCreditTitle}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                style={[
                  styles.addCreditInput,
                  { flex: 1, backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                ]}
                placeholder="Role / Craft (e.g. Lead DP, 1st AD)"
                placeholderTextColor={theme.textMuted}
                value={newCreditRole}
                onChangeText={setNewCreditRole}
              />
              <TouchableOpacity
                style={[styles.addKitBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddCredit}
              >
                <Text style={styles.addKitBtnText}>+ Add Credit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {creditsList.length > 0 ? (
            creditsList.map((c, index) => (
              <View
                key={index}
                style={[
                  styles.creditCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.creditTitle, { color: theme.text }]}>
                    {typeof c === 'string' ? c : c.title}
                  </Text>
                  {c.type ? (
                    <Text style={[styles.creditRole, { color: theme.textMuted }]}>{c.type}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => handleRemoveCredit(index)} style={styles.removeGearBtn}>
                  <Text style={{ color: theme.textMuted, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.textSecondary, fontStyle: 'italic', marginTop: 10 }}>
              No production credits listed yet.
            </Text>
          )}
        </View>
      )}

      {/* 4-State Availability Picker Modal */}
      <Modal visible={isAvailModalOpen} animationType="fade" transparent onRequestClose={() => setIsAvailModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsAvailModalOpen(false)}>
          <Pressable
            style={[
              styles.availModalContent,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.availModalTitle, { color: theme.text }]}>SET AVAILABILITY</Text>
            <Text style={[styles.availModalSub, { color: theme.textSecondary }]}>
              Control whether production leads and directors can reach out to you.
            </Text>

            <View style={{ gap: 8, marginVertical: 14 }}>
              {[
                {
                  id: AVAILABILITY_STATUS.AVAILABLE,
                  title: '🟢 Available for Hire',
                  desc: 'Open to inquiries & casting requests',
                },
                {
                  id: AVAILABILITY_STATUS.BUSY,
                  title: '⚪ Currently on Production',
                  desc: 'Active on a shoot; inquiries queued',
                },
                {
                  id: AVAILABILITY_STATUS.AVAILABLE_FROM,
                  title: '🟡 Available From Date',
                  desc: 'Becoming available on a specific date',
                },
                {
                  id: AVAILABILITY_STATUS.UNAVAILABLE,
                  title: '🔴 Not Accepting Inquiries',
                  desc: 'Temporarily closed to new work',
                },
              ].map((opt) => {
                const isSelected = selectedAvailStatus === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.availOptionBtn,
                      {
                        backgroundColor: isSelected ? theme.surface : '#14161a',
                        borderColor: isSelected ? theme.primary : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setSelectedAvailStatus(opt.id)}
                  >
                    <Text style={[styles.availOptionTitle, { color: isSelected ? theme.primary : theme.text }]}>
                      {opt.title}
                    </Text>
                    <Text style={[styles.availOptionDesc, { color: theme.textMuted }]}>
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedAvailStatus === AVAILABILITY_STATUS.AVAILABLE_FROM && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  AVAILABLE FROM (DATE / MONTH)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                  ]}
                  placeholder="e.g. Nov 15, 2026 or Next Month"
                  placeholderTextColor={theme.textMuted}
                  value={availDateInput}
                  onChangeText={setAvailDateInput}
                />
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.surface }]}
                onPress={() => setIsAvailModalOpen(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveAvailability}
                disabled={isSavingAvail}
              >
                <Text style={{ color: '#000000', fontWeight: '900' }}>
                  {isSavingAvail ? 'Updating...' : 'Save Availability'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Profile Dossier Modal */}
      <Modal visible={isEditing} animationType="slide" transparent onRequestClose={() => setIsEditing(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>EDIT PROFESSIONAL DOSSIER</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Display Name */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PROFESSIONAL NAME *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                ]}
                value={editName}
                onChangeText={setEditName}
              />

              {/* Category / Pillar */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>INDUSTRY PILLAR</Text>
              <View style={styles.modalCategoryRow}>
                {[
                  { key: ROLE_CATEGORIES.TALENT, title: 'Talent & Crafts' },
                  { key: ROLE_CATEGORIES.PRODUCTION, title: 'Production' },
                  { key: ROLE_CATEGORIES.REPRESENTATION, title: 'Representation' },
                ].map((cat) => {
                  const isSelected = editCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.modalCatBtn,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.surface,
                          borderColor: isSelected ? theme.primary : theme.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        setEditCategory(cat.key);
                        const roles = getRolesByCategory(cat.key);
                        if (roles.length > 0) setEditRole(roles[0]);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: isSelected ? '#000000' : theme.textSecondary,
                        }}
                      >
                        {cat.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Role selector */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PRIMARY ROLE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                {getRolesByCategory(editCategory).map((r) => {
                  const isSelected = editRole?.name === r.name;
                  return (
                    <TouchableOpacity
                      key={r.name}
                      style={[
                        styles.modalRoleChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.surface,
                          borderColor: isSelected ? theme.primary : theme.cardBorder,
                          marginRight: 6,
                        },
                      ]}
                      onPress={() => setEditRole(r)}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#000000' : theme.text,
                        }}
                      >
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Union Affiliation */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>UNION AFFILIATION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                {UNION_STATUSES.map((u) => {
                  const isSelected = editUnionStatus === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.modalRoleChip,
                        {
                          backgroundColor: isSelected ? '#242830' : theme.surface,
                          borderColor: isSelected ? theme.primary : theme.cardBorder,
                          marginRight: 6,
                        },
                      ]}
                      onPress={() => setEditUnionStatus(u)}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: isSelected ? theme.primary : theme.textSecondary,
                        }}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Actor Age Range */}
              {editRole?.isActor && (
                <>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    PLAYING AGE RANGE
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                    ]}
                    placeholder="e.g. 25–35, 30–45"
                    placeholderTextColor={theme.textMuted}
                    value={editAgeRange}
                    onChangeText={setEditAgeRange}
                  />
                </>
              )}

              {/* Languages */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                LANGUAGES (COMMA SEPARATED)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                ]}
                placeholder="e.g. English, French, Spanish"
                placeholderTextColor={theme.textMuted}
                value={editLanguages}
                onChangeText={setEditLanguages}
              />

              {/* Location */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                PRIMARY PRODUCTION REGION / CITY
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                ]}
                placeholder="e.g. London, Los Angeles, Mumbai"
                placeholderTextColor={theme.textMuted}
                value={editLocation}
                onChangeText={setEditLocation}
              />

              {/* Day Rate */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DAY RATE & TERMS</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                ]}
                placeholder="e.g. $1,200/day (Union Scale)"
                placeholderTextColor={theme.textMuted}
                value={editDayRate}
                onChangeText={setEditDayRate}
              />

              {/* Showreel Link */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                SHOWREEL / PORTFOLIO URL
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                ]}
                placeholder="https://vimeo.com/... or YouTube link"
                placeholderTextColor={theme.textMuted}
                value={editShowreelUrl}
                onChangeText={setEditShowreelUrl}
                autoCapitalize="none"
              />

              {/* Representation Gateway Settings */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                PROFESSIONAL REPRESENTATION
              </Text>
              <View style={styles.repToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.repToggleBtn,
                    {
                      backgroundColor: !editIsRepresented ? theme.primary : theme.surface,
                      borderColor: !editIsRepresented ? theme.primary : theme.cardBorder,
                    },
                  ]}
                  onPress={() => setEditIsRepresented(false)}
                >
                  <Text style={{ color: !editIsRepresented ? '#000000' : theme.textSecondary, fontWeight: '800' }}>
                    Self-Represented
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.repToggleBtn,
                    {
                      backgroundColor: editIsRepresented ? theme.primary : theme.surface,
                      borderColor: editIsRepresented ? theme.primary : theme.cardBorder,
                    },
                  ]}
                  onPress={() => setEditIsRepresented(true)}
                >
                  <Text style={{ color: editIsRepresented ? '#000000' : theme.textSecondary, fontWeight: '800' }}>
                    Agency / Managed
                  </Text>
                </TouchableOpacity>
              </View>

              {editIsRepresented && (
                <View style={[styles.repBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.subFieldLabel, { color: theme.textSecondary }]}>AGENCY / MANAGEMENT CO.</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: theme.card, color: theme.text, borderColor: theme.cardBorder },
                    ]}
                    placeholder="e.g. CAA, WME, UTA"
                    placeholderTextColor={theme.textMuted}
                    value={editAgencyName}
                    onChangeText={setEditAgencyName}
                  />

                  <Text style={[styles.subFieldLabel, { color: theme.textSecondary }]}>MANAGER / AGENT NAME</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: theme.card, color: theme.text, borderColor: theme.cardBorder },
                    ]}
                    placeholder="e.g. Dan Aloni"
                    placeholderTextColor={theme.textMuted}
                    value={editManagerName}
                    onChangeText={setEditManagerName}
                  />

                  <Text style={[styles.subFieldLabel, { color: theme.textSecondary }]}>REPRESENTATIVE INQUIRY EMAIL</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: theme.card, color: theme.text, borderColor: theme.cardBorder },
                    ]}
                    placeholder="representation@agency.com"
                    placeholderTextColor={theme.textMuted}
                    value={editManagerEmail}
                    onChangeText={setEditManagerEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              )}

              {/* Bio / Experience */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                PROFESSIONAL SYNOPSIS / BIO
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.cardBorder,
                    height: 80,
                    textAlignVertical: 'top',
                  },
                ]}
                value={editBio}
                onChangeText={setEditBio}
                multiline
              />

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: theme.surface }]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  <Text style={{ color: '#000000', fontWeight: '900' }}>
                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
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
  content: { padding: 16, paddingTop: 44, paddingBottom: 80 },
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: { fontSize: 12, fontWeight: '700' },
  profileHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatarColumn: { alignItems: 'center', marginRight: 14 },
  avatarWrapper: { position: 'relative', borderWidth: 1, borderRadius: 10 },
  avatar: { width: 68, height: 68, borderRadius: 10 },
  avatarPlaceholder: { width: 68, height: 68, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 26, fontWeight: 'bold' },
  avatarOnlineDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  statusUnderAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusUnderAvatarText: { fontSize: 10, fontWeight: '800' },
  nameBlock: { flex: 1, paddingTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullName: { fontSize: 18, fontWeight: '900' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  departmentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  departmentText: { fontSize: 10, fontWeight: 'bold' },
  metaLocation: { fontSize: 11, marginTop: 4 },
  rateHighlight: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  repGatewayCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
  },
  repGatewayLabel: { fontSize: 12, fontWeight: '900' },
  repGatewayNote: { fontSize: 11, marginTop: 3, lineHeight: 16 },
  detailsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  detailPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  detailPillText: { fontSize: 11, fontWeight: '600' },
  bioText: { fontSize: 13, lineHeight: 19, marginVertical: 8 },
  tabNavRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#242830', marginVertical: 14 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 12, marginRight: 8 },
  tabButtonText: { fontSize: 13, fontWeight: '700' },
  tabContainer: { marginTop: 4 },
  videoPlaceholder: { padding: 20, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  reelUrlLink: { fontSize: 13, fontWeight: '700', marginTop: 8, textDecorationLine: 'underline' },
  emptyTabCard: { padding: 20, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  addKitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addKitInput: { flex: 1, borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, fontSize: 13 },
  addKitBtn: { paddingHorizontal: 14, borderRadius: 6, justifyContent: 'center' },
  addKitBtnText: { color: '#000000', fontSize: 12, fontWeight: '800' },
  gearCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, borderWidth: 1, marginBottom: 8 },
  gearTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  removeGearBtn: { padding: 4 },
  addCreditBox: { marginBottom: 12 },
  addCreditInput: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  creditCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, borderWidth: 1, marginBottom: 8 },
  creditTitle: { fontSize: 13, fontWeight: '700' },
  creditRole: { fontSize: 11, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  availModalContent: { borderRadius: 12, borderWidth: 1, padding: 20 },
  availModalTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.8 },
  availModalSub: { fontSize: 11, marginTop: 2 },
  availOptionBtn: { padding: 12, borderRadius: 8, borderWidth: 1 },
  availOptionTitle: { fontSize: 13, fontWeight: '800' },
  availOptionDesc: { fontSize: 11, marginTop: 2 },
  modalContent: { maxHeight: '92%', borderRadius: 12, borderWidth: 1, padding: 18 },
  modalTitle: { fontSize: 17, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  subFieldLabel: { fontSize: 9, fontWeight: '800', marginTop: 8, marginBottom: 2 },
  modalInput: { borderRadius: 6, borderWidth: 1, padding: 10, fontSize: 13 },
  modalCategoryRow: { flexDirection: 'row', gap: 6 },
  modalCatBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  modalRoleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  repToggleRow: { flexDirection: 'row', gap: 8 },
  repToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  repBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  modalSaveBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6 },
});