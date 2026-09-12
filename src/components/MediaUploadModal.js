import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable Media Upload Modal
 * 
 * Implements the Cinema Dark media upload experience:
 * - Device file selection (images, videos, or documents)
 * - Live progress bar with percentage (e.g. 78%)
 * - Explicit cancellation
 * - Success state (✓ Upload complete)
 * - Failure state with user-friendly error and [ Try Again ]
 */
export default function MediaUploadModal({
  visible,
  onClose,
  onUploadSuccess,
  mediaType = 'image', // 'image' | 'video' | 'document' | 'all'
  title = 'Upload Media',
  folder = 'filmroom_uploads',
}) {
  const { theme } = useTheme();

  // Upload States: 'idle' | 'selected' | 'uploading' | 'success' | 'failed'
  const [status, setStatus] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelRef = useRef(null);

  // Reset state when opened/closed
  useEffect(() => {
    if (!visible) {
      if (cancelRef.current) {
        cancelRef.current(); // abort any in-flight upload if dismissed
      }
      setStatus('idle');
      setSelectedFile(null);
      setProgress(0);
      setErrorMessage('');
    }
  }, [visible]);

  // Handle picking from device
  const handlePickFile = async () => {
    try {
      if (mediaType === 'image' || mediaType === 'video') {
        const pickerOptions = {
          mediaTypes:
            mediaType === 'video'
              ? ImagePicker.MediaTypeOptions.Videos
              : ImagePicker.MediaTypeOptions.Images,
          allowsEditing: mediaType === 'image',
          aspect: [1, 1],
          quality: 0.8,
        };

        const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setSelectedFile({
            uri: asset.uri,
            name: asset.fileName || `filmroom_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
            size: asset.fileSize || 0,
            type: mediaType,
          });
          setStatus('selected');
        }
      } else {
        // Document / General file picker
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const file = result.assets[0];
          setSelectedFile({
            uri: file.uri,
            name: file.name,
            size: file.size || 0,
            type: 'raw',
          });
          setStatus('selected');
        }
      }
    } catch (err) {
      Alert.alert('Selection Error', 'Unable to access device files. Please grant permission.');
    }
  };

  // Start Cloudinary upload
  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setProgress(0);
    setErrorMessage('');

    try {
      const mediaRef = await uploadToCloudinary({
        fileUri: selectedFile.uri,
        resourceType: selectedFile.type === 'video' ? 'video' : 'image',
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        folder,
        onProgress: (p) => setProgress(p),
        cancelRef,
      });

      setStatus('success');
      if (onUploadSuccess) {
        onUploadSuccess(mediaRef);
      }

      // Auto close after brief success message
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      if (err.isCancelled) {
        setStatus('idle');
        setSelectedFile(null);
      } else {
        setStatus('failed');
        setErrorMessage(err.message || 'Unable to upload this file.');
      }
    }
  };

  // Cancel ongoing upload
  const handleCancel = () => {
    if (cancelRef.current) {
      cancelRef.current();
    }
    setStatus('idle');
    setSelectedFile(null);
    setProgress(0);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (status === 'uploading') {
          handleCancel();
        }
        onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {/* Body based on status */}
          {status === 'idle' && (
            <View style={styles.bodyContainer}>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Select media from your device to upload to FilmRoom.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                onPress={handlePickFile}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Select from Device</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'selected' && selectedFile && (
            <View style={styles.bodyContainer}>
              {selectedFile.type === 'image' && (
                <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="cover" />
              )}
              <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              {selectedFile.size > 0 && (
                <Text style={[styles.fileSize, { color: theme.textMuted }]}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </Text>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.cardBorder }]}
                  onPress={() => {
                    setSelectedFile(null);
                    setStatus('idle');
                  }}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Choose Other</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent, flex: 1, marginLeft: 10 }]}
                  onPress={handleStartUpload}
                >
                  <Text style={styles.primaryButtonText}>Upload</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {status === 'uploading' && (
            <View style={styles.bodyContainer}>
              <Text style={[styles.uploadingText, { color: theme.text }]}>Uploading...</Text>

              {/* Progress Bar */}
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progress}%`,
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.percentText, { color: theme.accent }]}>{progress}%</Text>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.cardBorder, marginTop: 16 }]}
                onPress={handleCancel}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.danger || '#f87171' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.bodyContainer}>
              <Text style={[styles.successIcon, { color: theme.success || '#4ade80' }]}>✓</Text>
              <Text style={[styles.successTitle, { color: theme.text }]}>Upload complete</Text>
            </View>
          )}

          {status === 'failed' && (
            <View style={styles.bodyContainer}>
              <Text style={[styles.failTitle, { color: theme.danger || '#f87171' }]}>Upload failed</Text>
              <Text style={[styles.errorDetail, { color: theme.textSecondary }]}>{errorMessage}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.cardBorder, flex: 1, marginRight: 8 }]}
                  onPress={onClose}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Dismiss</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent, flex: 1, marginLeft: 8 }]}
                  onPress={handleStartUpload}
                >
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Close button if idle */}
          {status === 'idle' && (
            <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
              <Text style={[styles.dismissText, { color: theme.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  bodyContainer: {
    width: '100%',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 12,
    marginBottom: 16,
  },
  primaryButton: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 8,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  percentText: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  successIcon: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  failTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  dismissButton: {
    marginTop: 16,
    padding: 8,
  },
  dismissText: {
    fontSize: 14,
  },
});
