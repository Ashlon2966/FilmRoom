import React, { useState, useRef, useEffect } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { uploadToCloudinary } from '../services/cloudinaryService';

const MEDIA_CATEGORIES = [
  { key: 'photo', label: 'Photo', icon: '🖼', resourceType: 'image' },
  { key: 'video', label: 'Video', icon: '🎬', resourceType: 'video' },
  { key: 'document', label: 'Document', icon: '📄', resourceType: 'raw' },
  { key: 'showreel', label: 'Showreel', icon: '🎭', resourceType: 'video' },
  { key: 'other', label: 'Other', icon: '📁', resourceType: 'auto' },
];

const VISIBILITY_OPTIONS = [
  { key: 'PUBLIC', label: 'Public' },
  { key: 'CONNECTIONS', label: 'Connections' },
  { key: 'PRIVATE', label: 'Private' },
];

export default function FileUploadModal({
  visible,
  onClose,
  onUploadSuccess,
  folder = 'filmroom_media',
}) {
  const { theme } = useTheme();

  // Wizard Steps: 'CATEGORY' | 'SELECT' | 'DETAILS' | 'UPLOADING' | 'SUCCESS' | 'FAILED'
  const [step, setStep] = useState('CATEGORY');
  const [selectedCategory, setSelectedCategory] = useState(MEDIA_CATEGORIES[0]);

  // Selected File
  const [fileUri, setFileUri] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [customName, setCustomName] = useState('');
  const [visibility, setVisibility] = useState('CONNECTIONS');

  // Progress & Error
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelRef = useRef(null);

  // Reset when opened/closed
  useEffect(() => {
    if (!visible) {
      if (cancelRef.current) cancelRef.current();
      setStep('CATEGORY');
      setSelectedCategory(MEDIA_CATEGORIES[0]);
      setFileUri(null);
      setFileName('');
      setFileSize(0);
      setCustomName('');
      setVisibility('CONNECTIONS');
      setProgress(0);
      setErrorMessage('');
    }
  }, [visible]);

  // Handle picking from device
  const handlePickFile = async () => {
    try {
      if (selectedCategory.key === 'photo') {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          const a = res.assets[0];
          setFileUri(a.uri);
          setFileName(a.fileName || 'photo.jpg');
          setFileSize(a.fileSize || 0);
          setCustomName(a.fileName ? a.fileName.split('.')[0] : 'Production Photo');
          setStep('DETAILS');
        }
      } else if (selectedCategory.key === 'video' || selectedCategory.key === 'showreel') {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 0.8,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          const a = res.assets[0];
          setFileUri(a.uri);
          setFileName(a.fileName || 'video.mp4');
          setFileSize(a.fileSize || 0);
          setCustomName(selectedCategory.key === 'showreel' ? 'Cinematographer Showreel' : 'Production Clip');
          setStep('DETAILS');
        }
      } else {
        // Document / Other
        const res = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          const a = res.assets[0];
          setFileUri(a.uri);
          setFileName(a.name);
          setFileSize(a.size || 0);
          setCustomName(a.name.split('.')[0] || 'Production Document');
          setStep('DETAILS');
        }
      }
    } catch (err) {
      Alert.alert('File Selection Notice', err.message || 'Unable to open file picker.');
    }
  };

  // Perform upload
  const handleStartUpload = async () => {
    if (!fileUri) return;

    setStep('UPLOADING');
    setProgress(0);
    setErrorMessage('');

    try {
      const mediaRef = await uploadToCloudinary({
        fileUri,
        resourceType: selectedCategory.resourceType,
        fileName,
        fileSize,
        folder,
        onProgress: (p) => setProgress(p),
        cancelRef,
      });

      const completeFileRecord = {
        ...mediaRef,
        displayName: customName.trim() || fileName,
        visibility,
        category: selectedCategory.key,
      };

      setStep('SUCCESS');
      if (onUploadSuccess) onUploadSuccess(completeFileRecord);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      if (err.isCancelled) {
        setStep('DETAILS');
      } else {
        setStep('FAILED');
        setErrorMessage(err.message || 'Upload failed.');
      }
    }
  };

  const handleCancelUpload = () => {
    if (cancelRef.current) cancelRef.current();
    setStep('DETAILS');
    setProgress(0);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {step === 'CATEGORY' && 'ADD TO FILMROOM'}
              {step === 'SELECT' && 'SELECT FILE'}
              {step === 'DETAILS' && 'FILE DETAILS'}
              {step === 'UPLOADING' && 'UPLOADING'}
              {step === 'SUCCESS' && 'COMPLETE'}
              {step === 'FAILED' && 'UPLOAD FAILED'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── STEP 1: CATEGORY SELECTION ── */}
          {step === 'CATEGORY' && (
            <View style={styles.body}>
              <Text style={[styles.prompt, { color: theme.textSecondary }]}>
                Choose what kind of media you want to add:
              </Text>
              <View style={styles.categoryList}>
                {MEDIA_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.categoryItem, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setStep('SELECT');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryLabel, { color: theme.text }]}>{cat.label}</Text>
                    <Text style={[styles.categoryArrow, { color: theme.accent }]}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── STEP 2: SELECT FILE FROM DEVICE ── */}
          {step === 'SELECT' && (
            <View style={styles.body}>
              <Text style={[styles.prompt, { color: theme.textSecondary }]}>
                Selected: {selectedCategory.icon} {selectedCategory.label}
              </Text>

              <TouchableOpacity
                style={[styles.chooseFromDeviceBtn, { backgroundColor: theme.accent }]}
                onPress={handlePickFile}
                activeOpacity={0.8}
              >
                <Text style={styles.chooseFromDeviceText}>Choose from Device</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setStep('CATEGORY')}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: FILE DETAILS & VISIBILITY ── */}
          {step === 'DETAILS' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsContent}>
              {/* Preview */}
              <View style={styles.previewBox}>
                {selectedCategory.key === 'photo' && fileUri ? (
                  <Image source={{ uri: fileUri }} style={styles.previewThumb} resizeMode="cover" />
                ) : (
                  <Text style={styles.previewFallbackIcon}>{selectedCategory.icon}</Text>
                )}
                {fileSize > 0 && (
                  <Text style={[styles.previewSize, { color: theme.textMuted }]}>
                    {(fileSize / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>NAME</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                value={customName}
                onChangeText={setCustomName}
                placeholder="Name this file..."
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 14 }]}>VISIBILITY</Text>
              <View style={styles.visibilityColumn}>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const isSelected = visibility === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.visOptionRow,
                        {
                          backgroundColor: isSelected ? theme.background : 'transparent',
                          borderColor: isSelected ? theme.accent : theme.cardBorder,
                        },
                      ]}
                      onPress={() => setVisibility(opt.key)}
                    >
                      <View style={[styles.radioCircle, { borderColor: isSelected ? theme.accent : theme.textMuted }]}>
                        {isSelected && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                      </View>
                      <Text style={[styles.visOptionText, { color: isSelected ? theme.text : theme.textSecondary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.chooseFromDeviceBtn, { backgroundColor: theme.accent, marginTop: 20 }]}
                onPress={handleStartUpload}
                activeOpacity={0.8}
              >
                <Text style={styles.chooseFromDeviceText}>Upload</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── STEP 4: UPLOADING WITH PROGRESS ── */}
          {step === 'UPLOADING' && (
            <View style={styles.centerBody}>
              <Text style={[styles.uploadingHeading, { color: theme.text }]}>Uploading...</Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.accent }]} />
              </View>
              <Text style={[styles.percentLabel, { color: theme.accent }]}>{progress}%</Text>

              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.cardBorder, marginTop: 20 }]}
                onPress={handleCancelUpload}
              >
                <Text style={[styles.cancelBtnText, { color: theme.danger || '#f87171' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SUCCESS ── */}
          {step === 'SUCCESS' && (
            <View style={styles.centerBody}>
              <Text style={[styles.bigSuccessIcon, { color: theme.success || '#4ade80' }]}>✓</Text>
              <Text style={[styles.successLabel, { color: theme.text }]}>Upload complete</Text>
            </View>
          )}

          {/* ── FAILED ── */}
          {step === 'FAILED' && (
            <View style={styles.centerBody}>
              <Text style={[styles.failHeading, { color: theme.danger || '#f87171' }]}>Upload failed</Text>
              <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{errorMessage}</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.cardBorder, flex: 1, marginRight: 8 }]}
                  onPress={() => setStep('DETAILS')}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chooseFromDeviceBtn, { backgroundColor: theme.accent, flex: 1, marginLeft: 8 }]}
                  onPress={handleStartUpload}
                >
                  <Text style={styles.chooseFromDeviceText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingBottom: 16,
  },
  prompt: {
    fontSize: 13,
    marginBottom: 16,
  },
  categoryList: {
    gap: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  categoryArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chooseFromDeviceBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  chooseFromDeviceText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContent: {
    paddingBottom: 24,
  },
  previewBox: {
    alignItems: 'center',
    marginVertical: 12,
  },
  previewThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  previewFallbackIcon: {
    fontSize: 48,
  },
  previewSize: {
    fontSize: 12,
    marginTop: 6,
  },
  fieldLabel: {
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
  visibilityColumn: {
    gap: 8,
  },
  visOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  visOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerBody: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  uploadingHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  percentLabel: {
    fontSize: 18,
    fontWeight: '900',
  },
  bigSuccessIcon: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 10,
  },
  successLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  failHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
