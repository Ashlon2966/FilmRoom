import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import StageProgressBar from '../../components/StageProgressBar';
import BackButton from '../../components/BackButton';

export default function Stage1_IdeationScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  // Local state
  const [synopsis, setSynopsis] = useState('');
  const [characterOutlines, setCharacterOutlines] = useState('');
  const [isSavingOutline, setIsSavingOutline] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Cloud Stage 1 State
  const [stageState, setStageState] = useState({
    status: 'DRAFTING', // 'DRAFTING' | 'UNDER_REVIEW' | 'APPROVED'
    scriptFile: null,   // { name, size, base64, uploadedBy }
    shotListFile: null, // { name, size, base64 }
    delegates: [],
  });

  const userRoles =
    roomData?.members?.[currentUser?.uid]?.roles ||
    userProfile?.roles ||
    [];

  const isDirector =
    userRoles.includes('Director') ||
    roomData?.creatorId === currentUser?.uid;

  const isWriter =
    userRoles.includes('Scriptwriter') ||
    isDirector;

  const isDelegatedReviewer =
    stageState.delegates?.includes(currentUser?.uid);

  const canReviewScript = isDirector || isDelegatedReviewer;

  // Real-time Firestore sync
  useEffect(() => {
    if (!activeRoomId) return;

    const roomRef = doc(db, 'rooms', activeRoomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSynopsis(data.synopsis || '');
        setCharacterOutlines(data.characterOutlines || '');

        if (data.stage1) {
          setStageState({
            status: data.stage1.status || 'DRAFTING',
            scriptFile: data.stage1.scriptFile || null,
            shotListFile: data.stage1.shotListFile || null,
            delegates: data.stage1.delegates || [],
          });
        }
      }
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  // Save text notes
  const handleSaveOutline = async () => {
    if (!activeRoomId) return;
    setIsSavingOutline(true);
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        synopsis: synopsis.trim(),
        characterOutlines: characterOutlines.trim(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Saved', 'Story treatment and characters saved to cloud.');
    } catch (error) {
      Alert.alert('Save Failed', error.message);
    } finally {
      setIsSavingOutline(false);
    }
  };

  // Upload Screenplay PDF
  const handlePickScriptPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setIsUploadingFile(true);

      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const scriptPayload = {
        name: file.name,
        size: file.size,
        base64: base64Data,
        uploadedBy: userProfile?.fullName || currentUser.email,
        uploadedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage1.scriptFile': scriptPayload,
        'stage1.status': 'DRAFTING',
      });

      Alert.alert('File Uploaded', `"${file.name}" attached successfully.`);
    } catch (err) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Submit script for Director review
  const handleSubmitScriptForReview = async () => {
    if (!stageState.scriptFile) {
      Alert.alert('Required', 'Please upload a PDF script file first.');
      return;
    }

    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage1.status': 'UNDER_REVIEW',
      });
      Alert.alert('Submitted', 'The script has been sent to the Director for review.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Director approves script
  const handleDirectorApprove = async () => {
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage1.status': 'APPROVED',
      });
      Alert.alert('Approved', 'Script approved! Stage 1 completed. Shot list upload unlocked.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Director requests revisions
  const handleDirectorRequestRevision = async () => {
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage1.status': 'DRAFTING',
      });
      Alert.alert('Feedback Sent', 'Script returned to the writer for revisions.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Upload Shot List (.xlsx, .csv, .pdf)
  const handlePickShotList = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setIsUploadingFile(true);

      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage1.shotListFile': {
          name: file.name,
          size: file.size,
          base64: base64Data,
          uploadedAt: new Date().toISOString(),
        },
      });

      Alert.alert('Shot List Uploaded', `"${file.name}" submitted. Moving to Stage 2.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Open/View attached file
  const handleDownloadFile = async (fileObj) => {
    if (!fileObj?.base64) return;
    try {
      const fileUri = `${FileSystem.documentDirectory}${fileObj.name}`;
      await FileSystem.writeAsStringAsync(fileUri, fileObj.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert('Open Failed', e.message);
    }
  };

  return (
    <View style={[styles.mainScreen, { backgroundColor: theme?.background || '#0c0d0e' }]}>
      {/* 1. STATIONARY TOP HEADER (Pinned permanently at top) */}
      <View style={[styles.stationaryHeader, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <View style={styles.topNavRow}>
          <BackButton onPress={() => navigation.navigate('TheBoardTab', { screen: 'RoomsList' })} />
          <View style={{ flex: 1 }}>
            <StageProgressBar
              currentStageIndex={0}
              onSelectStage={(idx) => setProductionStage(idx)}
            />
          </View>
        </View>

        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.stageTitle, { color: theme?.text || '#ffffff' }]}>
              STAGE 1: IDEATION & STORY
            </Text>
            <Text style={[styles.stageSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
              Film: {roomData?.title || 'Production'} • Genre: {roomData?.genre || 'Drama'}
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: stageState.status === 'APPROVED' ? '#1e3d29' : '#2a2215' }]}>
            <Text style={[styles.statusTagText, { color: stageState.status === 'APPROVED' ? '#4ade80' : theme?.primary || '#f5a623' }]}>
              {stageState.status}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. SCROLLABLE CONTENT BODY (Scroll with native indicator) */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <CustomInput
          label="Logline"
          value={roomData?.logline || 'No logline entered.'}
          editable={false}
        />

        {isWriter ? (
          <>
            <CustomInput
              label="Story Synopsis / Treatment"
              placeholder="Expand the plot, character arcs, and thematic stakes..."
              value={synopsis}
              onChangeText={setSynopsis}
              multiline
              numberOfLines={4}
            />

            <CustomInput
              label="Character Outlines & Motivations"
              placeholder="Protagonist: goal, obstacle, flaw..."
              value={characterOutlines}
              onChangeText={setCharacterOutlines}
              multiline
              numberOfLines={4}
            />

            <CustomButton
              title="SAVE STORY OUTLINE"
              onPress={handleSaveOutline}
              loading={isSavingOutline}
              style={{ marginBottom: 18 }}
            />
          </>
        ) : null}

        {/* Locked view for non-reviewing crew */}
        {!isWriter && !canReviewScript && stageState.status !== 'APPROVED' && (
          <View style={[styles.lockedCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
            <Text style={styles.lockedIcon}>🔒</Text>
            <Text style={[styles.lockedHeading, { color: theme?.text || '#ffffff' }]}>
              Script in Progress...
            </Text>
            <Text style={[styles.lockedSub, { color: theme?.textSecondary || '#9ca3af' }]}>
              The scriptwriter is actively developing the draft. It will unlock once approved by the Director.
            </Text>
          </View>
        )}

        {/* Scriptwriter Upload Box */}
        {isWriter && stageState.status === 'DRAFTING' && (
          <View style={[styles.workflowCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
            <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>
              📄 SCREENPLAY DRAFT (PDF)
            </Text>
            <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af' }]}>
              Upload your complete screenplay draft for Director confirmation.
            </Text>

            {stageState.scriptFile ? (
              <View style={[styles.fileAttachmentRow, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}>
                <Text style={{ fontSize: 24 }}>📑</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.fileName, { color: theme?.text || '#ffffff' }]}>
                    {stageState.scriptFile.name}
                  </Text>
                  <Text style={[styles.fileMeta, { color: theme?.textSecondary || '#9ca3af' }]}>
                    Uploaded by {stageState.scriptFile.uploadedBy}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDownloadFile(stageState.scriptFile)}>
                  <Text style={{ color: theme?.primary || '#f5a623', fontWeight: 'bold' }}>View</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.actionButtonRow}>
              <TouchableOpacity
                style={[styles.uploadBtn, { borderColor: theme?.cardBorder || '#242830', backgroundColor: theme?.surface || '#121417' }]}
                onPress={handlePickScriptPDF}
                disabled={isUploadingFile}
              >
                {isUploadingFile ? (
                  <ActivityIndicator color={theme?.primary || '#f5a623'} size="small" />
                ) : (
                  <Text style={[styles.uploadBtnText, { color: theme?.text || '#ffffff' }]}>
                    {stageState.scriptFile ? 'Replace PDF Script' : '+ Upload Script (PDF)'}
                  </Text>
                )}
              </TouchableOpacity>

              {stageState.scriptFile ? (
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
                  onPress={handleSubmitScriptForReview}
                >
                  <Text style={styles.submitBtnText}>Submit to Director ➔</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* Director Review Card */}
        {stageState.status === 'UNDER_REVIEW' && (
          <View style={[styles.workflowCard, { backgroundColor: theme?.card || '#181b1f', borderColor: '#f5a623' }]}>
            <View style={styles.reviewBanner}>
              <Text style={{ fontSize: 20 }}>🎬</Text>
              <Text style={[styles.reviewBannerText, { color: theme?.primary || '#f5a623' }]}>
                Director is Reviewing the Script... Waiting for Confirmation
              </Text>
            </View>

            {stageState.scriptFile && (
              <TouchableOpacity
                style={[styles.fileAttachmentRow, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}
                onPress={() => handleDownloadFile(stageState.scriptFile)}
              >
                <Text style={{ fontSize: 24 }}>📑</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.fileName, { color: theme?.text || '#ffffff' }]}>
                    {stageState.scriptFile.name}
                  </Text>
                  <Text style={[styles.fileMeta, { color: theme?.textSecondary || '#9ca3af' }]}>
                    Tap to open and read PDF
                  </Text>
                </View>
                <Text style={{ color: theme?.primary || '#f5a623', fontWeight: 'bold' }}>Open PDF</Text>
              </TouchableOpacity>
            )}

            {canReviewScript ? (
              <View style={styles.directorActionRow}>
                <TouchableOpacity
                  style={[styles.rejectBtn, { backgroundColor: '#332020' }]}
                  onPress={handleDirectorRequestRevision}
                >
                  <Text style={{ color: '#f87171', fontWeight: 'bold' }}>Request Changes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approveBtn, { backgroundColor: '#1e3d29' }]}
                  onPress={handleDirectorApprove}
                >
                  <Text style={{ color: '#4ade80', fontWeight: 'bold' }}>✔ Approve Script</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.waitingNotice, { color: theme?.textSecondary || '#9ca3af' }]}>
                Awaiting sign-off from the Director before moving to Pre-Production.
              </Text>
            )}
          </View>
        )}

        {/* Stage Approved: Unlock Shot List */}
        {stageState.status === 'APPROVED' && (
          <View style={[styles.workflowCard, { backgroundColor: theme?.card || '#181b1f', borderColor: '#1e3d29' }]}>
            <Text style={[styles.approvedHeading, { color: '#4ade80' }]}>
              ✔ SCRIPT APPROVED BY DIRECTOR
            </Text>
            <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af' }]}>
              Upload your initial Shot List (.xlsx, .csv, or .pdf) to advance into Pre-Production scheduling.
            </Text>

            {stageState.shotListFile ? (
              <View style={[styles.fileAttachmentRow, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}>
                <Text style={{ fontSize: 24 }}>📊</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.fileName, { color: theme?.text || '#ffffff' }]}>
                    {stageState.shotListFile.name}
                  </Text>
                  <Text style={[styles.fileMeta, { color: theme?.textSecondary || '#9ca3af' }]}>
                    Shot list uploaded • Ready for Pre-Prod
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDownloadFile(stageState.shotListFile)}>
                  <Text style={{ color: theme?.primary || '#f5a623', fontWeight: 'bold' }}>Open</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.uploadBtn, { borderColor: theme?.cardBorder || '#242830', backgroundColor: theme?.surface || '#121417', marginTop: 10 }]}
              onPress={handlePickShotList}
            >
              <Text style={[styles.uploadBtnText, { color: theme?.text || '#ffffff' }]}>
                {stageState.shotListFile ? 'Replace Shot List' : '+ Upload Shot List (.xlsx, .csv, .pdf)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextStageBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
              onPress={() => setProductionStage(1)}
            >
              <Text style={styles.nextStageText}>Proceed to Stage 2 (Screenplay Studio) ➔</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainScreen: { flex: 1 },
  stationaryHeader: {
    paddingTop: 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
    elevation: 4,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  stageTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.8 },
  stageSubtitle: { fontSize: 11, marginTop: 2 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusTagText: { fontSize: 10, fontWeight: 'bold' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  lockedCard: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 14,
  },
  lockedIcon: { fontSize: 32, marginBottom: 8 },
  lockedHeading: { fontSize: 16, fontWeight: '800' },
  lockedSub: { fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  workflowCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  cardSub: { fontSize: 12, marginTop: 4, marginBottom: 12, lineHeight: 17 },
  fileAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  fileName: { fontSize: 13, fontWeight: '700' },
  fileMeta: { fontSize: 11, marginTop: 2 },
  actionButtonRow: { flexDirection: 'row', gap: 10 },
  uploadBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: { fontSize: 12, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#000000', fontSize: 12, fontWeight: '900' },
  reviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  reviewBannerText: { fontSize: 13, fontWeight: '800', flex: 1 },
  directorActionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  approveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  waitingNotice: { textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  approvedHeading: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  nextStageBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  nextStageText: { color: '#000000', fontSize: 13, fontWeight: '900' },
});