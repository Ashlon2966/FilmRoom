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
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import { DateRangePickerField } from './CinemaDatePicker';
import { uploadToCloudinary } from '../services/cloudinaryService';

const PROJECT_TYPES = [
  'Short Film',
  'Feature',
  'Series',
  'Music Video',
  'Commercial',
  'Documentary',
  'Other',
];

const ROOM_VISIBILITY_OPTIONS = [
  { key: 'PUBLIC', label: 'Public', desc: 'Discoverable across FilmRoom directory & The Board' },
  { key: 'MEMBERS', label: 'FilmRoom Members', desc: 'Visible only to signed-in FilmRoom members' },
  { key: 'INVITED', label: 'Invited People', desc: 'Accessible only to invited collaborators' },
  { key: 'PRIVATE', label: 'Private', desc: 'Strictly confidential to room personnel' },
];

export default function EditRoomModal({ visible, roomId, roomData, onClose, onUpdated, onDeleted }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { showConfirm } = useModal();

  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState('Short Film');
  const [logline, setLogline] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [shootStartDate, setShootStartDate] = useState(null);
  const [shootEndDate, setShootEndDate] = useState(null);
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [roomStatus, setRoomStatus] = useState('ACTIVE');

  // Crew Requirements
  const [crewRequirements, setCrewRequirements] = useState([]);
  const [newRoleDept, setNewRoleDept] = useState('Camera');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleQty, setNewRoleQty] = useState(1);

  const [posterUri, setPosterUri] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);
  const [posterMetadata, setPosterMetadata] = useState(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check authorization: creator, owner, or manager
  const userAccess =
    roomData?.members?.[currentUser?.uid]?.roomAccess ||
    (roomData?.creatorId === currentUser?.uid ? 'Owner' : 'Crew');
  const canEdit =
    roomData?.creatorId === currentUser?.uid ||
    userAccess === 'Owner' ||
    userAccess === 'Manager';

  useEffect(() => {
    if (visible && roomData) {
      setTitle(roomData.title || '');
      setProjectType(roomData.projectType || 'Short Film');
      setLogline(roomData.logline || '');
      setSynopsis(roomData.synopsis || roomData.description || '');
      setShootStartDate(roomData.shootStartDate ? new Date(roomData.shootStartDate) : null);
      setShootEndDate(roomData.shootEndDate ? new Date(roomData.shootEndDate) : null);
      setLocation(roomData.location || '');
      setVisibility(roomData.visibility || 'PUBLIC');
      setRoomStatus(roomData.status || 'ACTIVE');
      setCrewRequirements(roomData.crewRequirements || []);
      setPosterUrl(roomData.posterUrl || null);
      setPosterMetadata(roomData.posterMetadata || null);
      setPosterUri(null);
    }
  }, [visible, roomData]);

  const handlePickPoster = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({ type: 'warning', message: 'Camera roll access is needed to select a project poster.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPosterUri(asset.uri);
        setIsUploadingPoster(true);

        const mediaRef = await uploadToCloudinary({
          fileUri: asset.uri,
          resourceType: 'image',
          fileName: asset.fileName || `${title || 'project'}_poster.jpg`,
          fileSize: asset.fileSize,
          folder: 'filmroom_posters',
        });

        setPosterUrl(mediaRef.secureUrl);
        setPosterMetadata(mediaRef);
        showToast({ type: 'success', message: 'Poster uploaded successfully' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not upload poster.' });
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleAddRequirement = () => {
    if (!newRoleTitle.trim()) {
      showToast({ type: 'warning', message: 'Please enter a craft title.' });
      return;
    }
    const newReq = {
      id: Date.now().toString(),
      department: newRoleDept,
      role: newRoleTitle.trim(),
      quantity: Math.max(1, parseInt(newRoleQty, 10) || 1),
      requirement: '',
    };
    setCrewRequirements((prev) => [...prev, newReq]);
    setNewRoleTitle('');
    setNewRoleQty(1);
    showToast({ type: 'info', message: `Added ${newReq.role} to crew requirements` });
  };

  const handleRemoveRequirement = (id) => {
    setCrewRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveRoom = async () => {
    if (!title.trim()) {
      showToast({ type: 'warning', message: 'Please enter a production title.' });
      return;
    }

    setIsSaving(true);
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const updatePayload = {
        title: title.trim(),
        projectType,
        logline: logline.trim() || null,
        synopsis: synopsis.trim() || null,
        shootStartDate: shootStartDate ? shootStartDate.toISOString().split('T')[0] : null,
        shootEndDate: shootEndDate ? shootEndDate.toISOString().split('T')[0] : null,
        location: location.trim() || null,
        visibility,
        status: roomStatus,
        crewRequirements,
        updatedAt: serverTimestamp(),
      };

      if (posterUrl) {
        updatePayload.posterUrl = posterUrl;
        updatePayload.posterMetadata = posterMetadata;
      }

      await updateDoc(roomRef, updatePayload);

      showToast({ type: 'success', title: 'Room Updated', message: 'Changes have been committed to this production.' });
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    const isArchived = roomStatus === 'ARCHIVED';
    const newStatus = isArchived ? 'ACTIVE' : 'ARCHIVED';
    showConfirm({
      title: isArchived ? 'Restore Room?' : 'Archive Room?',
      description: isArchived
        ? 'Restore this production room to active status?'
        : 'Archiving hides the room from active production lists without deleting its assets or slate data.',
      confirmLabel: isArchived ? 'Restore Room' : 'Archive Room',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'rooms', roomId), {
            status: newStatus,
            updatedAt: serverTimestamp(),
          });
          setRoomStatus(newStatus);
          if (onUpdated) onUpdated();
          showToast({ type: 'info', message: `Production Room is now ${newStatus.toLowerCase()}.` });
        } catch (err) {
          showToast({ type: 'error', message: err.message || 'Action failed.' });
        }
      },
    });
  };

  const handleDeleteRoom = () => {
    showConfirm({
      title: 'Delete Production Room?',
      description: `This action cannot be easily undone. All slate takes, stage assets, and production notes for "${title}" will be permanently removed.`,
      confirmLabel: 'Delete Room',
      cancelLabel: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'rooms', roomId));
          showToast({ type: 'info', title: 'Room Deleted', message: 'Production room has been permanently removed.' });
          if (onDeleted) onDeleted();
          onClose();
        } catch (err) {
          showToast({ type: 'error', message: err.message || 'Failed to delete room.' });
        }
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <View style={[styles.topBar, { borderBottomColor: theme.cardBorder }]}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: theme.text }]}>EDIT PRODUCTION ROOM</Text>

            <TouchableOpacity onPress={handleSaveRoom} disabled={isSaving || !canEdit}>
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.saveBtnText, { color: canEdit ? theme.primary : theme.textMuted }]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* 1. Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>PROJECT TITLE *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                value={title}
                onChangeText={setTitle}
                editable={canEdit}
              />
            </View>

            {/* 2. Format */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>FORMAT</Text>
              <View style={styles.chipRow}>
                {PROJECT_TYPES.map((pt) => {
                  const isSelected = projectType === pt;
                  return (
                    <TouchableOpacity
                      key={pt}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.surface,
                          borderColor: isSelected ? theme.primary : theme.cardBorder,
                        },
                      ]}
                      onPress={() => canEdit && setProjectType(pt)}
                      disabled={!canEdit}
                    >
                      <Text style={{ color: isSelected ? '#000000' : theme.textSecondary, fontSize: 12, fontWeight: '700' }}>
                        {pt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Visibility (Section 10) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.primary }]}>ROOM VISIBILITY</Text>
              <View style={styles.visCol}>
                {ROOM_VISIBILITY_OPTIONS.map((opt) => {
                  const isSel = visibility === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.visItem,
                        {
                          backgroundColor: isSel ? '#242016' : theme.surface,
                          borderColor: isSel ? theme.primary : theme.cardBorder,
                        },
                      ]}
                      onPress={() => canEdit && setVisibility(opt.key)}
                      disabled={!canEdit}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: isSel ? theme.primary : theme.text, fontWeight: '800', fontSize: 13 }}>
                          {opt.label}
                        </Text>
                        {isSel && <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 11 }}>Active</Text>}
                      </View>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Dates & Location */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>PRODUCTION DATES</Text>
              <DateRangePickerField
                fromLabel="Start Date"
                toLabel="Wrap Date"
                fromDate={shootStartDate}
                toDate={shootEndDate}
                onFromDateChange={setShootStartDate}
                onToDateChange={setShootEndDate}
                disabled={!canEdit}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>LOCATION</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Goa, India"
                placeholderTextColor={theme.textMuted}
                editable={canEdit}
              />
            </View>

            {/* 5. Logline & Synopsis */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>LOGLINE</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                value={logline}
                onChangeText={setLogline}
                placeholder="Summary hook..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                editable={canEdit}
              />
            </View>

            {/* 6. Crew Requirements (Section 12) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.primary }]}>CREW REQUIREMENTS</Text>
              {crewRequirements.map((req) => (
                <View
                  key={req.id}
                  style={[styles.reqRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '800' }}>
                      {req.department.toUpperCase()}
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>
                      {req.role} — <Text style={{ color: theme.primary }}>{req.quantity} needed</Text>
                    </Text>
                  </View>
                  {canEdit && (
                    <TouchableOpacity onPress={() => handleRemoveRequirement(req.id)} style={{ padding: 6 }}>
                      <Text style={{ color: '#f87171', fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {canEdit && (
                <View style={[styles.addReqBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '800', marginBottom: 8 }}>
                    + ADD REQUIREMENT
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={[styles.inputSm, { flex: 2, backgroundColor: theme.card, color: theme.text, borderColor: theme.cardBorder }]}
                      placeholder="Craft title (e.g. Gaffer)"
                      placeholderTextColor={theme.textMuted}
                      value={newRoleTitle}
                      onChangeText={setNewRoleTitle}
                    />
                    <TextInput
                      style={[styles.inputSm, { flex: 1, backgroundColor: theme.card, color: theme.text, borderColor: theme.cardBorder, textAlign: 'center' }]}
                      placeholder="Qty"
                      placeholderTextColor={theme.textMuted}
                      value={newRoleQty.toString()}
                      onChangeText={(t) => setNewRoleQty(Math.max(1, parseInt(t, 10) || 1))}
                      keyboardType="number-pad"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.addReqBtn, { backgroundColor: theme.primary }]}
                    onPress={handleAddRequirement}
                  >
                    <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>Add Role</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 7. Poster */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>PROJECT POSTER</Text>
              <View style={styles.posterRow}>
                {posterUri || posterUrl ? (
                  <Image source={{ uri: posterUri || posterUrl }} style={styles.posterImg} />
                ) : (
                  <View style={[styles.posterPlaceholder, { backgroundColor: theme.surface }]}>
                    <Text style={{ fontSize: 24 }}>🎬</Text>
                  </View>
                )}
                {canEdit && (
                  <TouchableOpacity
                    style={[styles.posterBtn, { borderColor: theme.primary }]}
                    onPress={handlePickPoster}
                    disabled={isUploadingPoster}
                  >
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>
                      {isUploadingPoster ? 'Uploading...' : 'Change Poster 📷'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 8. Danger Zone: Archive / Delete */}
            {canEdit && (
              <View style={[styles.dangerZone, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 10 }}>
                  PRODUCTION LIFECYCLE
                </Text>

                <TouchableOpacity
                  style={[styles.actionRowBtn, { borderColor: theme.cardBorder }]}
                  onPress={handleToggleArchive}
                >
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                    {roomStatus === 'ARCHIVED' ? 'Restore Active Status' : 'Archive Production Room'}
                  </Text>
                </TouchableOpacity>

                {roomData?.creatorId === currentUser?.uid && (
                  <TouchableOpacity
                    style={[styles.actionRowBtn, { borderColor: '#b91c1c', marginTop: 10 }]}
                    onPress={handleDeleteRoom}
                  >
                    <Text style={{ color: '#f87171', fontWeight: '800', fontSize: 13 }}>
                      DELETE PRODUCTION ROOM PERMANENTLY
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
  card: {
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
    letterSpacing: 1,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
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
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  visCol: {
    gap: 8,
  },
  visItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  addReqBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  inputSm: {
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  addReqBtn: {
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  posterImg: {
    width: 60,
    height: 90,
    borderRadius: 6,
  },
  posterPlaceholder: {
    width: 60,
    height: 90,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  dangerZone: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  actionRowBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
