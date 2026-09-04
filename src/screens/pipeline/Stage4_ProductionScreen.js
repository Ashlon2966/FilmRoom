import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import StageProgressBar from '../../components/StageProgressBar';
import BackButton from '../../components/BackButton';

export default function Stage4_ProductionScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  // Slate Inputs
  const [scene, setScene] = useState('1A');
  const [shot, setShot] = useState('1');
  const [take, setTake] = useState('1');
  const [roll, setRoll] = useState('A001');
  const [lens, setLens] = useState('35mm Anamorphic');
  const [notes, setNotes] = useState('');
  const [isCircleTake, setIsCircleTake] = useState(false);
  const [takesList, setTakesList] = useState([]);

  // Stream Takes subcollection in real time
  useEffect(() => {
    if (!activeRoomId) return;

    const takesRef = collection(db, 'rooms', activeRoomId, 'takes');
    const q = query(takesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setTakesList(loaded);
    });

    return () => unsubscribe();
  }, [activeRoomId]);

  // Log on-set take
  const handleLogTake = async () => {
    if (!scene.trim() || !take.trim()) {
      Alert.alert('Required', 'Please specify at least Scene and Take.');
      return;
    }

    try {
      const takesRef = collection(db, 'rooms', activeRoomId, 'takes');
      await addDoc(takesRef, {
        scene: scene.trim(),
        shot: shot.trim(),
        take: parseInt(take, 10) || 1,
        roll: roll.trim(),
        lens: lens.trim(),
        notes: notes.trim(),
        isCircleTake,
        loggedBy: userProfile?.fullName || currentUser.email,
        timestamp: serverTimestamp(),
      });

      // Auto-increment take number
      setTake((prev) => String(parseInt(prev, 10) + 1));
      setNotes('');
      setIsCircleTake(false);
    } catch (e) {
      Alert.alert('Error Logging Take', e.message);
    }
  };

  // Toggle circle take status
  const handleToggleCircle = async (item) => {
    try {
      const takeRef = doc(db, 'rooms', activeRoomId, 'takes', item.id);
      await updateDoc(takeRef, {
        isCircleTake: !item.isCircleTake,
      });
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
            <StageProgressBar currentStageIndex={3} onSelectStage={(idx) => setProductionStage(idx)} />
          </View>
        </View>

        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.stageTitle, { color: theme?.text || '#ffffff' }]}>
              STAGE 4: PRINCIPAL PHOTOGRAPHY
            </Text>
            <Text style={[styles.stageSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
              Live Camera Slate, Take Logging & Script Supervision
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: '#1e3d29' }]}>
            <Text style={[styles.statusTagText, { color: '#4ade80' }]}>LIVE SHOOT</Text>
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
        {/* Visual Clapper Slate Card */}
        <View style={[styles.slateCard, { backgroundColor: '#000000', borderColor: theme?.cardBorder || '#242830' }]}>
          <View style={styles.clapperStripeRow}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={[styles.clapperStripe, { backgroundColor: i % 2 === 0 ? '#ffffff' : '#000000' }]} />
            ))}
          </View>

          <Text style={styles.slateFilmTitle}>{roomData?.title || 'FILMROOM PRODUCTION'}</Text>

          <View style={styles.slateGrid}>
            <View style={styles.slateCol}>
              <Text style={styles.slateLabel}>SCENE</Text>
              <TextInput
                style={styles.slateInput}
                value={scene}
                onChangeText={setScene}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.slateCol}>
              <Text style={styles.slateLabel}>SHOT</Text>
              <TextInput
                style={styles.slateInput}
                value={shot}
                onChangeText={setShot}
              />
            </View>
            <View style={styles.slateCol}>
              <Text style={styles.slateLabel}>TAKE</Text>
              <TextInput
                style={styles.slateInput}
                value={take}
                onChangeText={setTake}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.slateCol}>
              <Text style={styles.slateLabel}>ROLL</Text>
              <TextInput
                style={styles.slateInput}
                value={roll}
                onChangeText={setRoll}
              />
            </View>
          </View>

          <View style={styles.lensRow}>
            <Text style={styles.lensLabel}>LENS / FPS: </Text>
            <TextInput
              style={styles.lensInput}
              value={lens}
              onChangeText={setLens}
            />
          </View>

          <TextInput
            style={styles.notesInput}
            placeholder="Director / Script supervisor notes (e.g. Good reset on actor turn)..."
            placeholderTextColor="#666666"
            value={notes}
            onChangeText={setNotes}
          />

          {/* Circle Take Toggle */}
          <TouchableOpacity
            style={[styles.circleToggle, isCircleTake && styles.circleToggleActive]}
            onPress={() => setIsCircleTake(!isCircleTake)}
          >
            <Text style={[styles.circleToggleText, isCircleTake && { color: '#000000', fontWeight: 'bold' }]}>
              {isCircleTake ? '⭐ CIRCLE TAKE (SELECTED FOR EDIT)' : '☆ Mark as Circle Take'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.logTakeBtn, { backgroundColor: theme?.primary || '#f5a623' }]} onPress={handleLogTake}>
            <Text style={styles.logTakeBtnText}>🎬 LOG TAKE TO CLOUD SLATE</Text>
          </TouchableOpacity>
        </View>

        {/* Live Takes Feed */}
        <View style={[styles.feedSection, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          <Text style={[styles.feedHeading, { color: theme?.text || '#ffffff' }]}>
            LOGGED TAKES ({takesList.length})
          </Text>

          {takesList.length > 0 ? (
            takesList.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.takeRow,
                  { backgroundColor: theme?.surface || '#121417', borderColor: item.isCircleTake ? '#f5a623' : theme?.cardBorder || '#242830' },
                ]}
              >
                <View style={styles.takeBadgeCol}>
                  <Text style={[styles.takeSceneShot, { color: theme?.text || '#ffffff' }]}>
                    SC {item.scene} • SH {item.shot}
                  </Text>
                  <Text style={[styles.takeNum, { color: theme?.primary || '#f5a623' }]}>
                    TK {item.take}
                  </Text>
                </View>

                <View style={styles.takeDetailsCol}>
                  <Text style={[styles.takeLensText, { color: theme?.textSecondary || '#9ca3af' }]}>
                    Roll {item.roll} • {item.lens}
                  </Text>
                  {item.notes ? (
                    <Text style={[styles.takeNotesText, { color: theme?.text || '#ffffff' }]}>
                      "{item.notes}"
                    </Text>
                  ) : null}
                  <Text style={[styles.takeMetaText, { color: theme?.textMuted || '#64748b' }]}>
                    Logged by {item.loggedBy}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.circleBtn, item.isCircleTake && { backgroundColor: '#3d2e14' }]}
                  onPress={() => handleToggleCircle(item)}
                >
                  <Text style={{ fontSize: 18 }}>{item.isCircleTake ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyTakesText, { color: theme?.textSecondary || '#9ca3af' }]}>
              No takes logged yet for this room. Fill out the clapper above to log take 1.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.advanceBtn, { backgroundColor: theme?.primary || '#f5a623', marginTop: 16 }]}
            onPress={() => setProductionStage(4)}
          >
            <Text style={styles.advanceBtnText}>Advance to Stage 5: Post-Production ➔</Text>
          </TouchableOpacity>
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
  slateCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 18 },
  clapperStripeRow: { flexDirection: 'row', height: 16, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  clapperStripe: { flex: 1 },
  slateFilmTitle: { color: '#ffffff', fontSize: 14, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 14 },
  slateGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  slateCol: { flex: 1, backgroundColor: '#181b1f', padding: 8, borderRadius: 6, alignItems: 'center' },
  slateLabel: { color: '#888888', fontSize: 9, fontWeight: '800' },
  slateInput: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 4, textAlign: 'center', width: '100%' },
  lensRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#181b1f', paddingHorizontal: 10, borderRadius: 6, marginBottom: 10 },
  lensLabel: { color: '#888888', fontSize: 11, fontWeight: '700' },
  lensInput: { color: '#ffffff', fontSize: 12, flex: 1, paddingVertical: 6 },
  notesInput: { backgroundColor: '#181b1f', color: '#ffffff', borderRadius: 6, padding: 10, fontSize: 12, marginBottom: 12 },
  circleToggle: { paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#f5a623', alignItems: 'center', marginBottom: 10 },
  circleToggleActive: { backgroundColor: '#f5a623' },
  circleToggleText: { color: '#f5a623', fontSize: 12, fontWeight: '700' },
  logTakeBtn: { paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  logTakeBtnText: { color: '#000000', fontSize: 13, fontWeight: '900' },
  feedSection: { padding: 16, borderRadius: 10, borderWidth: 1 },
  feedHeading: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12 },
  takeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  takeBadgeCol: { alignItems: 'center', paddingRight: 12, borderRightWidth: 1, borderColor: '#242830' },
  takeSceneShot: { fontSize: 11, fontWeight: 'bold' },
  takeNum: { fontSize: 16, fontWeight: '900', marginTop: 2 },
  takeDetailsCol: { flex: 1, paddingHorizontal: 12 },
  takeLensText: { fontSize: 11 },
  takeNotesText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  takeMetaText: { fontSize: 10, marginTop: 4 },
  circleBtn: { padding: 6, borderRadius: 6 },
  emptyTakesText: { fontSize: 12, fontStyle: 'italic', marginVertical: 8 },
  advanceBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  advanceBtnText: { color: '#000000', fontSize: 13, fontWeight: '900' },
});