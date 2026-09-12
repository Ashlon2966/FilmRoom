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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DateRangePickerField } from './CinemaDatePicker';
import { uploadToCloudinary } from '../services/cloudinaryService';

const PROJECT_TYPES = [
  'Short Film',
  'Feature',
  'Series',
  'Music Video',
  'Commercial',
  'Other',
];

const BUDGET_TIERS = [
  'Micro Budget (<$50k)',
  'Indie ($50k - $250k)',
  'Low Budget ($250k - $1M)',
  'Mid Budget ($1M - $5M)',
  'Studio / High Budget ($5M+)',
];

export default function EditRoomModal({ visible, roomId, roomData, onClose, onUpdated }) {
  const { currentUser } = useAuth();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState('Short Film');
  const [logline, setLogline] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [shootStartDate, setShootStartDate] = useState(null);
  const [shootEndDate, setShootEndDate] = useState(null);
  const [location, setLocation] = useState('');
  const [budgetTier, setBudgetTier] = useState('Indie ($50k - $250k)');

  const [posterUri, setPosterUri] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);
  const [posterMetadata, setPosterMetadata] = useState(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
      setBudgetTier(roomData.budgetTier || 'Indie ($50k - $250k)');
      setPosterUrl(roomData.posterUrl || null);
      setPosterMetadata(roomData.posterMetadata || null);
      setPosterUri(null);
    }
  }, [visible, roomData]);

  const handlePickPoster = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera roll access is needed to select a project poster.');
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
        setUploadProgress(0);

        const mediaRef = await uploadToCloudinary({
          fileUri: asset.uri,
          resourceType: 'image',
          fileName: asset.fileName || `${title || 'project'}_poster.jpg`,
          fileSize: asset.fileSize,
          folder: 'filmroom_posters',
          onProgress: (p) => setUploadProgress(p),
        });

        setPosterUrl(mediaRef.secureUrl);
        setPosterMetadata(mediaRef);
      }
    } catch (err) {
      Alert.alert('Poster Upload Notice', err.message || 'Could not upload poster to Cloudinary.');
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleSaveRoom = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a project name.');
      return;
    }
    if (!canEdit) {
      Alert.alert('Access Denied', 'Only the Production Owner or Manager can edit room details.');
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
        description: synopsis.trim() || null,
        shootStartDate: shootStartDate ? shootStartDate.toISOString() : null,
        shootEndDate: shootEndDate ? shootEndDate.toISOString() : null,
        location: location.trim() || null,
        budgetTier,
        posterUrl: posterUrl || null,
        posterMetadata: posterMetadata || null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(roomRef, updatePayload);
      Alert.alert('✓ Room Updated', 'Production Room details have been saved.');
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Unable to update production room.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme?.surface || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          {/* Top Bar */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme?.text || '#ffffff' }]}>EDIT PRODUCTION ROOM</Text>
              <Text style={[styles.subtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
                Update project metadata, dates & poster
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme?.textMuted || '#64748b', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {!canEdit && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠️ You have {userAccess} access. Only Room Owners or Managers can modify production metadata.
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Title */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af' }]}>PROJECT TITLE *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme?.background || '#0c0d0e', borderColor: theme?.cardBorder || '#242830', color: theme?.text || '#ffffff' }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Midnight in Berlin"
              placeholderTextColor="#555"
              editable={canEdit}
            />

            {/* 2. Project Type Selector */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 14 }]}>PROJECT TYPE</Text>
            <View style={styles.chipRow}>
              {PROJECT_TYPES.map((pt) => {
                const isSelected = projectType === pt;
                return (
                  <TouchableOpacity
                    key={pt}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme?.primary || '#f5a623' : theme?.background || '#0c0d0e',
                        borderColor: isSelected ? theme?.primary || '#f5a623' : theme?.cardBorder || '#242830',
                      },
                    ]}
                    onPress={() => canEdit && setProjectType(pt)}
                    disabled={!canEdit}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : theme?.textSecondary || '#9ca3af' },
                      ]}
                    >
                      {pt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Logline */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 14 }]}>LOGLINE</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme?.background || '#0c0d0e', borderColor: theme?.cardBorder || '#242830', color: theme?.text || '#ffffff' }]}
              value={logline}
              onChangeText={setLogline}
              placeholder="A one or two sentence summary of the project hook..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
              editable={canEdit}
            />

            {/* 4. Story Treatment / Synopsis */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 14 }]}>STORY SYNOPSIS / TREATMENT</Text>
            <TextInput
              style={[styles.textArea, { height: 90, backgroundColor: theme?.background || '#0c0d0e', borderColor: theme?.cardBorder || '#242830', color: theme?.text || '#ffffff' }]}
              value={synopsis}
              onChangeText={setSynopsis}
              placeholder="Detailed synopsis or production overview..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
              editable={canEdit}
            />

            {/* 5. Shoot Dates via CinemaDatePicker */}
            <View style={{ marginTop: 14 }}>
              <DateRangePickerField
                fromLabel="SHOOT START DATE"
                toLabel="SHOOT WRAP DATE"
                fromDate={shootStartDate}
                toDate={shootEndDate}
                onFromDateChange={setShootStartDate}
                onToDateChange={setShootEndDate}
                disabled={!canEdit}
              />
            </View>

            {/* 6. Location */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 14 }]}>PRIMARY PRODUCTION LOCATION</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme?.background || '#0c0d0e', borderColor: theme?.cardBorder || '#242830', color: theme?.text || '#ffffff' }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Vancouver, BC / Stages 3 & 4"
              placeholderTextColor="#555"
              editable={canEdit}
            />

            {/* 7. Budget Tier */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 14 }]}>BUDGET TIER</Text>
            <View style={styles.chipRow}>
              {BUDGET_TIERS.map((bt) => {
                const isSelected = budgetTier === bt;
                return (
                  <TouchableOpacity
                    key={bt}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme?.primary || '#f5a623' : theme?.background || '#0c0d0e',
                        borderColor: isSelected ? theme?.primary || '#f5a623' : theme?.cardBorder || '#242830',
                      },
                    ]}
                    onPress={() => canEdit && setBudgetTier(bt)}
                    disabled={!canEdit}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : theme?.textSecondary || '#9ca3af' },
                      ]}
                    >
                      {bt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 8. Poster / Artwork */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 14 }]}>PROJECT POSTER</Text>
            <View style={[styles.posterRow, { backgroundColor: theme?.background || '#0c0d0e', borderColor: theme?.cardBorder || '#242830' }]}>
              {posterUri || posterUrl ? (
                <Image source={{ uri: posterUri || posterUrl }} style={styles.posterPreview} />
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Text style={{ fontSize: 28 }}>🎬</Text>
                  <Text style={[styles.placeholderText, { color: theme?.textMuted || '#64748b' }]}>No Poster</Text>
                </View>
              )}

              <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
                <TouchableOpacity
                  style={[styles.uploadPosterBtn, { borderColor: theme?.primary || '#f5a623' }]}
                  onPress={handlePickPoster}
                  disabled={!canEdit || isUploadingPoster}
                >
                  {isUploadingPoster ? (
                    <ActivityIndicator size="small" color={theme?.primary || '#f5a623'} />
                  ) : (
                    <Text style={[styles.uploadPosterText, { color: theme?.primary || '#f5a623' }]}>
                      {posterUrl ? 'Change Poster' : 'Upload Poster'}
                    </Text>
                  )}
                </TouchableOpacity>

                {posterUrl && canEdit && (
                  <TouchableOpacity
                    style={{ marginTop: 8 }}
                    onPress={() => {
                      setPosterUrl(null);
                      setPosterMetadata(null);
                      setPosterUri(null);
                    }}
                  >
                    <Text style={{ color: '#f87171', fontSize: 12 }}>Remove Poster</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: canEdit ? theme?.primary || '#f5a623' : '#333333',
                },
              ]}
              onPress={handleSaveRoom}
              disabled={!canEdit || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Room Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '90%',
    padding: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  warningBanner: {
    backgroundColor: '#2a2215',
    borderColor: '#f5a623',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    color: '#f5a623',
    fontSize: 12,
    lineHeight: 16,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 70,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  posterPreview: {
    width: 60,
    height: 90,
    borderRadius: 6,
  },
  posterPlaceholder: {
    width: 60,
    height: 90,
    borderRadius: 6,
    backgroundColor: '#121417',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 9,
    marginTop: 4,
  },
  uploadPosterBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  uploadPosterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: 22,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
