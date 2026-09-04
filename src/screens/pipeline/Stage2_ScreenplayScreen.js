import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
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
import StageProgressBar from '../../components/StageProgressBar';
import BackButton from '../../components/BackButton';

export default function Stage2_ScreenplayScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [screenplayText, setScreenplayText] = useState('');
  const [sceneCount, setSceneCount] = useState('12');
  const [pageCount, setPageCount] = useState('18');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [stage2State, setStage2State] = useState({
    status: 'IN_REVISION',
    fountainFile: null,
  });

  const userRoles =
    roomData?.members?.[currentUser?.uid]?.roles ||
    userProfile?.roles ||
    [];

  const isWriterOrDirector =
    userRoles.includes('Scriptwriter') ||
    userRoles.includes('Director') ||
    roomData?.creatorId === currentUser?.uid;

  useEffect(() => {
    if (!activeRoomId) return;

    const roomRef = doc(db, 'rooms', activeRoomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.stage2) {
          setScreenplayText(data.stage2.screenplayText || '');
          setSceneCount(data.stage2.sceneCount || '12');
          setPageCount(data.stage2.pageCount || '18');
          setStage2State({
            status: data.stage2.status || 'IN_REVISION',
            fountainFile: data.stage2.fountainFile || null,
          });
        }
      }
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  const handleSaveScreenplay = async () => {
    if (!activeRoomId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage2.screenplayText': screenplayText,
        'stage2.sceneCount': sceneCount,
        'stage2.pageCount': pageCount,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Saved', 'Screenplay draft saved to cloud.');
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickFountainFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      setIsUploading(true);

      const content = await FileSystem.readAsStringAsync(file.uri);
      setScreenplayText(content);

      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage2.fountainFile': {
          name: file.name,
          uploadedAt: new Date().toISOString(),
        },
        'stage2.screenplayText': content,
      });

      Alert.alert('Imported', `Loaded script text from "${file.name}".`);
    } catch (err) {
      Alert.alert('Import Failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportText = async () => {
    try {
      const fileUri = `${FileSystem.documentDirectory}${roomData?.title || 'Screenplay'}_Draft.txt`;
      await FileSystem.writeAsStringAsync(fileUri, screenplayText);
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    }
  };

  return (
    <View style={[styles.mainScreen, { backgroundColor: theme?.background || '#0c0d0e' }]}>
      {/* 1. STATIONARY TOP SECTION */}
      <View style={[styles.stationaryHeader, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <View style={styles.topNavRow}>
          <BackButton onPress={() => navigation.navigate('TheBoardTab', { screen: 'RoomsList' })} />
          <View style={{ flex: 1 }}>
            <StageProgressBar currentStageIndex={1} onSelectStage={(idx) => setProductionStage(idx)} />
          </View>
        </View>

        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.stageTitle, { color: theme?.text || '#ffffff' }]}>
              STAGE 2: SCREENPLAY STUDIO
            </Text>
            <Text style={[styles.stageSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
              Scenes: {sceneCount} • Estimated Pages: {pageCount}
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: '#2a2215' }]}>
            <Text style={[styles.statusTagText, { color: theme?.primary || '#f5a623' }]}>
              {stage2State.status}
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
        {/* Quick Actions Bar */}
        <View style={styles.toolsRow}>
          {isWriterOrDirector && (
            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}
              onPress={handlePickFountainFile}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={theme?.primary || '#f5a623'} />
              ) : (
                <Text style={[styles.toolBtnText, { color: theme?.text || '#ffffff' }]}>📂 Import File</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}
            onPress={handleExportText}
          >
            <Text style={[styles.toolBtnText, { color: theme?.text || '#ffffff' }]}>↗ Export Text</Text>
          </TouchableOpacity>

          {isWriterOrDirector && (
            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
              onPress={handleSaveScreenplay}
              disabled={isSaving}
            >
              <Text style={[styles.toolBtnText, { color: '#000000', fontWeight: 'bold' }]}>
                {isSaving ? 'Saving...' : '💾 Save Draft'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Screenplay Editor Canvas */}
        <View style={[styles.editorCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          <Text style={[styles.editorHeading, { color: theme?.textSecondary || '#9ca3af' }]}>
            FORMATTED SCREENPLAY DRAFT
          </Text>
          <TextInput
            style={[styles.screenplayInput, { color: theme?.text || '#ffffff' }]}
            placeholder={`EXT. JOSHUA TREE - DUSK\n\nA lone camera rig stands silhouetted against the amber ridge...\n\nDIRECTOR\nCheck the gate and roll sound.`}
            placeholderTextColor={theme?.textMuted || '#64748b'}
            value={screenplayText}
            onChangeText={setScreenplayText}
            multiline={true}
            editable={isWriterOrDirector}
          />
        </View>

        {/* Progression to Stage 3 */}
        <TouchableOpacity
          style={[styles.advanceBtn, { backgroundColor: theme?.primary || '#f5a623', marginTop: 14 }]}
          onPress={() => setProductionStage(2)}
        >
          <Text style={styles.advanceBtnText}>Advance to Stage 3: Pre-Production ➔</Text>
        </TouchableOpacity>
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
  toolsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  toolBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toolBtnText: { fontSize: 12, fontWeight: '700' },
  editorCard: { borderRadius: 10, borderWidth: 1, padding: 14, minHeight: 380 },
  editorHeading: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  screenplayInput: { fontSize: 13, lineHeight: 22, fontFamily: 'monospace', minHeight: 320, textAlignVertical: 'top' },
  advanceBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  advanceBtnText: { color: '#000000', fontSize: 13, fontWeight: '900' },
});