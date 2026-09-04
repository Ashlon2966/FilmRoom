import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import StageProgressBar from '../../components/StageProgressBar';
import BackButton from '../../components/BackButton';

const CUT_MILESTONES = [
  'Assembly Cut',
  'Rough Cut v1',
  'Fine Cut v2',
  'Picture Lock',
  'Sound Mix & Atmos Complete',
  'Color Grade Conform Complete',
  'Master Delivery / DCP Complete',
];

export default function Stage5_PostProdScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [activeCut, setActiveCut] = useState('Rough Cut v1');
  const [screenerUrl, setScreenerUrl] = useState('');
  const [screenerPassword, setScreenerPassword] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const [completedMilestones, setCompletedMilestones] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const userRoles =
    roomData?.members?.[currentUser?.uid]?.roles ||
    userProfile?.roles ||
    [];

  const canEditPost =
    userRoles.includes('Editor') ||
    userRoles.includes('Director') ||
    userRoles.includes('Producer') ||
    roomData?.creatorId === currentUser?.uid;

  useEffect(() => {
    if (!activeRoomId) return;

    const roomRef = doc(db, 'rooms', activeRoomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.stage5) {
          setActiveCut(data.stage5.activeCut || 'Rough Cut v1');
          setScreenerUrl(data.stage5.screenerUrl || '');
          setScreenerPassword(data.stage5.screenerPassword || '');
          setEditorNotes(data.stage5.editorNotes || '');
          setCompletedMilestones(data.stage5.completedMilestones || []);
        }
      }
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  const handleSavePostDetails = async () => {
    if (!activeRoomId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage5.activeCut': activeCut,
        'stage5.screenerUrl': screenerUrl.trim(),
        'stage5.screenerPassword': screenerPassword.trim(),
        'stage5.editorNotes': editorNotes.trim(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Saved', 'Post-production screener details updated.');
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMilestone = async (milestone) => {
    if (!canEditPost) return;

    let updated = [];
    if (completedMilestones.includes(milestone)) {
      updated = completedMilestones.filter((m) => m !== milestone);
    } else {
      updated = [...completedMilestones, milestone];
    }

    setCompletedMilestones(updated);
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        'stage5.completedMilestones': updated,
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleOpenScreener = async () => {
    if (!screenerUrl.trim()) return;
    try {
      const validUrl = screenerUrl.startsWith('http') ? screenerUrl : `https://${screenerUrl}`;
      const supported = await Linking.canOpenURL(validUrl);
      if (supported) {
        await Linking.openURL(validUrl);
      } else {
        Alert.alert('Invalid URL', 'Cannot open the provided screener link.');
      }
    } catch (e) {
      Alert.alert('Error Opening Link', e.message);
    }
  };

  return (
    <View style={[styles.mainScreen, { backgroundColor: theme?.background || '#0c0d0e' }]}>
      {/* 1. STATIONARY TOP SECTION */}
      <View style={[styles.stationaryHeader, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <View style={styles.topNavRow}>
          <BackButton onPress={() => navigation.navigate('TheBoardTab', { screen: 'RoomsList' })} />
          <View style={{ flex: 1 }}>
            <StageProgressBar currentStageIndex={4} onSelectStage={(idx) => setProductionStage(idx)} />
          </View>
        </View>

        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.stageTitle, { color: theme?.text || '#ffffff' }]}>
              STAGE 5: POST-PRODUCTION
            </Text>
            <Text style={[styles.stageSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
              Editorial, Color Conform, Sound Mix & Delivery
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: '#2a2215' }]}>
            <Text style={[styles.statusTagText, { color: theme?.primary || '#f5a623' }]}>
              {activeCut}
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
        <View style={[styles.sectionCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>
            🎞 PRIVATE SCREENER & DRIVE LINK
          </Text>
          <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af' }]}>
            Link external cuts on Vimeo, Frame.io, or Google Drive for review by the Director and Producer.
          </Text>

          <Text style={[styles.inputLabel, { color: theme?.textSecondary || '#9ca3af' }]}>CURRENT CUT STAGE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme?.surface || '#121417', color: theme?.text || '#ffffff', borderColor: theme?.cardBorder || '#242830' }]}
            value={activeCut}
            onChangeText={setActiveCut}
            editable={canEditPost}
          />

          <Text style={[styles.inputLabel, { color: theme?.textSecondary || '#9ca3af' }]}>
            SCREENER / FRAME.IO / DRIVE URL
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme?.surface || '#121417', color: theme?.text || '#ffffff', borderColor: theme?.cardBorder || '#242830' }]}
            placeholder="https://vimeo.com/... or Frame.io review link"
            placeholderTextColor={theme?.textMuted || '#64748b'}
            value={screenerUrl}
            onChangeText={setScreenerUrl}
            autoCapitalize="none"
            editable={canEditPost}
          />

          <Text style={[styles.inputLabel, { color: theme?.textSecondary || '#9ca3af' }]}>PASSCODE (IF PROTECTED)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme?.surface || '#121417', color: theme?.text || '#ffffff', borderColor: theme?.cardBorder || '#242830' }]}
            placeholder="e.g. RoughCut2026!"
            placeholderTextColor={theme?.textMuted || '#64748b'}
            value={screenerPassword}
            onChangeText={setScreenerPassword}
            editable={canEditPost}
          />

          <Text style={[styles.inputLabel, { color: theme?.textSecondary || '#9ca3af' }]}>EDITOR CUT NOTES</Text>
          <TextInput
            style={[styles.inputArea, { backgroundColor: theme?.surface || '#121417', color: theme?.text || '#ffffff', borderColor: theme?.cardBorder || '#242830' }]}
            placeholder="Notes on temp audio, VFX placeholders, or scene timing..."
            placeholderTextColor={theme?.textMuted || '#64748b'}
            value={editorNotes}
            onChangeText={setEditorNotes}
            multiline
            numberOfLines={3}
            editable={canEditPost}
          />

          {screenerUrl ? (
            <TouchableOpacity style={[styles.openLinkBtn, { backgroundColor: theme?.primary || '#f5a623' }]} onPress={handleOpenScreener}>
              <Text style={styles.openLinkText}>▶ Stream Screener Cut in Browser</Text>
            </TouchableOpacity>
          ) : null}

          {canEditPost && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}
              onPress={handleSavePostDetails}
              disabled={isSaving}
            >
              <Text style={[styles.saveBtnText, { color: theme?.text || '#ffffff' }]}>
                {isSaving ? 'Saving...' : '💾 Save Screener Information'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>
            🎯 POST-PRODUCTION MILESTONES
          </Text>
          <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af' }]}>
            Track the delivery pipeline toward final festival & distribution release.
          </Text>

          {CUT_MILESTONES.map((m) => {
            const isDone = completedMilestones.includes(m);
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.milestoneRow,
                  { backgroundColor: theme?.surface || '#121417', borderColor: isDone ? '#4ade80' : theme?.cardBorder || '#242830' },
                ]}
                onPress={() => handleToggleMilestone(m)}
                activeOpacity={canEditPost ? 0.7 : 1}
              >
                <Text style={{ fontSize: 16, marginRight: 10 }}>{isDone ? '✅' : '⚪'}</Text>
                <Text style={[styles.milestoneText, { color: isDone ? '#4ade80' : theme?.text || '#ffffff' }]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  cardSub: { fontSize: 12, lineHeight: 17, marginBottom: 14 },
  inputLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  input: { borderRadius: 6, borderWidth: 1, padding: 10, fontSize: 13 },
  inputArea: { borderRadius: 6, borderWidth: 1, padding: 10, fontSize: 13, height: 75, textAlignVertical: 'top' },
  openLinkBtn: { paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginTop: 14 },
  openLinkText: { color: '#000000', fontSize: 13, fontWeight: '900' },
  saveBtn: { paddingVertical: 12, borderRadius: 6, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 12, fontWeight: '700' },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6, borderWidth: 1, marginBottom: 8 },
  milestoneText: { fontSize: 13, fontWeight: '600' },
});