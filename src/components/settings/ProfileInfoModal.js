import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
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
  AVAILABILITY_CONFIG,
} from '../../config/rolesConfig';
import { COUNTRIES, formatLocationDisplay } from '../../data/countriesAndRegions';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { checkUsernameAvailability, updateUserUsername } from '../../services/userService';
import { validateUsernameFormat } from '../../utils/validation';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';

const GENDER_OPTIONS = ['Female', 'Male', 'Non-Binary', 'Prefer not to say', 'Other'];

export default function ProfileInfoModal({ visible, onClose }) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useModal();

  // Basic Identity
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState('IDLE');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [photoURL, setPhotoURL] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Ordered Roles
  const [selectedRoles, setSelectedRoles] = useState(['Director']);

  // Country & State / Region
  const [countryCode, setCountryCode] = useState('IN');
  const [stateRegion, setStateRegion] = useState('Goa');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Portfolio & Reel
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [showreelUrl, setShowreelUrl] = useState('');
  const [languages, setLanguages] = useState('English');

  // Availability
  const [availStatus, setAvailStatus] = useState(AVAILABILITY_STATUS.AVAILABLE);
  const [availFromDate, setAvailFromDate] = useState('');

  // Representation
  const [isRepresented, setIsRepresented] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeCountry =
    COUNTRIES.find((c) => c.code === countryCode) ||
    COUNTRIES.find((c) => c.name.toLowerCase() === (userProfile?.country || '').toLowerCase()) ||
    COUNTRIES[0];

  useEffect(() => {
    if (visible && userProfile) {
      setFullName(userProfile.fullName || userProfile.displayName || '');
      setUsername(userProfile.username || '');
      setUsernameState('IDLE');
      setUsernameMessage('');
      setBio(userProfile.bio || '');
      setGender(userProfile.gender || 'Prefer not to say');
      setPhotoURL(userProfile.photoURL || currentUser?.photoURL || null);

      const roles = Array.isArray(userProfile.roles) && userProfile.roles.length > 0
        ? userProfile.roles
        : userProfile.role
        ? [userProfile.role]
        : ['Director'];
      setSelectedRoles(roles);

      // Resolve Country
      const matchedCountry =
        COUNTRIES.find((c) => c.code === userProfile.countryCode) ||
        COUNTRIES.find((c) => c.name.toLowerCase() === (userProfile.country || '').toLowerCase()) ||
        COUNTRIES[0];
      setCountryCode(matchedCountry.code);
      setStateRegion(userProfile.stateRegion || matchedCountry.regions[0] || '');
      setPhoneNumber(userProfile.phone || '');

      setPortfolioUrl(userProfile.portfolioUrl || '');
      setShowreelUrl(userProfile.showreelUrl || '');
      setLanguages(
        Array.isArray(userProfile.languages)
          ? userProfile.languages.join(', ')
          : userProfile.languages || 'English'
      );

      // Availability
      if (userProfile.availability) {
        if (typeof userProfile.availability === 'object') {
          setAvailStatus(userProfile.availability.status || AVAILABILITY_STATUS.AVAILABLE);
          setAvailFromDate(userProfile.availability.availableFromDate || '');
        } else if (typeof userProfile.availability === 'string') {
          setAvailStatus(userProfile.availability);
        }
      }

      // Representation
      const rep = userProfile.representation || {};
      setIsRepresented(!!rep.isRepresented);
      setAgencyName(rep.agencyName || '');
      setManagerName(rep.managerName || '');
      setManagerEmail(rep.managerEmail || '');

      setHasChanges(false);
    }
  }, [visible, userProfile]);

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({ type: 'warning', message: 'Camera roll access is needed to update your profile photo.' });
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
        setIsUploadingPhoto(true);

        const uploadRes = await uploadToCloudinary({
          fileUri: asset.uri,
          resourceType: 'image',
          fileName: asset.fileName || 'profile_avatar.jpg',
          fileSize: asset.fileSize,
          folder: 'filmroom_avatars',
        });

        setPhotoURL(uploadRes.secureUrl);
        setHasChanges(true);

        if (currentUser?.uid) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            photoURL: uploadRes.secureUrl,
            updatedAt: serverTimestamp(),
          }).catch(console.warn);
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: uploadRes.secureUrl }).catch(() => {});
          }
        }

        showToast({ type: 'success', message: 'Profile photo updated' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not upload photo.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const toggleRole = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      if (selectedRoles.length === 1) {
        showToast({ type: 'warning', message: 'You must maintain at least one primary role.' });
        return;
      }
      setSelectedRoles((prev) => prev.filter((r) => r !== roleId));
    } else {
      setSelectedRoles((prev) => [...prev, roleId]);
    }
    setHasChanges(true);
  };

  const handleCancel = () => {
    if (hasChanges) {
      showConfirm({
        title: 'Discard Changes?',
        message: 'You have unsaved edits to your profile. Do you want to discard them?',
        confirmText: 'Discard',
        cancelText: 'Keep Editing',
        isDestructive: true,
        onConfirm: () => {
          setHasChanges(false);
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      showToast({ type: 'warning', message: 'Please enter your professional name.' });
      return;
    }
    if (selectedRoles.length === 0) {
      showToast({ type: 'warning', message: 'Please specify at least one professional role.' });
      return;
    }

    setIsSaving(true);
    try {
      // Process username update if changed
      const cleanUsername = username.trim().replace(/^@+/, '');
      const currentUsername = (userProfile?.username || '').trim().replace(/^@+/, '');
      if (cleanUsername && cleanUsername.toLowerCase() !== currentUsername.toLowerCase()) {
        const uVal = validateUsernameFormat(cleanUsername);
        if (!uVal.isValid) {
          Alert.alert('Invalid Username', uVal.error || 'Please enter a valid username.');
          setIsSaving(false);
          return;
        }
        try {
          await updateUserUsername({
            uid: currentUser.uid,
            oldUsername: currentUsername,
            newUsername: cleanUsername,
          });
        } catch (uErr) {
          Alert.alert('Username Error', uErr.message || 'Could not update username.');
          setIsSaving(false);
          return;
        }
      }

      const primaryRole = selectedRoles[0];
      const secondaryRoles = selectedRoles.slice(1);
      const roleConfig = CORE_PROFESSIONAL_ROLES.find((r) => r.id === primaryRole);

      const languagesList = languages
        ? languages.split(',').map((l) => l.trim()).filter(Boolean)
        : ['English'];

      const locationStr = formatLocationDisplay(stateRegion, activeCountry.name);

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        fullName: fullName.trim(),
        displayName: fullName.trim(),
        professionalName: fullName.trim(),
        gender: gender || null,
        primaryRole,
        secondaryRoles,
        roles: selectedRoles,
        role: primaryRole,
        category: roleConfig?.category || 'TALENT',
        department: roleConfig?.department || 'Production',
        isActor: selectedRoles.includes('Actor'),
        country: activeCountry.name,
        countryCode: activeCountry.code,
        stateRegion,
        location: locationStr,
        phone: phoneNumber.trim(),
        phoneCountryCode: activeCountry.dialCode,
        languages: languagesList,
        bio: bio.trim(),
        photoURL: photoURL || null,
        portfolioUrl: portfolioUrl.trim() || null,
        showreelUrl: showreelUrl.trim() || null,
        availability: {
          status: availStatus,
          availableFromDate:
            availStatus === AVAILABILITY_STATUS.AVAILABLE_FROM
              ? availFromDate.trim()
              : null,
        },
        isAvailable: availStatus === AVAILABILITY_STATUS.AVAILABLE,
        representation: {
          isRepresented,
          agencyName: isRepresented ? agencyName.trim() : null,
          managerName: isRepresented ? managerName.trim() : null,
          managerEmail: isRepresented ? managerEmail.trim() : null,
          managerUid: null,
        },
        updatedAt: serverTimestamp(),
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: photoURL || null,
          displayName: fullName.trim() || auth.currentUser.displayName,
        }).catch(() => {});
      }

      setHasChanges(false);
      showToast({ type: 'success', message: 'Profile dossier updated successfully' });
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <View style={[styles.topBar, { borderBottomColor: theme.cardBorder || '#242830' }]}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary || '#9ca3af' }]}>Cancel</Text>
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: theme.text || '#ffffff' }]}>PROFILE & IDENTITY</Text>

            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveBtn}>
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.primary || '#f5a623'} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.primary || '#f5a623' }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* Photo Avatar */}
            <View style={styles.avatarRow}>
              <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarBox} disabled={isUploadingPhoto}>
                {photoURL ? (
                  <Image source={{ uri: photoURL }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarInitial, { color: theme.primary || '#f5a623' }]}>
                    {fullName[0]?.toUpperCase() || 'F'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickPhoto} style={styles.changePhotoBtn} disabled={isUploadingPhoto}>
                <Text style={[styles.changePhotoText, { color: theme.primary || '#f5a623' }]}>
                  {isUploadingPhoto ? 'Uploading...' : 'Change Profile Photo 📷'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={fullName}
                onChangeText={(t) => {
                  setFullName(t);
                  setHasChanges(true);
                }}
              />
            </View>

            {/* Username Field with Availability Check */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af', marginBottom: 0 }]}>
                  FilmRoom Username
                </Text>
                {userProfile?.filmRoomId && (
                  <Text style={{ fontSize: 11, color: theme.primary || '#f5a623', fontWeight: '800' }}>
                    {userProfile.filmRoomId}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      backgroundColor: theme.surface || '#121417',
                      color: theme.text || '#ffffff',
                      borderColor:
                        usernameState === 'AVAILABLE'
                          ? '#22c55e'
                          : usernameState === 'TAKEN' || usernameState === 'INVALID'
                          ? '#ef4444'
                          : theme.cardBorder || '#242830',
                    },
                  ]}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setHasChanges(true);
                    setUsernameState('IDLE');
                    setUsernameMessage('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="e.g. chris_nolan"
                  placeholderTextColor={theme.textMuted || '#64748b'}
                />
                {username.trim().toLowerCase().replace(/^@+/, '') !== (userProfile?.username || '').toLowerCase() && (
                  <TouchableOpacity
                    style={{
                      height: 44,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: theme.primary || '#f5a623',
                      borderColor: theme.cardBorder || '#242830',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={async () => {
                      const trimmed = username.trim().replace(/^@+/, '');
                      const val = validateUsernameFormat(trimmed);
                      if (!val.isValid) {
                        setUsernameState('INVALID');
                        setUsernameMessage(val.error);
                        return;
                      }
                      setUsernameState('CHECKING');
                      const res = await checkUsernameAvailability(trimmed);
                      if (res.available) {
                        setUsernameState('AVAILABLE');
                        setUsernameMessage('✓ Username available');
                      } else {
                        setUsernameState('TAKEN');
                        setUsernameMessage(res.message);
                      }
                    }}
                    disabled={usernameState === 'CHECKING'}
                  >
                    {usernameState === 'CHECKING' ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text style={{ color: '#000000', fontWeight: '800', fontSize: 12 }}>
                        {usernameState === 'AVAILABLE' ? '✓ Verified' : 'Check'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {usernameMessage.length > 0 && (
                <Text
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    fontWeight: '600',
                    color: usernameState === 'AVAILABLE' ? '#22c55e' : '#ef4444',
                  }}
                >
                  {usernameMessage}
                </Text>
              )}
            </View>

            {/* Bio */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Bio</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={bio}
                onChangeText={(t) => {
                  setBio(t);
                  setHasChanges(true);
                }}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Gender (Optional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {GENDER_OPTIONS.map((g) => {
                  const isSel = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.itemPill,
                        {
                          backgroundColor: isSel ? theme.primary || '#f5a623' : theme.surface || '#121417',
                          borderColor: isSel ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                        },
                      ]}
                      onPress={() => {
                        setGender(g);
                        setHasChanges(true);
                      }}
                    >
                      <Text style={{ color: isSel ? '#000000' : theme.text || '#ffffff', fontSize: 12, fontWeight: '700' }}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Ordered Roles */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                Professional Roles (1st = Primary Role)
              </Text>
              <View style={styles.rolesGrid}>
                {CORE_PROFESSIONAL_ROLES.map((r) => {
                  const isSel = selectedRoles.includes(r.id);
                  const idx = selectedRoles.indexOf(r.id);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: isSel ? theme.primary || '#f5a623' : theme.surface || '#121417',
                          borderColor: isSel ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                        },
                      ]}
                      onPress={() => toggleRole(r.id)}
                    >
                      <Text style={{ fontSize: 12, marginRight: 4 }}>{r.icon}</Text>
                      <Text style={[styles.roleChipText, { color: isSel ? '#000000' : theme.text || '#ffffff' }]}>
                        {r.label}
                      </Text>
                      {isSel && (
                        <View style={styles.roleIndexBadge}>
                          <Text style={styles.roleIndexText}>{idx + 1}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Reordering list */}
              {selectedRoles.map((roleId, idx) => {
                const isPrimary = idx === 0;
                return (
                  <View
                    key={roleId}
                    style={[styles.reorderRow, { backgroundColor: theme.surface || '#121417', borderColor: isPrimary ? theme.primary || '#f5a623' : theme.cardBorder || '#242830' }]}
                  >
                    <Text style={[styles.reorderText, { color: theme.text || '#ffffff' }]}>
                      {idx + 1}. {roleId} {isPrimary ? '★ PRIMARY' : ''}
                    </Text>
                    <View style={styles.reorderBtns}>
                      {idx > 0 && (
                        <TouchableOpacity
                          style={styles.arrowBtn}
                          onPress={() => {
                            setSelectedRoles(reorderRoles.moveUp(selectedRoles, idx));
                            setHasChanges(true);
                          }}
                        >
                          <Text style={{ color: theme.text || '#fff', fontSize: 11 }}>▲</Text>
                        </TouchableOpacity>
                      )}
                      {idx < selectedRoles.length - 1 && (
                        <TouchableOpacity
                          style={styles.arrowBtn}
                          onPress={() => {
                            setSelectedRoles(reorderRoles.moveDown(selectedRoles, idx));
                            setHasChanges(true);
                          }}
                        >
                          <Text style={{ color: theme.text || '#fff', fontSize: 11 }}>▼</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Country & State/Region Hierarchical Selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Country</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollList}>
                {COUNTRIES.map((c) => {
                  const isSel = c.code === countryCode;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[
                        styles.itemPill,
                        {
                          backgroundColor: isSel ? theme.primary || '#f5a623' : theme.surface || '#121417',
                          borderColor: isSel ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                        },
                      ]}
                      onPress={() => {
                        setCountryCode(c.code);
                        setStateRegion(c.regions[0] || '');
                        setHasChanges(true);
                      }}
                    >
                      <Text style={{ fontSize: 13, marginRight: 4 }}>{c.flag}</Text>
                      <Text style={{ color: isSel ? '#000000' : theme.text || '#ffffff', fontSize: 12, fontWeight: '700' }}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>State / Region</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollList}>
                {activeCountry.regions.map((reg) => {
                  const isSel = reg === stateRegion;
                  return (
                    <TouchableOpacity
                      key={reg}
                      style={[
                        styles.itemPill,
                        {
                          backgroundColor: isSel ? theme.primary || '#f5a623' : theme.surface || '#121417',
                          borderColor: isSel ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                        },
                      ]}
                      onPress={() => {
                        setStateRegion(reg);
                        setHasChanges(true);
                      }}
                    >
                      <Text style={{ color: isSel ? '#000000' : theme.text || '#ffffff', fontSize: 12, fontWeight: '700' }}>
                        {reg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.previewLocation, { color: theme.textMuted || '#64748b' }]}>
                Public location: 📍 {formatLocationDisplay(stateRegion, activeCountry.name)}
              </Text>
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={[styles.dialBox, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                  <Text style={{ fontSize: 14 }}>{activeCountry.flag}</Text>
                  <Text style={[styles.dialText, { color: theme.primary || '#f5a623' }]}>
                    {activeCountry.dialCode}
                  </Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                  value={phoneNumber}
                  onChangeText={(t) => {
                    setPhoneNumber(t);
                    setHasChanges(true);
                  }}
                  keyboardType="phone-pad"
                  placeholder="9876543210"
                  placeholderTextColor={theme.textMuted || '#64748b'}
                />
              </View>
            </View>

            {/* Showreel */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Showreel URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface || '#121417', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                value={showreelUrl}
                onChangeText={(t) => {
                  setShowreelUrl(t);
                  setHasChanges(true);
                }}
                placeholder="https://vimeo.com/..."
                placeholderTextColor={theme.textMuted || '#64748b'}
                autoCapitalize="none"
              />
            </View>

            {/* Availability */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Availability Status</Text>
              <View style={styles.availGrid}>
                {Object.values(AVAILABILITY_CONFIG).map((cfg) => {
                  const isSel = cfg.key === availStatus;
                  return (
                    <TouchableOpacity
                      key={cfg.key}
                      style={[
                        styles.availChip,
                        {
                          backgroundColor: isSel ? cfg.bgColor : theme.surface || '#121417',
                          borderColor: isSel ? cfg.color : theme.cardBorder || '#242830',
                        },
                      ]}
                      onPress={() => {
                        setAvailStatus(cfg.key);
                        setHasChanges(true);
                      }}
                    >
                      <Text style={{ fontSize: 13, marginRight: 4 }}>{cfg.icon}</Text>
                      <Text style={{ color: isSel ? cfg.color : theme.text || '#ffffff', fontSize: 12, fontWeight: '700' }}>
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Representation */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Representation</Text>
              <View style={styles.repRow}>
                <TouchableOpacity
                  style={[
                    styles.repBtn,
                    {
                      backgroundColor: !isRepresented ? theme.primary || '#f5a623' : theme.surface || '#121417',
                      borderColor: !isRepresented ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                    },
                  ]}
                  onPress={() => {
                    setIsRepresented(false);
                    setHasChanges(true);
                  }}
                >
                  <Text style={{ color: !isRepresented ? '#000' : theme.text || '#fff', fontWeight: '700' }}>
                    Self Represented
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.repBtn,
                    {
                      backgroundColor: isRepresented ? theme.primary || '#f5a623' : theme.surface || '#121417',
                      borderColor: isRepresented ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                    },
                  ]}
                  onPress={() => {
                    setIsRepresented(true);
                    setHasChanges(true);
                  }}
                >
                  <Text style={{ color: isRepresented ? '#000' : theme.text || '#fff', fontWeight: '700' }}>
                    Agency / Manager
                  </Text>
                </TouchableOpacity>
              </View>

              {isRepresented && (
                <View style={[styles.repBox, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Agency Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830', marginBottom: 10 }]}
                    value={agencyName}
                    onChangeText={(t) => {
                      setAgencyName(t);
                      setHasChanges(true);
                    }}
                    placeholder="e.g. CAA / Independent"
                    placeholderTextColor={theme.textMuted || '#64748b'}
                  />
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Manager / Agent Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                    value={managerName}
                    onChangeText={(t) => {
                      setManagerName(t);
                      setHasChanges(true);
                    }}
                    placeholder="e.g. Sarah Jenkins"
                    placeholderTextColor={theme.textMuted || '#64748b'}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f5a623',
    backgroundColor: '#121417',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '900',
  },
  changePhotoBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleIndexBadge: {
    backgroundColor: '#000',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  roleIndexText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  reorderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reorderBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#242830',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollList: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  previewLocation: {
    fontSize: 11,
    marginTop: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  dialText: {
    fontSize: 13,
    fontWeight: '800',
  },
  phoneInput: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  availGrid: {
    gap: 6,
  },
  availChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  repRow: {
    flexDirection: 'row',
    gap: 8,
  },
  repBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  repBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
