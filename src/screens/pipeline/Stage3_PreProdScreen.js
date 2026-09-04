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
import * as FileSystem from 'expo-file-system';
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

export default function Stage3_PreProdScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [callSheetDate, setCallSheetDate] = useState('');
  const [generalCallTime, setGeneralCallTime] = useState('');
  const [shootingLocation, setShootingLocation] = useState('');
  const [hospitalInfo, setHospitalInfo] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [preProdState, setPreProdState] = useState({
    status: 'PLANNING', // 'PLANNING' | 'LOCKED'
    callSheetFile: null,
    gearChecklist: [],
  });

  const userRoles =
    roomData?.members?.[currentUser?.uid]?.roles ||
    userProfile?.roles ||
    [];

  const canManage =
    userRoles.includes('Director') ||
    userRoles.includes('Producer') ||
    roomData?.creatorId === currentUser?.uid;

  useEffect(() => {
    if (!activeRoomId) return;

    const roomRef = doc(db, 'rooms', activeRoomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.stage3) {
          setCallSheetDate(data.stage3.callSheetDate || '');
          setGeneralCallTime(data.stage3.generalCallTime || '');
          setShootingLocation(data.stage3.shootingLocation || '');
          setHospitalInfo(data.stage3.hospitalInfo || '');
          setWeatherNotes(data.stage3.weatherNotes || '');
          setPreProdState({
            status: data.stage3.status || 'PLANNING',
            callSheetFile: data.stage3.callSheetFile || null,
            gearChecklist: data.stage3.gearChecklist || [],
          });
        }
      }
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  const handleSaveLogistics = async () => {
    if (!activeRoomId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage3.callSheetDate': callSheetDate.trim(),
        'stage3.generalCallTime': generalCallTime.trim(),
        'stage3.shootingLocation': shootingLocation.trim(),
        'stage3.hospitalInfo': hospitalInfo.trim(),
        'stage3.weatherNotes': weatherNotes.trim(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Saved', 'Call sheet logistics saved.');
    } catch (error) {
      Alert.alert('Save Failed', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickCallSheet = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setIsUploading(true);

      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage3.callSheetFile': {
          name: file.name,
          size: file.size,
          base64: base64Data,
          uploadedBy: userProfile?.fullName || currentUser.email,
          uploadedAt: new Date().toISOString(),
        },
      });

      Alert.alert('Uploaded', `Attached "${file.name}" to Call Sheet distribution.`);
    } catch (e) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleToggleLock = async () => {
    const nextStatus = preProdState.status === 'LOCKED' ? 'PLANNING' : 'LOCKED';
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage3.status': nextStatus,
      });
      Alert.alert('Updated', `Pre-production schedule is now ${nextStatus}.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={[styles.mainScreen, { backgroundColor: theme?.background || '#0c0d0e' }]}>
      {/* 1. STATIONARY TOP SECTION */}
      <View style={[styles.stationaryHeader, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <View style={styles.topNavRow}>
          <BackButton onPress={() => navigation.navigate('TheBoardTab', { screen: 'RoomsList' })} />
          <View style={{ flex: 1 }}>
            <StageProgressBar currentStageIndex={2} onSelectStage={(idx) => setProductionStage(idx)} />
          </View>
        </View>

        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.stageTitle, { color: theme?.text || '#ffffff' }]}>
              STAGE 3: PRE-PRODUCTION
            </Text>
            <Text style={[styles.stageSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
              Logistics, Call Sheets & Location Operations
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: preProdState.status === 'LOCKED' ? '#1e3d29' : '#2a2215' }]}>
            <Text style={[styles.statusTagText, { color: preProdState.status === 'LOCKED' ? '#4ade80' : theme?.primary || '#f5a623' }]}>
              {preProdState.status}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. SCROLLABLE CONTENT BODY */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Call Sheet Overview */}
        <View style={[styles.sectionCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>📅 DAY 1 CALL SHEET SPECIFICATIONS</Text>

          <CustomInput
            label="Call Sheet Date"
            placeholder="e.g. October 14, 2026"
            value={callSheetDate}
            onChangeText={setCallSheetDate}
            editable={canManage}
          />

          <CustomInput
            label="General Crew Call Time"
            placeholder="e.g. 06:00 AM (Breakfast at 05:30 AM)"
            value={generalCallTime}
            onChangeText={setGeneralCallTime}
            editable={canManage}
          />

          <CustomInput
            label="Basecamp & Shooting Location"
            placeholder="e.g. Joshua Tree South Entrance, CA"
            value={shootingLocation}
            onChangeText={setShootingLocation}
            editable={canManage}
          />

          <CustomInput
            label="Nearest Emergency Hospital"
            placeholder="e.g. Hi-Desert Medical Center, 6601 White Feather Rd"
            value={hospitalInfo}
            onChangeText={setHospitalInfo}
            editable={canManage}
          />

          <CustomInput
            label="Weather, Sun Times & Special Safety"
            placeholder="Sunrise 06:48, Sunset 18:12. High wind warnings in canyon."
            value={weatherNotes}
            onChangeText={setWeatherNotes}
            multiline
            numberOfLines={3}
            editable={canManage}
          />

          {canManage && (
            <CustomButton
              title="SAVE CALL SHEET SPECS"
              onPress={handleSaveLogistics}
              loading={isSaving}
              style={{ marginTop: 10 }}
            />
          )}
        </View>

        {/* Master Call Sheet PDF Attachment */}
        <View style={[styles.sectionCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>📑 OFFICIAL CALL SHEET DOCUMENT (PDF)</Text>
          <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af' }]}>
            Upload complete multi-page daily call sheet with parking maps and actor times.
          </Text>

          {preProdState.callSheetFile ? (
            <View style={[styles.fileBox, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}>
              <Text style={{ fontSize: 24 }}>📄</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.fileName, { color: theme?.text || '#ffffff' }]}>
                  {preProdState.callSheetFile.name}
                </Text>
                <Text style={[styles.fileSub, { color: theme?.textSecondary || '#9ca3af' }]}>
                  Uploaded by {preProdState.callSheetFile.uploadedBy}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDownloadFile(preProdState.callSheetFile)}>
                <Text style={{ color: theme?.primary || '#f5a623', fontWeight: 'bold' }}>Open</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.emptyFileText, { color: theme?.textSecondary || '#9ca3af' }]}>
              No call sheet document attached yet.
            </Text>
          )}

          {canManage && (
            <TouchableOpacity
              style={[styles.uploadBtn, { borderColor: theme?.cardBorder || '#242830', backgroundColor: theme?.surface || '#121417' }]}
              onPress={handlePickCallSheet}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color={theme?.primary || '#f5a623'} size="small" />
              ) : (
                <Text style={[styles.uploadBtnText, { color: theme?.text || '#ffffff' }]}>
                  {preProdState.callSheetFile ? 'Replace Call Sheet PDF' : '+ Upload Call Sheet PDF'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Schedule Lock & Next Stage */}
        {canManage && (
          <View style={[styles.sectionCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
            <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>LOCK SCHEDULE & ADVANCE</Text>
            <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af' }]}>
              Locking pre-production alerts department heads that shooting is confirmed.
            </Text>

            <TouchableOpacity
              style={[styles.lockBtn, { backgroundColor: preProdState.status === 'LOCKED' ? '#2d1515' : '#1e3d29' }]}
              onPress={handleToggleLock}
            >
              <Text style={{ color: preProdState.status === 'LOCKED' ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
                {preProdState.status === 'LOCKED' ? '🔓 Unlock Pre-Production' : '🔒 Lock Call Sheet & Schedule'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.advanceBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
              onPress={() => setProductionStage(3)}
            >
              <Text style={styles.advanceBtnText}>Enter Stage 4: Production & Smart Slate ➔</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainScreen: { flex: 1 },
  stationaryHeader: { paddingTop: 44, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, zIndex: 10, elevation: 4 },
  topNavRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  stageTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.8 },
  stageSubtitle: { fontSize: 11, marginTop: 2 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusTagText: { fontSize: 10, fontWeight: 'bold' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  sectionCard: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10 },
  cardSub: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  fileBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  fileName: { fontSize: 13, fontWeight: '700' },
  fileSub: { fontSize: 11, marginTop: 2 },
  emptyFileText: { fontSize: 12, fontStyle: 'italic', marginBottom: 12 },
  uploadBtn: { paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  uploadBtnText: { fontSize: 12, fontWeight: '700' },
  lockBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  advanceBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  advanceBtnText: { color: '#000000', fontSize: 13, fontWeight: '900' },
});