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
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DateRangePickerField, SingleDatePickerField } from './CinemaDatePicker';
import { uploadToCloudinary } from '../services/cloudinaryService';
import AddCrewRoleModal from './AddCrewRoleModal';

const POST_TYPES = [
  { key: 'CREW_CALL', title: 'Crew Call', icon: '🎥', desc: 'Hire crew and heads of department' },
  { key: 'CASTING_CALL', title: 'Casting Call', icon: '🎭', desc: 'Audition actors and talent' },
  { key: 'PRODUCTION_UPDATE', title: 'Production Update', icon: '📢', desc: 'Milestones, wraps, announcements' },
  { key: 'PROJECT', title: 'Project', icon: '🎬', desc: 'Announce or pitch a new production' },
  { key: 'OPPORTUNITY', title: 'Opportunity', icon: '✨', desc: 'Grants, fellowships, masterclasses' },
  { key: 'OTHER', title: 'Other', icon: '📁', desc: 'General cinema collaboration' },
];

const COMP_OPTIONS = ['Paid', 'Unpaid', 'Negotiable'];

export default function PostProductionCallModal({ visible, onClose, onPublished, callToEdit }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  // Step 1 (type selection) vs Step 2 (fill fields)
  const [selectedType, setSelectedType] = useState(null);

  // Common Fields
  const [lookingFor, setLookingFor] = useState('');
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [singleDate, setSingleDate] = useState(null);
  const [compensation, setCompensation] = useState('Paid');
  const [description, setDescription] = useState('');

  // Structured Crew Roles Required
  const [crewRolesRequired, setCrewRolesRequired] = useState([]);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);

  // Image upload
  const [attachedImageUri, setAttachedImageUri] = useState(null);
  const [attachedImageUrl, setAttachedImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [isPosting, setIsPosting] = useState(false);

  // Reset modal state on open/close or populate callToEdit
  useEffect(() => {
    if (visible && callToEdit) {
      setSelectedType(callToEdit.postType || 'CREW_CALL');
      setLookingFor(callToEdit.lookingFor || callToEdit.roleName || '');
      setProjectName(callToEdit.projectName || callToEdit.title || '');
      setLocation(callToEdit.location || '');
      setStartDate(callToEdit.startDate ? new Date(callToEdit.startDate) : null);
      setEndDate(callToEdit.endDate ? new Date(callToEdit.endDate) : null);
      setSingleDate(callToEdit.singleDate ? new Date(callToEdit.singleDate) : null);
      setCompensation(callToEdit.compensationTier || callToEdit.compensation || 'Paid');
      setDescription(callToEdit.description || callToEdit.logline || '');
      setCrewRolesRequired(callToEdit.crewRolesRequired || callToEdit.crewPositions || []);
      setAttachedImageUrl(callToEdit.imageUrl || null);
      setAttachedImageUri(null);
      setIsPosting(false);
    } else if (!visible) {
      setSelectedType(null);
      setLookingFor('');
      setProjectName('');
      setLocation('');
      setStartDate(null);
      setEndDate(null);
      setSingleDate(null);
      setCompensation('Paid');
      setDescription('');
      setCrewRolesRequired([]);
      setAttachedImageUri(null);
      setAttachedImageUrl(null);
      setIsUploadingImage(false);
      setIsPosting(false);
    }
  }, [visible, callToEdit]);

  // Handle image pick & upload to Cloudinary
  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera roll access is needed to attach an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedImageUri(asset.uri);
        setIsUploadingImage(true);

        const mediaRef = await uploadToCloudinary({
          fileUri: asset.uri,
          resourceType: 'image',
          fileName: asset.fileName || 'post_image.jpg',
          fileSize: asset.fileSize,
          folder: 'filmroom_posts',
        });

        setAttachedImageUrl(mediaRef.secureUrl);
      }
    } catch (err) {
      Alert.alert('Notice', err.message || 'Could not upload image to Cloudinary.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Publish to Firestore
  const handlePublish = async () => {
    if (!selectedType) return;

    if (selectedType === 'CREW_CALL') {
      if (crewRolesRequired.length === 0 && !lookingFor.trim()) {
        Alert.alert('Required', 'Please add at least one required crew role using "+ Add Role".');
        return;
      }
      if (!projectName.trim()) {
        Alert.alert('Required', 'Please specify the project name.');
        return;
      }
    }
    if (selectedType === 'CASTING_CALL' && (!lookingFor.trim() || !projectName.trim())) {
      Alert.alert('Required', 'Please specify the character/role and the project name.');
      return;
    }
    if (selectedType === 'PRODUCTION_UPDATE' && (!projectName.trim() || !description.trim())) {
      Alert.alert('Required', 'Please specify the project and your update message.');
      return;
    }

    setIsPosting(true);
    try {
      const typeConfig = POST_TYPES.find((t) => t.key === selectedType) || POST_TYPES[0];

      const primaryRoleTitle =
        crewRolesRequired.length > 0
          ? crewRolesRequired.map((r) => `${r.role} (${r.quantity})`).join(', ')
          : lookingFor.trim();

      const postData = {
        postType: selectedType,
        postTypeLabel: typeConfig.title,
        title: projectName.trim() || primaryRoleTitle,
        roleName: primaryRoleTitle || null,
        crewRolesRequired,
        neededRoles: crewRolesRequired.length > 0
          ? crewRolesRequired.map((r) => r.role)
          : (lookingFor.trim() ? [lookingFor.trim()] : []),
        location: location.trim() || 'Worldwide',
        startDate: startDate || singleDate || null,
        endDate: endDate || null,
        dates: startDate && endDate ? `${startDate} – ${endDate}` : (startDate || singleDate || 'TBD'),
        compensationTier: compensation,
        logline: description.trim() || '',
        description: description.trim() || '',
        imageUrl: attachedImageUrl || null,
        director: userProfile?.fullName || userProfile?.displayName || 'Filmmaker',
        createdBy: currentUser?.uid || 'guest',
        createdAt: serverTimestamp(),
      };

      if (callToEdit) {
        const updateData = {
          postType: selectedType,
          postTypeLabel: typeConfig.title,
          title: projectName.trim() || primaryRoleTitle,
          roleName: primaryRoleTitle || null,
          crewRolesRequired,
          neededRoles: crewRolesRequired.length > 0
            ? crewRolesRequired.map((r) => r.role)
            : (lookingFor.trim() ? [lookingFor.trim()] : []),
          location: location.trim() || 'Worldwide',
          startDate: startDate || singleDate || null,
          endDate: endDate || null,
          dates: startDate && endDate ? `${startDate} – ${endDate}` : (startDate || singleDate || 'TBD'),
          compensationTier: compensation,
          logline: description.trim() || '',
          description: description.trim() || '',
          imageUrl: attachedImageUrl || null,
          updatedAt: serverTimestamp(),
        };

        await updateDoc(doc(db, 'production_calls', callToEdit.id), updateData);
        Alert.alert('✓ Call Updated', 'Your crew call changes have been published to The Board.');
      } else {
        await addDoc(collection(db, 'production_calls'), postData);
        Alert.alert('✓ Published', 'Your post is now live on The Board!');
      }

      onClose();
      if (onPublished) onPublished();
    } catch (err) {
      Alert.alert('Publishing Error', err.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteCall = () => {
    if (!callToEdit?.id) return;
    Alert.alert(
      'Delete Crew Call',
      'Are you sure you want to permanently remove this crew call from The Board?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'production_calls', callToEdit.id));
              Alert.alert('✓ Deleted', 'Crew call removed from The Board.');
              onClose();
              if (onPublished) onPublished();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.modalHeading, { color: theme.text }]}>
                {callToEdit
                  ? 'EDIT CREW CALL'
                  : selectedType
                  ? POST_TYPES.find((t) => t.key === selectedType)?.title.toUpperCase()
                  : 'CREATE POST'}
              </Text>
              <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                {callToEdit
                  ? 'Modify roles, quantities, dates & specs'
                  : selectedType
                  ? 'Fill in relevant details below'
                  : 'What are you posting?'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── STEP 1: Post Type Picker ── */}
          {!selectedType && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.typeGrid}>
              {POST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                  onPress={() => setSelectedType(t.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeTitle, { color: theme.text }]}>{t.title}</Text>
                    <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>{t.desc}</Text>
                  </View>
                  <Text style={[styles.typeArrow, { color: theme.accent }]}>→</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── STEP 2: Relevant Fields Only ── */}
          {selectedType && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
              {/* Back to Type Picker */}
              <TouchableOpacity style={styles.backTypeLink} onPress={() => setSelectedType(null)}>
                <Text style={[styles.backTypeText, { color: theme.accent }]}>← Change Post Type</Text>
              </TouchableOpacity>

              {/* CREW CALL FIELDS */}
              {selectedType === 'CREW_CALL' && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CREW REQUIRED</Text>
                  {crewRolesRequired.length > 0 ? (
                    <View style={[styles.roleTable, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                      {crewRolesRequired.map((item, idx) => (
                        <View key={idx} style={[styles.roleTableRow, { borderBottomColor: theme.cardBorder }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.roleTableRole, { color: theme.text }]}>{item.role}</Text>
                            <Text style={{ color: theme.textMuted, fontSize: 11 }}>{item.category}</Text>
                          </View>
                          
                          {/* Quantity stepper */}
                          <View style={styles.roleTableQtyCol}>
                            <TouchableOpacity
                              style={[styles.smallQtyBtn, { borderColor: theme.cardBorder }]}
                              onPress={() => {
                                const copy = [...crewRolesRequired];
                                if (copy[idx].quantity > 1) {
                                  copy[idx].quantity -= 1;
                                  setCrewRolesRequired(copy);
                                }
                              }}
                            >
                              <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>−</Text>
                            </TouchableOpacity>
                            <Text style={[styles.roleTableQtyNum, { color: theme.primary }]}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={[styles.smallQtyBtn, { borderColor: theme.cardBorder }]}
                              onPress={() => {
                                const copy = [...crewRolesRequired];
                                copy[idx].quantity += 1;
                                setCrewRolesRequired(copy);
                              }}
                            >
                              <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>+</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Remove role */}
                          <TouchableOpacity
                            style={styles.removeRoleBtn}
                            onPress={() => {
                              setCrewRolesRequired(crewRolesRequired.filter((_, i) => i !== idx));
                            }}
                          >
                            <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 14 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.addRoleTriggerBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                    onPress={() => setIsAddRoleModalOpen(true)}
                  >
                    <Text style={[styles.addRoleTriggerText, { color: theme.primary }]}>+ Add Role</Text>
                  </TouchableOpacity>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>PROJECT</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="e.g. Neon Horizon"
                    placeholderTextColor={theme.textMuted}
                    value={projectName}
                    onChangeText={setProjectName}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>LOCATION</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="e.g. Goa, Mumbai, On Location"
                    placeholderTextColor={theme.textMuted}
                    value={location}
                    onChangeText={setLocation}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>DATES</Text>
                  <DateRangePickerField
                    fromLabel="From"
                    toLabel="To"
                    fromDate={startDate}
                    toDate={endDate}
                    onChangeDates={({ fromFormatted, toFormatted }) => {
                      setStartDate(fromFormatted);
                      setEndDate(toFormatted);
                    }}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>COMPENSATION</Text>
                  <View style={styles.compRow}>
                    {COMP_OPTIONS.map((c) => {
                      const isSelected = compensation === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.compChip,
                            {
                              backgroundColor: isSelected ? theme.accent : theme.background,
                              borderColor: isSelected ? theme.accent : theme.cardBorder,
                            },
                          ]}
                          onPress={() => setCompensation(c)}
                        >
                          <Text style={[styles.compChipText, { color: isSelected ? '#000000' : theme.textSecondary }]}>
                            {c}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>DESCRIPTION / SPECIFICS</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="Describe the production, camera package, or style required..."
                    placeholderTextColor={theme.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {/* CASTING CALL FIELDS */}
              {selectedType === 'CASTING_CALL' && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ROLE / CHARACTER</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="e.g. Lead Detective (30–40s), Supporting Antagonist"
                    placeholderTextColor={theme.textMuted}
                    value={lookingFor}
                    onChangeText={setLookingFor}
                    autoFocus
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>PROJECT</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="e.g. Whispers of the Coast"
                    placeholderTextColor={theme.textMuted}
                    value={projectName}
                    onChangeText={setProjectName}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>LOCATION</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="e.g. London / Studio / Remote"
                    placeholderTextColor={theme.textMuted}
                    value={location}
                    onChangeText={setLocation}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>AUDITION / SHOOT DATES</Text>
                  <DateRangePickerField
                    fromLabel="Audition / Start"
                    toLabel="Wrap"
                    fromDate={startDate}
                    toDate={endDate}
                    onChangeDates={({ fromFormatted, toFormatted }) => {
                      setStartDate(fromFormatted);
                      setEndDate(toFormatted);
                    }}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>COMPENSATION</Text>
                  <View style={styles.compRow}>
                    {COMP_OPTIONS.map((c) => {
                      const isSelected = compensation === c;
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.compChip,
                            {
                              backgroundColor: isSelected ? theme.accent : theme.background,
                              borderColor: isSelected ? theme.accent : theme.cardBorder,
                            },
                          ]}
                          onPress={() => setCompensation(c)}
                        >
                          <Text style={[styles.compChipText, { color: isSelected ? '#000000' : theme.textSecondary }]}>
                            {c}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>CHARACTER BREAKDOWN</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="Describe character motivations, demeanor, accent, or background..."
                    placeholderTextColor={theme.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {/* PRODUCTION UPDATE / PROJECT / OTHER FIELDS */}
              {(selectedType === 'PRODUCTION_UPDATE' || selectedType === 'PROJECT' || selectedType === 'OPPORTUNITY' || selectedType === 'OTHER') && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PROJECT OR TITLE</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="e.g. Apex Drift — Episode 1"
                    placeholderTextColor={theme.textMuted}
                    value={projectName}
                    onChangeText={setProjectName}
                    autoFocus
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>HEADLINE</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="e.g. Principal Photography Wrapped in Goa!"
                    placeholderTextColor={theme.textMuted}
                    value={lookingFor}
                    onChangeText={setLookingFor}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>DETAILS</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder="Share progress, announcements, release dates, or opportunities..."
                    placeholderTextColor={theme.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>DATE / DEADLINE (OPTIONAL)</Text>
                  <SingleDatePickerField
                    label=""
                    value={singleDate}
                    onChangeDate={(fmt) => setSingleDate(fmt)}
                    placeholder="Select Date (Optional)"
                  />
                </>
              )}

              {/* ADD IMAGE? (Optional for all post types) */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>ADD IMAGE?</Text>
              {attachedImageUri || attachedImageUrl ? (
                <View style={styles.imagePreviewRow}>
                  <Image source={{ uri: attachedImageUri || attachedImageUrl }} style={styles.thumbImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={[styles.removeImageBtn, { borderColor: theme.danger || '#f87171' }]}
                    onPress={() => {
                      setAttachedImageUri(null);
                      setAttachedImageUrl(null);
                    }}
                  >
                    <Text style={{ color: theme.danger || '#f87171', fontSize: 12, fontWeight: '700' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.chooseImgBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                  onPress={handlePickImage}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <Text style={[styles.chooseImgText, { color: theme.text }]}>🖼 Choose Image</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.postButton, { backgroundColor: theme.accent }]}
                onPress={handlePublish}
                disabled={isPosting}
                activeOpacity={0.8}
              >
                {isPosting ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.postButtonText}>{callToEdit ? 'Save Changes' : 'Post'}</Text>
                )}
              </TouchableOpacity>

              {callToEdit && (
                <TouchableOpacity
                  style={[styles.deleteCallBtn, { borderColor: theme.danger || '#f87171' }]}
                  onPress={handleDeleteCall}
                  disabled={isPosting}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: theme.danger || '#f87171', fontWeight: '800', fontSize: 13 }}>
                    🗑 Delete Crew Call
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Structured Add Crew Role Modal */}
      <AddCrewRoleModal
        visible={isAddRoleModalOpen}
        onClose={() => setIsAddRoleModalOpen(false)}
        onAddRole={(newRole) => {
          setCrewRolesRequired((prev) => [...prev, newRole]);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  typeGrid: {
    paddingVertical: 10,
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  typeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  typeArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  formContent: {
    paddingBottom: 24,
  },
  backTypeLink: {
    marginBottom: 14,
    paddingVertical: 4,
  },
  backTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  compRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  compChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chooseImgBtn: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  chooseImgText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  postButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  deleteCallBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  postButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  roleTable: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  roleTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  roleTableRole: {
    fontSize: 13,
    fontWeight: '700',
  },
  roleTableQtyCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 10,
  },
  smallQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTableQtyNum: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  removeRoleBtn: {
    padding: 6,
  },
  addRoleTriggerBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 12,
  },
  addRoleTriggerText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});