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
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { submitContactRequest, REQUEST_TYPES } from '../services/contactRequestService';
import { uploadToCloudinary } from '../services/cloudinaryService';

export default function SubmitReelModal({
  visible,
  targetLead,
  initialProject = '',
  initialRole = '',
  onClose,
  onSuccess,
}) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();

  const [inputMode, setInputMode] = useState('LINK'); // 'LINK' | 'UPLOAD'
  const [reelUrl, setReelUrl] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [roleOrDepartment, setRoleOrDepartment] = useState('');
  const [projectInterest, setProjectInterest] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize values when modal opens
  useEffect(() => {
    if (visible) {
      setReelUrl(userProfile?.showreelUrl || '');
      setRoleOrDepartment(initialRole || userProfile?.role || userProfile?.roles?.[0] || '');
      setProjectInterest(initialProject || '');
      setMessage('');
      setUploadedVideo(null);
      setIsUploading(false);
      setUploadProgress(0);
      setIsSubmitting(false);
    }
  }, [visible, initialProject, initialRole, userProfile]);

  if (!targetLead) return null;

  // Active reel link to be submitted and previewed
  const activeReel = uploadedVideo?.secureUrl || reelUrl.trim();

  // Pick video file from device and upload to Cloudinary
  const handlePickVideo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Camera roll access is needed to select a video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);
        setUploadProgress(0);

        const mediaRef = await uploadToCloudinary({
          fileUri: asset.uri,
          resourceType: 'video',
          fileName: asset.fileName || `showreel_${Date.now()}.mp4`,
          fileSize: asset.fileSize,
          folder: 'filmroom_showreels',
          onProgress: (p) => setUploadProgress(p),
        });

        setUploadedVideo(mediaRef);
        setReelUrl(mediaRef.secureUrl);
        Alert.alert('✓ Video Uploaded', 'Your showreel has been securely processed and attached.');
      }
    } catch (err) {
      Alert.alert('Upload Notice', err.message || 'Could not upload video.');
    } finally {
      setIsUploading(false);
    }
  };

  // Preview the active reel link in browser/player
  const handlePreviewReel = () => {
    if (!activeReel) {
      Alert.alert('No Reel Provided', 'Please paste a link or upload a video clip first.');
      return;
    }
    Linking.openURL(activeReel).catch(() => {
      Alert.alert('Preview Error', 'Unable to open reel URL. Please verify the link format (e.g. https://...).');
    });
  };

  // Handle final submission
  const handleSubmit = async () => {
    if (!currentUser?.uid) {
      Alert.alert('Sign In Required', 'Please sign in to submit your showreel.');
      return;
    }
    if (!activeReel) {
      Alert.alert('Showreel Required', 'Please paste a showreel link or upload a video clip.');
      return;
    }
    if (!roleOrDepartment.trim()) {
      Alert.alert('Craft Required', 'Please specify your craft or role for consideration (e.g. Cinematographer, Actor).');
      return;
    }

    setIsSubmitting(true);
    try {
      const recipientId = targetLead.uid || targetLead.id;
      if (recipientId === currentUser.uid) {
        Alert.alert('Notice', 'You cannot submit a reel to yourself.');
        setIsSubmitting(false);
        return;
      }

      await submitContactRequest({
        type: REQUEST_TYPES.TALENT_TO_HIRING,
        sender: {
          uid: currentUser.uid,
          name: userProfile?.fullName || userProfile?.displayName || currentUser.email,
          username: userProfile?.username || 'filmmaker',
          role: userProfile?.role || userProfile?.roles?.[0] || 'Filmmaker',
          category: userProfile?.category || 'TALENT',
          photoURL: userProfile?.photoURL || null,
        },
        targetTalent: {
          uid: recipientId,
          name: targetLead.name || targetLead.fullName || 'Production Lead',
          username: targetLead.username || 'filmmaker',
          role: targetLead.role || 'Director / Producer',
          category: targetLead.category || 'PRODUCTION',
          photoURL: targetLead.avatar || targetLead.photoURL || null,
          representation: targetLead.representation || null,
        },
        details: {
          portfolioOrReel: activeReel,
          roleOrDepartment: roleOrDepartment.trim(),
          projectInterest: projectInterest.trim() || null,
          message: message.trim(),
        },
      });

      Alert.alert(
        '✓ Reel Submitted',
        `Your showreel and craft credentials have been dispatched to ${targetLead.name || 'the production lead'}.\n\n` +
        `You can track the review status in Requests -> Sent.`,
        [
          {
            text: 'Understood',
            onPress: () => {
              if (onSuccess) onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Could not dispatch your reel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>🎬 SUBMIT SHOWREEL</Text>
              <Text style={[styles.subTitle, { color: theme.textSecondary }]}>
                Submit to {targetLead.name} ({targetLead.role || 'Production Lead'})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeX, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Context Notice */}
            <View style={[styles.noticeBox, { backgroundColor: '#14161a', borderColor: theme.cardBorder }]}>
              <Text style={[styles.noticeTitle, { color: theme.primary }]}>
                PROFESSIONAL PORTFOLIO SUBMISSION
              </Text>
              <Text style={[styles.noticeSub, { color: theme.textMuted }]}>
                Submitting your reel initiates a verified review request. Upon acceptance, private direct messaging and contact details are enabled.
              </Text>
            </View>

            {/* Reel Input Mode Selector: Paste Link vs Upload Clip */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>
              SHOWREEL SOURCE *
            </Text>
            <View style={[styles.modeBar, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={[styles.modeBtn, inputMode === 'LINK' && { backgroundColor: theme.primary }]}
                onPress={() => setInputMode('LINK')}
              >
                <Text style={[styles.modeBtnText, { color: inputMode === 'LINK' ? '#000000' : theme.textSecondary }]}>
                  🔗 Link (Vimeo / YouTube / Drive)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, inputMode === 'UPLOAD' && { backgroundColor: theme.primary }]}
                onPress={() => setInputMode('UPLOAD')}
              >
                <Text style={[styles.modeBtnText, { color: inputMode === 'UPLOAD' ? '#000000' : theme.textSecondary }]}>
                  ☁ Upload Clip
                </Text>
              </TouchableOpacity>
            </View>

            {/* Option A: Paste Link */}
            {inputMode === 'LINK' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder, marginTop: 8 }]}
                placeholder="https://vimeo.com/... or https://youtube.com/..."
                placeholderTextColor={theme.textMuted}
                value={reelUrl}
                onChangeText={setReelUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}

            {/* Option B: Upload Clip */}
            {inputMode === 'UPLOAD' && (
              <View style={{ marginTop: 8 }}>
                {isUploading ? (
                  <View style={[styles.uploadingBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.uploadingText, { color: theme.text }]}>
                      Uploading reel: {uploadProgress}%
                    </Text>
                  </View>
                ) : uploadedVideo ? (
                  <View style={[styles.uploadedBox, { backgroundColor: '#1e3d29', borderColor: '#4ade80' }]}>
                    <Text style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ Reel Video Processed</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>{uploadedVideo.originalFilename}</Text>
                    <TouchableOpacity onPress={handlePickVideo} style={{ marginTop: 6 }}>
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>Change Video</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadTrigger, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                    onPress={handlePickVideo}
                  >
                    <Text style={{ fontSize: 24 }}>🎬</Text>
                    <Text style={[styles.uploadTriggerTitle, { color: theme.text }]}>Select Video Reel from Device</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>MP4, MOV up to 50MB (free tier)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Live Reel Preview Card */}
            {Boolean(activeReel) && (
              <TouchableOpacity
                style={[styles.previewCard, { backgroundColor: '#000000', borderColor: theme.primary }]}
                onPress={handlePreviewReel}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>🎬</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.previewUrl, { color: theme.primary }]} numberOfLines={1}>
                      {activeReel}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
                      Tap to test & preview your reel ➔
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Craft / Role */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>
              YOUR CRAFT / ROLE FOR CONSIDERATION *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder, marginTop: 6 }]}
              placeholder="e.g. Lead Actor, Director of Photography, Key Grip"
              placeholderTextColor={theme.textMuted}
              value={roleOrDepartment}
              onChangeText={setRoleOrDepartment}
            />

            {/* Project Interest */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>
              PROJECT OF INTEREST (OPTIONAL)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder, marginTop: 6 }]}
              placeholder="e.g. Upcoming indie feature, Commercial campaign"
              placeholderTextColor={theme.textMuted}
              value={projectInterest}
              onChangeText={setProjectInterest}
            />

            {/* Cover Note */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>
              PROFESSIONAL COVER NOTE (OPTIONAL)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.cardBorder,
                  marginTop: 6,
                  height: 80,
                  textAlignVertical: 'top',
                },
              ]}
              placeholder="Brief summary of your style, recent credits, or why you'd be a good fit..."
              placeholderTextColor={theme.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
            />

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.cardBorder }]}
                onPress={onClose}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                onPress={handleSubmit}
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Reel ➔</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    height: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeX: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noticeBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.5,
  },
  noticeSub: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeBar: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    marginTop: 6,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  uploadTrigger: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  uploadTriggerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  uploadingBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  uploadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  uploadedBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  previewCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewUrl: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
