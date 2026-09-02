import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import StageProgressBar from '../../components/StageProgressBar';
import { exportScriptToPDF } from '../../services/exportPDF';
import { exportToTXT } from '../../services/exportTXT';

const FOUNTAIN_STARTER = `INT. COFFEE SHOP - DAY

ALEX sits at a corner table with a worn leather notebook.

ALEX
(whispering)
If they find this slate, the whole shoot is compromised.

SARAH enters, raincoat soaked.`;

export default function Stage2_ScreenplayScreen() {
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [scriptText, setScriptText] = useState(FOUNTAIN_STARTER);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeRoomId) return;
    const loadScript = async () => {
      const snap = await getDoc(doc(db, 'rooms', activeRoomId, 'screenplay', 'master'));
      if (snap.exists()) {
        setScriptText(snap.data().content || '');
      }
    };
    loadScript();
  }, [activeRoomId]);

  const handleSaveScript = async () => {
    if (!activeRoomId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'rooms', activeRoomId, 'screenplay', 'master'),
        {
          content: scriptText,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      Alert.alert('Saved', 'Screenplay synced to FilmRoom cloud.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    exportScriptToPDF(
      {
        title: roomData?.title || 'UNTITLED',
        writer: roomData?.creatorEmail || 'Filmmaker',
        genre: roomData?.genre,
        logline: roomData?.logline,
        stage: 'Screenplay',
      },
      scriptText
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ paddingHorizontal: 12 }}>
        <StageProgressBar currentStageIndex={1} onSelectStage={(idx) => setProductionStage(idx)} />
      </View>

      <View style={[styles.actionBar, { borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>STAGE 2: SCREENPLAY</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.surface }]} onPress={() => exportToTXT('Script', scriptText)}>
            <Text style={[styles.btnText, { color: theme.text }]}>.TXT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.surface }]} onPress={handleExportPDF}>
            <Text style={[styles.btnText, { color: theme.text }]}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleSaveScript} disabled={saving}>
            <Text style={[styles.btnText, { color: '#FFF' }]}>{saving ? '...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={[styles.editor, { backgroundColor: theme.card, color: theme.text }]}
        value={scriptText}
        onChangeText={setScriptText}
        multiline
        autoCapitalize="sentences"
        placeholder="Write in standard screenplay or Fountain format..."
        placeholderTextColor={theme.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  title: { fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  buttonRow: { flexDirection: 'row', gap: 6 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnText: { fontSize: 11, fontWeight: 'bold' },
  editor: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    padding: 16,
    textAlignVertical: 'top',
  },
});