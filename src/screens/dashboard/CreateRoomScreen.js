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
import { useToast } from '../../context/ToastContext';
import BackButton from '../../components/BackButton';
import { DateRangePickerField } from '../../components/CinemaDatePicker';
import { uploadToCloudinary } from '../../services/cloudinaryService';

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
  { key: 'PUBLIC', label: 'Public', desc: 'Discoverable across FilmRoom & The Board immediately' },
  { key: 'MEMBERS', label: 'FilmRoom Members', desc: 'Visible only to signed-in FilmRoom members' },
  { key: 'INVITED', label: 'Invited People', desc: 'Accessible only to invited collaborators' },
  { key: 'PRIVATE', label: 'Private', desc: 'Strictly confidential to room creators & managers' },
];

export default function CreateRoomScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { switchRoom } = useRoom();
  const { theme } = useTheme();
  const { showToast } = useToast();

  // Wizard Steps: 1 -> 2 -> 3 -> 4 ('READY')
  const [step, setStep] = useState(1);

  // Step 1: Project Name & Type
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('Short Film');

  // Step 2: Details, Dates, Visibility
  const [logline, setLogline] = useState('');
  const [shootStartDate, setShootStartDate] = useState(null);
  const [shootEndDate, setShootEndDate] = useState(null);
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');

  // Step 3: Initial Crew Requirements
  const [crewRequirements, setCrewRequirements] = useState([
    { id: '1', department: 'Camera', role: 'Cinematographer', quantity: 1, requirement: 'Arri/RED experience' },
    { id: '2', department: 'Sound', role: 'Production Sound Mixer', quantity: 1, requirement: 'Lavalier & boom kit' },
  ]);
  const [newRoleDept, setNewRoleDept] = useState('Lighting');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleQty, setNewRoleQty] = useState(1);

  // Step 4: Poster & Cloudinary
  const [posterUri, setPosterUri] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);
  const [posterMetadata, setPosterMetadata] = useState(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Ready State
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState(null);

  const handlePickPoster = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({ type: 'warning', message: 'Camera roll access is needed to select a poster.' });
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
          fileName: asset.fileName || `${projectName || 'poster'}_poster.jpg`,
          fileSize: asset.fileSize,
          folder: 'filmroom_posters',
          onProgress: (p) => setUploadProgress(p),
        });

        setPosterUrl(mediaRef.secureUrl);
        setPosterMetadata(mediaRef);
        showToast({ type: 'success', message: 'Poster uploaded successfully' });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not upload poster to Cloudinary.' });
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleAddRequirement = () => {
    if (!newRoleTitle.trim()) {
      showToast({ type: 'warning', message: 'Please enter a craft title (e.g. Gaffer, 1st AC).' });
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
    showToast({ type: 'info', message: `Added ${newReq.role} to crew roster` });
  };

  const handleRemoveRequirement = (id) => {
    setCrewRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  const handleFinalizeRoom = async () => {
    if (!projectName.trim()) {
      showToast({ type: 'warning', message: 'Please enter a project name.' });
      return;
    }

    setIsCreatingRoom(true);
    try {
      const creatorUid = currentUser.uid;
      const roomData = {
        title: projectName.trim(),
        projectType,
        logline: logline.trim() || null,
        shootStartDate: shootStartDate || null,
        shootEndDate: shootEndDate || null,
        location: location.trim() || null,
        posterUrl: posterUrl || null,
        posterMetadata: posterMetadata || null,
        visibility, // 'PUBLIC' | 'MEMBERS' | 'INVITED' | 'PRIVATE'
        status: 'ACTIVE', // 'ACTIVE' | 'ARCHIVED'
        creatorId: creatorUid,
        creatorEmail: currentUser.email,
        creatorName: userProfile?.fullName || currentUser.displayName || 'Creator',
        memberUids: [creatorUid],
        members: {
          [creatorUid]: {
            uid: creatorUid,
            name: userProfile?.fullName || currentUser.email,
            displayName: userProfile?.fullName || currentUser.email,
            username: userProfile?.username || 'filmmaker',
            globalRole: userProfile?.role || userProfile?.roles?.[0] || 'Director',
            productionRole: 'Director',
            roomAccess: 'Owner', // Owner / Manager / Crew / Cast / Viewer
            joinedAt: new Date().toISOString(),
          },
        },
        crewRequirements,
        currentStage: 0,
        activityFeed: [
          {
            action: 'ROOM_INITIALIZED',
            actorName: userProfile?.fullName || 'Creator',
            details: `Production Room "${projectName.trim()}" created as ${visibility}.`,
            timestamp: new Date().toISOString(),
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      setCreatedRoomId(docRef.id);
      setStep(5); // Ready state
      showToast({ type: 'success', title: 'Room Created', message: `Production Room "${projectName.trim()}" initialized!` });
    } catch (err) {
      showToast({ type: 'error', title: 'Creation Failed', message: err.message || 'Failed to create room' });
    } finally {
      setIsCreatingRoom(false);
    }
  };

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
      <View style={[styles.topHeader, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: theme.text }]}>NEW FILM ROOM</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Step Progress Pills */}
        <View style={styles.stepIndicatorRow}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                {
                  backgroundColor: step >= s ? theme.primary : theme.cardBorder,
                },
              ]}
            />
          ))}
        </View>

        {/* STEP 1: Project Name & Type */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepSectionTitle, { color: theme.text }]}>PROJECT IDENTITY</Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PROJECT TITLE *</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. THE LAST HORIZON"
              placeholderTextColor={theme.textMuted}
              value={projectName}
              onChangeText={setProjectName}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 18 }]}>
              PROJECT FORMAT
            </Text>
            <View style={styles.chipRow}>
              {PROJECT_TYPES.map((type) => {
                const isSelected = projectType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.cardBorder,
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
                  backgroundColor: projectName.trim() ? theme.primary : theme.surface,
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
                Continue ➔
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Details, Dates, Visibility */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepSectionTitle, { color: theme.text }]}>DETAILS & VISIBILITY</Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>LOGLINE</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="One-sentence summary of the story conflict..."
              placeholderTextColor={theme.textMuted}
              value={logline}
              onChangeText={setLogline}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 16 }]}>
              SHOOT SCHEDULE
            </Text>
            <DateRangePickerField
              fromLabel="Start Date"
              toLabel="Wrap Date"
              fromDate={shootStartDate}
              toDate={shootEndDate}
              onFromDateChange={setShootStartDate}
              onToDateChange={setShootEndDate}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 16 }]}>
              SHOOT LOCATION
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Goa, India / Studio Stage 4"
              placeholderTextColor={theme.textMuted}
              value={location}
              onChangeText={setLocation}
            />

            {/* Room Visibility Selector (Section 10) */}
            <Text style={[styles.fieldLabel, { color: theme.primary, marginTop: 18 }]}>
              ROOM VISIBILITY *
            </Text>
            <View style={styles.visibilityCol}>
              {ROOM_VISIBILITY_OPTIONS.map((opt) => {
                const isSel = visibility === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.visCard,
                      {
                        backgroundColor: isSel ? '#242016' : theme.surface,
                        borderColor: isSel ? theme.primary : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setVisibility(opt.key)}
                  >
                    <View style={styles.visTop}>
                      <Text style={[styles.visTitle, { color: isSel ? theme.primary : theme.text }]}>
                        {opt.label}
                      </Text>
                      {isSel && <Text style={{ color: theme.primary, fontWeight: '800' }}>✓ Active</Text>}
                    </View>
                    <Text style={[styles.visDesc, { color: theme.textSecondary }]}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.skipBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setStep(1)}
              >
                <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.primary, marginLeft: 12 }]}
                onPress={() => setStep(3)}
              >
                <Text style={[styles.primaryBtnText, { color: '#000000' }]}>Next: Crew Roles ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: Crew Requirements (Section 12) */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepSectionTitle, { color: theme.text }]}>CREW REQUIREMENTS</Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              Define open department positions required for this production.
            </Text>

            {/* Current Requirements List */}
            {crewRequirements.map((req) => (
              <View
                key={req.id}
                style={[
                  styles.reqItem,
                  { backgroundColor: theme.surface, borderColor: theme.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reqDept, { color: theme.primary }]}>{req.department.toUpperCase()}</Text>
                  <Text style={[styles.reqRole, { color: theme.text }]}>
                    {req.role} — <Text style={{ color: theme.primary }}>{req.quantity} needed</Text>
                  </Text>
                  {req.requirement ? (
                    <Text style={[styles.reqSpecs, { color: theme.textMuted }]}>{req.requirement}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveRequirement(req.id)}
                  style={styles.delBtn}
                >
                  <Text style={{ color: '#f87171', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Role Inline Box */}
            <View style={[styles.addRoleCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.addRoleHeader, { color: theme.primary }]}>+ ADD ROLE REQUIREMENT</Text>

              <View style={styles.inlineInputs}>
                <TextInput
                  style={[styles.inputSm, { flex: 2, backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                  placeholder="Role (e.g. Gaffer, 1st AC)"
                  placeholderTextColor={theme.textMuted}
                  value={newRoleTitle}
                  onChangeText={setNewRoleTitle}
                />
                <TextInput
                  style={[styles.inputSm, { flex: 1, backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder, textAlign: 'center' }]}
                  placeholder="Qty"
                  placeholderTextColor={theme.textMuted}
                  value={newRoleQty.toString()}
                  onChangeText={(t) => setNewRoleQty(Math.max(1, parseInt(t, 10) || 1))}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddRequirement}
              >
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>Add to Production Specs</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.skipBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setStep(2)}
              >
                <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.primary, marginLeft: 12 }]}
                onPress={() => setStep(4)}
              >
                <Text style={[styles.primaryBtnText, { color: '#000000' }]}>Next: Poster & Create ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: Poster & Finalize */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepSectionTitle, { color: theme.text }]}>PROJECT POSTER</Text>

            <View style={[styles.posterBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              {posterUri || posterUrl ? (
                <Image source={{ uri: posterUri || posterUrl }} style={styles.posterImage} />
              ) : (
                <View style={styles.posterEmpty}>
                  <Text style={{ fontSize: 36 }}>🎬</Text>
                  <Text style={[styles.posterEmptyText, { color: theme.textMuted }]}>
                    No Poster Selected
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.uploadBtn, { borderColor: theme.primary }]}
              onPress={handlePickPoster}
              disabled={isUploadingPoster}
            >
              {isUploadingPoster ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={[styles.uploadBtnText, { color: theme.primary }]}>
                  {posterUrl ? 'Change Project Poster 📷' : 'Upload Cinema Poster (2:3) 📷'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.skipBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setStep(3)}
              >
                <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: theme.primary, marginLeft: 12 }]}
                onPress={handleFinalizeRoom}
                disabled={isCreatingRoom}
              >
                {isCreatingRoom ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: '#000000' }]}>
                    PUBLISH PRODUCTION ROOM ➔
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 5: Ready State */}
        {step === 5 && (
          <View style={[styles.stepContainer, { alignItems: 'center', paddingTop: 30 }]}>
            <Text style={{ fontSize: 50, marginBottom: 16 }}>🎬</Text>
            <Text style={[styles.readyTitle, { color: theme.primary }]}>PRODUCTION ROOM ACTIVE</Text>
            <Text style={[styles.readySub, { color: theme.textSecondary }]}>
              "{projectName}" is now online as a {visibility} room. Your digital slate, script breakdown, and production pipeline are initialized.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary, width: '100%', marginTop: 24 }]}
              onPress={handleOpenRoom}
            >
              <Text style={[styles.primaryBtnText, { color: '#000000' }]}>
                ENTER DIGITAL SLATE & PIPELINE ➔
              </Text>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  stepContainer: {
    width: '100%',
  },
  stepSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  stepSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  visibilityCol: {
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  visCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  visTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  visTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  visDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  reqDept: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  reqRole: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  reqSpecs: {
    fontSize: 11,
    marginTop: 2,
  },
  delBtn: {
    padding: 6,
  },
  addRoleCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 20,
  },
  addRoleHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  inputSm: {
    height: 42,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  addBtn: {
    height: 38,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterBox: {
    width: 140,
    height: 210,
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterEmptyText: {
    fontSize: 11,
    marginTop: 8,
  },
  uploadBtn: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  skipBtn: {
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  readySub: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});