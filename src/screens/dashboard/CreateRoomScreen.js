import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import BackButton from '../../components/BackButton';
import { DateRangePickerField } from '../../components/CinemaDatePicker';
import { uploadToCloudinary } from '../../services/cloudinaryService';

const PROJECT_TYPES = [
  'Short Film',
  'Feature',
  'Series',
  'Music Video',
  'Commercial',
  'Other',
];

export default function CreateRoomScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { switchRoom } = useRoom();
  const { theme } = useTheme();

  // Wizard Steps: 1 -> 2 -> 3 -> 4 ('READY')
  const [step, setStep] = useState(1);

  // Step 1: Project Name & Type
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('Short Film');

  // Step 2: Details & Dates
  const [logline, setLogline] = useState('');
  const [shootStartDate, setShootStartDate] = useState(null);
  const [shootEndDate, setShootEndDate] = useState(null);
  const [location, setLocation] = useState('');

  // Step 3: Poster & Cloudinary
  const [posterUri, setPosterUri] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);
  const [posterMetadata, setPosterMetadata] = useState(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 4: Ready State
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState(null);

  // Pick Poster from device and upload to Cloudinary
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
        aspect: [2, 3], // Standard cinema poster aspect ratio
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
          fileName: asset.fileName || `${projectName || 'poster'}_poster.jpg`,
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

  // Create room in Firestore
  const handleFinalizeRoom = async () => {
    if (!projectName.trim()) {
      Alert.alert('Required', 'Please enter a project name.');
      return;
    }

    setIsCreatingRoom(true);
    try {
      const roomData = {
        title: projectName.trim(),
        projectType,
        logline: logline.trim() || null,
        shootStartDate: shootStartDate || null,
        shootEndDate: shootEndDate || null,
        location: location.trim() || null,
        posterUrl: posterUrl || null,
        posterMetadata: posterMetadata || null,
        creatorId: currentUser.uid,
        creatorEmail: currentUser.email,
        memberUids: [currentUser.uid],
        members: {
          [currentUser.uid]: {
            displayName: userProfile?.fullName || currentUser.email,
            roles: userProfile?.roles || ['Director'],
            joinedAt: new Date().toISOString(),
          },
        },
        currentStage: 0,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      setCreatedRoomId(docRef.id);
      setStep(4);
    } catch (err) {
      Alert.alert('Creation Failed', err.message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Open Room handler after Room Ready
  const handleOpenRoom = () => {
    if (createdRoomId) {
      switchRoom(createdRoomId);
      navigation.replace('StagePipeline', { screen: 'Stage1_Ideation' });
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header with Close */}
        <View style={styles.headerRow}>
          {step < 4 && <BackButton isClose={true} />}
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            {step === 4 ? 'ROOM READY' : 'CREATE ROOM'}
          </Text>
          {step < 4 && (
            <Text style={[styles.stepIndicator, { color: theme.accent }]}>
              {step}/3
            </Text>
          )}
        </View>

        {/* ── STEP 1: Project Name & Type ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.questionLabel, { color: theme.text }]}>
              What's the project called?
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Neon Horizon"
              placeholderTextColor={theme.textMuted}
              value={projectName}
              onChangeText={setProjectName}
              autoFocus
            />

            <Text style={[styles.questionLabel, { color: theme.text, marginTop: 24 }]}>
              What are you making?
            </Text>
            <View style={styles.chipGrid}>
              {PROJECT_TYPES.map((type) => {
                const isSelected = projectType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.surface,
                        borderColor: isSelected ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setProjectType(type)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : theme.textSecondary },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: projectName.trim() ? theme.accent : theme.surface,
                  opacity: projectName.trim() ? 1 : 0.5,
                  marginTop: 36,
                },
              ]}
              onPress={() => {
                if (projectName.trim()) setStep(2);
              }}
              disabled={!projectName.trim()}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryBtnText, { color: projectName.trim() ? '#000000' : theme.textMuted }]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Project Details (Logline, Dates, Location) ── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepSectionTitle, { color: theme.text }]}>PROJECT DETAILS</Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>LOGLINE</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="One-sentence hook summarizing the conflict... (Optional)"
              placeholderTextColor={theme.textMuted}
              value={logline}
              onChangeText={setLogline}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 16 }]}>
              PRODUCTION DATES
            </Text>
            <DateRangePickerField
              fromLabel="From Date"
              toLabel="To Date"
              fromDate={shootStartDate}
              toDate={shootEndDate}
              onChangeDates={({ fromFormatted, toFormatted }) => {
                setShootStartDate(fromFormatted);
                setShootEndDate(toFormatted);
              }}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 16 }]}>
              LOCATION
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Mumbai, Prague, Remote (Optional)"
              placeholderTextColor={theme.textMuted}
              value={location}
              onChangeText={setLocation}
            />

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.skipBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setStep(3)}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.accent, flex: 1, marginLeft: 12 }]}
                onPress={() => setStep(3)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 3: Project Image / Poster ── */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepSectionTitle, { color: theme.text }]}>PROJECT IMAGE</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              Add a poster or key-art image to your production room?
            </Text>

            {/* Poster Preview or Picker */}
            {posterUri || posterUrl ? (
              <View style={styles.posterPreviewContainer}>
                <Image
                  source={{ uri: posterUri || posterUrl }}
                  style={[styles.posterImage, { borderColor: theme.cardBorder }]}
                  resizeMode="cover"
                />
                {isUploadingPoster ? (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color={theme.accent} />
                    <Text style={[styles.uploadProgressText, { color: theme.text }]}>
                      Uploading... {uploadProgress}%
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.changePosterBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                    onPress={handlePickPoster}
                  >
                    <Text style={[styles.changePosterText, { color: theme.textSecondary }]}>
                      Change Image
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.chooseImageCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                onPress={handlePickPoster}
                disabled={isUploadingPoster}
                activeOpacity={0.8}
              >
                <Text style={styles.imageCardIcon}>🖼</Text>
                <Text style={[styles.chooseImageTitle, { color: theme.text }]}>
                  Choose Image
                </Text>
                <Text style={[styles.chooseImageHint, { color: theme.textMuted }]}>
                  Uploads securely to Cloudinary
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.skipBtn, { borderColor: theme.cardBorder }]}
                onPress={handleFinalizeRoom}
                disabled={isCreatingRoom}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>
                  Skip for now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.accent,
                    flex: 1,
                    marginLeft: 12,
                    opacity: isCreatingRoom ? 0.7 : 1,
                  },
                ]}
                onPress={handleFinalizeRoom}
                disabled={isCreatingRoom}
                activeOpacity={0.8}
              >
                {isCreatingRoom ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Finish & Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 4: Room Ready ── */}
        {step === 4 && (
          <View style={styles.readyContainer}>
            <Text style={styles.readyClapper}>🎬</Text>
            <Text style={[styles.readyProjectName, { color: theme.text }]}>
              {projectName}
            </Text>
            <View style={[styles.readyBadge, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <Text style={[styles.readyBadgeText, { color: theme.accent }]}>{projectType}</Text>
            </View>
            <Text style={[styles.readyNotice, { color: theme.textSecondary }]}>
              Room created. You can add the rest of your cast, crew, and documents later.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent, width: '100%', marginTop: 32 }]}
              onPress={handleOpenRoom}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Open Room</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepContainer: {
    width: '100%',
  },
  questionLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  stepSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    height: 76,
    textAlignVertical: 'top',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  skipBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chooseImageCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  imageCardIcon: {
    fontSize: 38,
    marginBottom: 10,
  },
  chooseImageTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  chooseImageHint: {
    fontSize: 12,
  },
  posterPreviewContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  posterImage: {
    width: 140,
    height: 210,
    borderRadius: 10,
    borderWidth: 1,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  changePosterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
  },
  changePosterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  readyContainer: {
    alignItems: 'center',
    paddingTop: 36,
    paddingHorizontal: 12,
  },
  readyClapper: {
    fontSize: 54,
    marginBottom: 16,
  },
  readyProjectName: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  readyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  readyNotice: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});