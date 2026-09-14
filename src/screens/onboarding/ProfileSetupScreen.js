import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  CORE_PROFESSIONAL_ROLES,
  reorderRoles,
  AVAILABILITY_STATUS,
} from '../../config/rolesConfig';
import { COUNTRIES, formatLocationDisplay } from '../../data/countriesAndRegions';
import { uploadToCloudinary } from '../../services/cloudinaryService';

const GENDER_OPTIONS = ['Female', 'Male', 'Non-Binary', 'Prefer not to say', 'Other'];

export default function ProfileSetupScreen() {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();

  // 1. Basic Identity — Pre-populated from Signup
  const [professionalName, setProfessionalName] = useState(
    userProfile?.fullName || userProfile?.displayName || currentUser?.displayName || ''
  );
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [gender, setGender] = useState(userProfile?.gender || 'Prefer not to say');
  const [avatarPreviewUri, setAvatarPreviewUri] = useState(userProfile?.photoURL || null);
  const [cloudinaryPhotoUrl, setCloudinaryPhotoUrl] = useState(userProfile?.photoURL || null);
  const [photoMetadata, setPhotoMetadata] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Synchronize when userProfile loads if not already edited
  useEffect(() => {
    if (userProfile?.fullName && !professionalName) {
      setProfessionalName(userProfile.fullName);
    }
    if (userProfile?.gender && (!gender || gender === 'Prefer not to say')) {
      setGender(userProfile.gender);
    }
    if (userProfile?.photoURL && !avatarPreviewUri) {
      setAvatarPreviewUri(userProfile.photoURL);
      setCloudinaryPhotoUrl(userProfile.photoURL);
    }
  }, [userProfile]);

  // 2. Role-Aware Selection & Order
  const [selectedRoles, setSelectedRoles] = useState(['Director']);

  // 3. Progressive Role-Specific Fields
  // Actor
  const [actorAgeRange, setActorAgeRange] = useState('');
  const [actorHeight, setActorHeight] = useState('');
  const [actorSpecialties, setActorSpecialties] = useState('');
  const [actorExpTypes, setActorExpTypes] = useState('Film, Commercial');
  // Director
  const [directorExpYears, setDirectorExpYears] = useState('');
  const [directorGenres, setDirectorGenres] = useState('');
  const [directorFormats, setDirectorFormats] = useState('Feature, Short');
  // Cinematographer
  const [cameraSystems, setCameraSystems] = useState('');
  const [lensesPreference, setLensesPreference] = useState('');
  const [lightingExp, setLightingExp] = useState('');
  // Editor
  const [editingSoftware, setEditingSoftware] = useState('');
  // Sound
  const [soundSpecialty, setSoundSpecialty] = useState('');
  const [soundGear, setSoundGear] = useState('');
  // Production
  const [productionRoleTypes, setProductionRoleTypes] = useState('');
  const [budgetExpScale, setBudgetExpScale] = useState('');

  // 4. Region & Phone Hierarchical Selection
  const [selectedCountryCode, setSelectedCountryCode] = useState('IN');
  const [selectedRegion, setSelectedRegion] = useState('Goa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);

  // 5. Portfolio & Showreel
  const [showreelUrl, setShowreelUrl] = useState('');
  const [languages, setLanguages] = useState('English');

  // 6. Representation
  const [isRepresented, setIsRepresented] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');

  // 7. Privacy Toggles
  const [isPhonePublic, setIsPhonePublic] = useState(false);
  const [isEmailPublic, setIsEmailPublic] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Current Country Object
  const currentCountry =
    COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];

  // Headshot upload to Cloudinary
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is needed to upload a headshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setAvatarPreviewUri(asset.uri);
      setIsUploadingAvatar(true);

      try {
        const uploadRes = await uploadToCloudinary({
          fileUri: asset.uri,
          resourceType: 'image',
          fileName: asset.fileName || 'profile_photo.jpg',
          fileSize: asset.fileSize,
          folder: 'filmroom_avatars',
        });
        setCloudinaryPhotoUrl(uploadRes.secureUrl);
        setPhotoMetadata(uploadRes);
      } catch (err) {
        Alert.alert(
          'Media Storage Notice',
          err.message || 'Could not upload photo. You can save your profile and upload an image later.'
        );
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // Role toggle
  const toggleRoleSelection = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      if (selectedRoles.length === 1) {
        Alert.alert('Role Required', 'You must maintain at least one primary professional role.');
        return;
      }
      setSelectedRoles((prev) => prev.filter((r) => r !== roleId));
    } else {
      setSelectedRoles((prev) => [...prev, roleId]);
    }
  };

  // Move role up
  const handleMoveUp = (index) => {
    setSelectedRoles((prev) => reorderRoles.moveUp(prev, index));
  };

  // Move role down
  const handleMoveDown = (index) => {
    setSelectedRoles((prev) => reorderRoles.moveDown(prev, index));
  };

  // Set as primary
  const handleSetPrimary = (index) => {
    setSelectedRoles((prev) => reorderRoles.setAsPrimary(prev, index));
  };

  // Remove role
  const handleRemoveRole = (index) => {
    if (selectedRoles.length === 1) {
      Alert.alert('Role Required', 'You must maintain at least one primary professional role.');
      return;
    }
    setSelectedRoles((prev) => reorderRoles.removeRole(prev, index));
  };

  // Save complete profile
  const handleSaveProfile = async () => {
    if (!professionalName.trim()) {
      Alert.alert('Required Field', 'Please enter your professional name.');
      return;
    }

    if (selectedRoles.length === 0) {
      Alert.alert('Required Field', 'Please select at least one professional role.');
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Active session not found. Please log in again.');

      const primaryRole = selectedRoles[0];
      const secondaryRoles = selectedRoles.slice(1);
      const roleConfig = CORE_PROFESSIONAL_ROLES.find((r) => r.id === primaryRole);

      const languagesList = languages
        ? languages.split(',').map((l) => l.trim()).filter(Boolean)
        : ['English'];

      const locationStr = formatLocationDisplay(selectedRegion, currentCountry.name);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        fullName: professionalName.trim(),
        displayName: professionalName.trim(),
        professionalName: professionalName.trim(),
        gender: gender || null,
        primaryRole,
        secondaryRoles,
        roles: selectedRoles,
        role: primaryRole,
        category: roleConfig?.category || 'TALENT',
        department: roleConfig?.department || 'Production',
        isActor: selectedRoles.includes('Actor'),
        country: currentCountry.name,
        countryCode: currentCountry.code,
        stateRegion: selectedRegion,
        location: locationStr,
        phone: phoneNumber.trim(),
        phoneCountryCode: currentCountry.dialCode,
        isPhonePublic,
        isEmailPublic,
        isLocationPublic: true,
        discoverability: 'PUBLIC',
        languages: languagesList,
        bio: bio.trim(),
        photoURL: cloudinaryPhotoUrl || null,
        photoMetadata: photoMetadata || null,
        showreelUrl: showreelUrl.trim() || null,
        roleSpecific: {
          actor: selectedRoles.includes('Actor')
            ? {
              ageRange: actorAgeRange.trim(),
              height: actorHeight.trim(),
              specialties: actorSpecialties.trim(),
              experienceTypes: actorExpTypes.trim(),
            }
            : null,
          director: selectedRoles.includes('Director')
            ? {
              experienceYears: directorExpYears.trim(),
              genres: directorGenres.trim(),
              formats: directorFormats.trim(),
            }
            : null,
          cinematographer: selectedRoles.includes('Cinematographer')
            ? {
              cameraSystems: cameraSystems.trim(),
              lenses: lensesPreference.trim(),
              lightingExp: lightingExp.trim(),
            }
            : null,
          editor: selectedRoles.includes('Editor')
            ? { software: editingSoftware.trim() }
            : null,
          sound: selectedRoles.includes('Sound')
            ? { specialty: soundSpecialty.trim(), gear: soundGear.trim() }
            : null,
          production: selectedRoles.includes('Production')
            ? { roleTypes: productionRoleTypes.trim(), budgetScale: budgetExpScale.trim() }
            : null,
        },
        availability: {
          status: AVAILABILITY_STATUS.AVAILABLE,
          availableFromDate: null,
        },
        isAvailable: true,
        representation: {
          isRepresented,
          agencyName: isRepresented ? agencyName.trim() : null,
          managerName: isRepresented ? repName.trim() : null,
          managerEmail: isRepresented ? repEmail.trim() : null,
          managerUid: null,
        },
        isOnboarded: true,
        updatedAt: serverTimestamp(),
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: cloudinaryPhotoUrl || null,
        }).catch(() => {});
      }

      // Navigation is reactive via RootNavigator watching onSnapshot in AuthContext
    } catch (error) {
      console.error('Profile save error:', error);
      Alert.alert('Save Notice', error.message || 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.mainContainer, { backgroundColor: theme.background || '#0c0d0e' }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: theme.text || '#ffffff' }]}>
          PROFESSIONAL DOSSIER SETUP
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary || '#9ca3af' }]}>
          Define your industry roles, craft specializations, and professional routing.
        </Text>

        {/* ── 1. AVATAR / HEADSHOT ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={pickImage}
            disabled={isUploadingAvatar}
            style={[
              styles.avatarWrapper,
              { backgroundColor: theme.card || '#181b1f', borderColor: theme.primary || '#f5a623' },
            ]}
            activeOpacity={0.8}
          >
            {avatarPreviewUri ? (
              <Image source={{ uri: avatarPreviewUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 32 }}>📸</Text>
                <Text style={[styles.avatarUploadText, { color: theme.primary || '#f5a623' }]}>
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Headshot'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {isUploadingAvatar && <ActivityIndicator color={theme.primary || '#f5a623'} style={{ marginTop: 8 }} />}
        </View>

        {/* ── 2. IDENTITY ── */}
        <Text style={[styles.sectionTitle, { color: theme.primary || '#f5a623' }]}>
          1. IDENTITY & BIO
        </Text>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>
            Professional Full Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.card || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' },
            ]}
            value={professionalName}
            onChangeText={setProfessionalName}
            placeholder="e.g. Christopher Nolan"
            placeholderTextColor={theme.textMuted || '#64748b'}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>
            Short Professional Bio
          </Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: theme.card || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' },
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="Introduce your cinematic craft, background, and creative voice..."
            placeholderTextColor={theme.textMuted || '#64748b'}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>
            Gender (Optional)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {GENDER_OPTIONS.map((g) => {
              const isSel = gender === g;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    backgroundColor: isSel ? (theme.primary || '#f5a623') + '20' : (theme.card || '#181b1f'),
                    borderColor: isSel ? (theme.primary || '#f5a623') : (theme.cardBorder || '#242830'),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSel ? '700' : '500',
                      color: isSel ? (theme.primary || '#f5a623') : (theme.text || '#ffffff'),
                    }}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 3. ORDERED ROLES ── */}
        <Text style={[styles.sectionTitle, { color: theme.primary || '#f5a623', marginTop: 14 }]}>
          2. PROFESSIONAL ROLES & ORDER
        </Text>
        <Text style={[styles.helperText, { color: theme.textSecondary || '#9ca3af' }]}>
          Select all roles that reflect your work. The 1st role is your Primary Role. You can reorder below.
        </Text>

        <View style={styles.rolesGrid}>
          {CORE_PROFESSIONAL_ROLES.map((r) => {
            const isSelected = selectedRoles.includes(r.id);
            const index = selectedRoles.indexOf(r.id);
            return (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: isSelected ? theme.primary || '#f5a623' : theme.card || '#181b1f',
                    borderColor: isSelected ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                  },
                ]}
                onPress={() => toggleRoleSelection(r.id)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, marginRight: 5 }}>{r.icon}</Text>
                <Text
                  style={[
                    styles.roleChipText,
                    { color: isSelected ? '#000000' : theme.text || '#ffffff' },
                  ]}
                >
                  {r.label}
                </Text>
                {isSelected && (
                  <View style={styles.roleIndexBadge}>
                    <Text style={styles.roleIndexText}>{index + 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Roles Reordering List */}
        {selectedRoles.length > 0 && (
          <View style={[styles.reorderContainer, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.reorderHeader, { color: theme.primary || '#f5a623' }]}>
              ORDERED ROLES ({selectedRoles.length})
            </Text>
            {selectedRoles.map((roleId, idx) => {
              const roleObj = CORE_PROFESSIONAL_ROLES.find((r) => r.id === roleId);
              const isPrimary = idx === 0;
              return (
                <View
                  key={roleId}
                  style={[
                    styles.reorderItem,
                    { borderColor: isPrimary ? theme.primary || '#f5a623' : theme.cardBorder || '#242830' },
                  ]}
                >
                  <View style={styles.reorderLeft}>
                    <Text style={[styles.reorderIndex, { color: isPrimary ? theme.primary || '#f5a623' : theme.textMuted || '#64748b' }]}>
                      {idx + 1}.
                    </Text>
                    <Text style={[styles.reorderRoleTitle, { color: theme.text || '#ffffff' }]}>
                      {roleObj?.icon} {roleObj?.label}
                    </Text>
                    {isPrimary && (
                      <View style={[styles.primaryTag, { backgroundColor: theme.primary || '#f5a623' }]}>
                        <Text style={styles.primaryTagText}>PRIMARY</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.reorderBtnsRow}>
                    {idx > 0 && (
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: theme.card || '#181b1f' }]}
                        onPress={() => handleMoveUp(idx)}
                      >
                        <Text style={{ color: theme.text || '#ffffff', fontSize: 12 }}>▲</Text>
                      </TouchableOpacity>
                    )}
                    {idx < selectedRoles.length - 1 && (
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: theme.card || '#181b1f' }]}
                        onPress={() => handleMoveDown(idx)}
                      >
                        <Text style={{ color: theme.text || '#ffffff', fontSize: 12 }}>▼</Text>
                      </TouchableOpacity>
                    )}
                    {!isPrimary && (
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: theme.card || '#181b1f' }]}
                        onPress={() => handleSetPrimary(idx)}
                      >
                        <Text style={{ color: theme.primary || '#f5a623', fontSize: 11, fontWeight: '700' }}>★</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#3d1c1c' }]}
                      onPress={() => handleRemoveRole(idx)}
                    >
                      <Text style={{ color: '#f87171', fontSize: 12 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 4. PROGRESSIVE ROLE-SPECIFIC FIELDS ── */}
        {selectedRoles.includes('Actor') && (
          <View style={[styles.progressiveCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.progressiveTitle, { color: theme.primary || '#f5a623' }]}>
              🎭 ACTOR SPECIALIZATION
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Age Range</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={actorAgeRange}
                onChangeText={setActorAgeRange}
                placeholder="e.g. 25 - 35"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Height</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={actorHeight}
                onChangeText={setActorHeight}
                placeholder={'e.g. 5\'11" (180 cm)'}
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Performance Specialties</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={actorSpecialties}
                onChangeText={setActorSpecialties}
                placeholder="e.g. Stage Combat, Accents, Improv, Stunts"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
          </View>
        )}

        {selectedRoles.includes('Director') && (
          <View style={[styles.progressiveCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.progressiveTitle, { color: theme.primary || '#f5a623' }]}>
              🎬 DIRECTOR SPECIALIZATION
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Preferred Genres</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={directorGenres}
                onChangeText={setDirectorGenres}
                placeholder="e.g. Psychological Thriller, Neo-Noir, Sci-Fi"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Directing Experience</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={directorExpYears}
                onChangeText={setDirectorExpYears}
                placeholder="e.g. 2 Features, 4 Shorts, Commercials"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
          </View>
        )}

        {selectedRoles.includes('Cinematographer') && (
          <View style={[styles.progressiveCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.progressiveTitle, { color: theme.primary || '#f5a623' }]}>
              🎥 CINEMATOGRAPHER SPECIALIZATION
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Camera Systems</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={cameraSystems}
                onChangeText={setCameraSystems}
                placeholder="e.g. ARRI Alexa Mini LF, RED V-Raptor, Sony VENICE"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Lenses & Glass</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={lensesPreference}
                onChangeText={setLensesPreference}
                placeholder="e.g. Cooke Anamorphic, Master Primes, Super Baltars"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
          </View>
        )}

        {selectedRoles.includes('Editor') && (
          <View style={[styles.progressiveCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.progressiveTitle, { color: theme.primary || '#f5a623' }]}>
              ✂️ EDITOR SPECIALIZATION
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Editing Software (NLEs)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={editingSoftware}
                onChangeText={setEditingSoftware}
                placeholder="e.g. DaVinci Resolve Studio, Avid Media Composer, Premiere"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
          </View>
        )}

        {/* ── 5. LOCATION & PHONE (HIERARCHICAL) ── */}
        <Text style={[styles.sectionTitle, { color: theme.primary || '#f5a623', marginTop: 14 }]}>
          3. REGION & CONTACT
        </Text>

        {/* Country Selector */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Country *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryScroll}>
            {COUNTRIES.map((c) => {
              const isSel = c.code === selectedCountryCode;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.countryPill,
                    {
                      backgroundColor: isSel ? theme.primary || '#f5a623' : theme.card || '#181b1f',
                      borderColor: isSel ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                    },
                  ]}
                  onPress={() => {
                    setSelectedCountryCode(c.code);
                    setSelectedRegion(c.regions[0] || '');
                  }}
                >
                  <Text style={{ fontSize: 13, marginRight: 4 }}>{c.flag}</Text>
                  <Text style={[styles.countryPillText, { color: isSel ? '#000000' : theme.text || '#ffffff' }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* State/Region Selector */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>
            State / Administrative Region *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryScroll}>
            {currentCountry.regions.map((reg) => {
              const isSel = reg === selectedRegion;
              return (
                <TouchableOpacity
                  key={reg}
                  style={[
                    styles.regionPill,
                    {
                      backgroundColor: isSel ? theme.primary || '#f5a623' : theme.card || '#181b1f',
                      borderColor: isSel ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                    },
                  ]}
                  onPress={() => setSelectedRegion(reg)}
                >
                  <Text style={[styles.regionPillText, { color: isSel ? '#000000' : theme.text || '#ffffff' }]}>
                    {reg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.locationPreviewText, { color: theme.textMuted || '#64748b' }]}>
            Public Display: 📍 {formatLocationDisplay(selectedRegion, currentCountry.name)} (Never exposes street addresses)
          </Text>
        </View>

        {/* Phone with Country Code Dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Phone Number</Text>
          <View style={styles.phoneInputRow}>
            <View
              style={[
                styles.dialCodeBox,
                { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' },
              ]}
            >
              <Text style={{ fontSize: 14 }}>{currentCountry.flag}</Text>
              <Text style={[styles.dialCodeText, { color: theme.primary || '#f5a623' }]}>
                {currentCountry.dialCode}
              </Text>
            </View>

            <TextInput
              style={[
                styles.phoneInput,
                { backgroundColor: theme.card || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' },
              ]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="9876543210"
              placeholderTextColor={theme.textMuted || '#64748b'}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* ── 6. SHOWREEL / PORTFOLIO ── */}
        <Text style={[styles.sectionTitle, { color: theme.primary || '#f5a623', marginTop: 14 }]}>
          4. PORTFOLIO & REEL
        </Text>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>
            Showreel URL (Vimeo / YouTube / Drive)
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.card || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' },
            ]}
            value={showreelUrl}
            onChangeText={setShowreelUrl}
            placeholder="https://vimeo.com/..."
            placeholderTextColor={theme.textMuted || '#64748b'}
            autoCapitalize="none"
          />
        </View>

        {/* ── 7. REPRESENTATION ── */}
        <Text style={[styles.sectionTitle, { color: theme.primary || '#f5a623', marginTop: 14 }]}>
          5. REPRESENTATION
        </Text>
        <View style={styles.repRow}>
          <TouchableOpacity
            style={[
              styles.repToggleBtn,
              {
                backgroundColor: !isRepresented ? theme.primary || '#f5a623' : theme.card || '#181b1f',
                borderColor: !isRepresented ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
              },
            ]}
            onPress={() => setIsRepresented(false)}
          >
            <Text style={{ color: !isRepresented ? '#000' : theme.text || '#fff', fontWeight: '700' }}>
              Self Represented
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.repToggleBtn,
              {
                backgroundColor: isRepresented ? theme.primary || '#f5a623' : theme.card || '#181b1f',
                borderColor: isRepresented ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
              },
            ]}
            onPress={() => setIsRepresented(true)}
          >
            <Text style={{ color: isRepresented ? '#000' : theme.text || '#fff', fontWeight: '700' }}>
              Agency / Manager
            </Text>
          </TouchableOpacity>
        </View>

        {isRepresented && (
          <View style={[styles.repDetailsCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Agency / Management Firm</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={agencyName}
                onChangeText={setAgencyName}
                placeholder="e.g. CAA / WME / Independent"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>Manager / Agent Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={repName}
                onChangeText={setRepName}
                placeholder="e.g. Jane Doe"
                placeholderTextColor={theme.textMuted || '#64748b'}
              />
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.completeBtn, { backgroundColor: theme.primary || '#f5a623' }]}
          onPress={handleSaveProfile}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.completeBtnText}>COMPLETE FILMROOM PROFILE ➔</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 60,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUploadText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleIndexBadge: {
    backgroundColor: '#000000',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  roleIndexText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  reorderContainer: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  reorderHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  reorderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  reorderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reorderIndex: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
  },
  reorderRoleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryTag: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryTagText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  reorderBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressiveCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  progressiveTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  countryScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  countryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  regionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  regionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationPreviewText: {
    fontSize: 11,
    marginTop: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dialCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  dialCodeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  repRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  repToggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  repDetailsCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  completeBtn: {
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  completeBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});