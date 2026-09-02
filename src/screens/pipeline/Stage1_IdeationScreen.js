import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import StageProgressBar from '../../components/StageProgressBar';
import RichNotesEditor from '../../components/RichNotesEditor';

export default function Stage1_IdeationScreen() {
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [synopsis, setSynopsis] = useState('');
  const [characters, setCharacters] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeRoomId) return;
    const unsub = onSnapshot(doc(db, 'rooms', activeRoomId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setSynopsis(d.synopsis || '');
        setCharacters(d.characterOutlines || '');
      }
    });
    return () => unsub();
  }, [activeRoomId]);

  const handleSaveIdeation = async () => {
    if (!activeRoomId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId), {
        synopsis: synopsis.trim(),
        characterOutlines: characters.trim(),
      });
      Alert.alert('Saved', 'Project ideation saved to cloud.');
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <StageProgressBar currentStageIndex={0} onSelectStage={(idx) => setProductionStage(idx)} />

      <Text style={[styles.title, { color: theme.text }]}>STAGE 1: IDEATION & STORY</Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Film: {roomData?.title || 'Loading...'} | Genre: {roomData?.genre || 'Unassigned'}
      </Text>

      <CustomInput
        label="Logline"
        value={roomData?.logline || 'No logline entered.'}
        editable={false}
      />

      <CustomInput
        label="Story Synopsis / Treatment"
        placeholder="Expand the beginning, middle, and climax..."
        value={synopsis}
        onChangeText={setSynopsis}
        multiline
        numberOfLines={6}
      />

      <CustomInput
        label="Character Outlines & Motivations"
        placeholder="Protagonist: goal, obstacle, flaw..."
        value={characters}
        onChangeText={setCharacters}
        multiline
        numberOfLines={5}
      />

      <CustomButton
        title="SAVE STORY OUTLINE"
        onPress={handleSaveIdeation}
        loading={saving}
        style={{ marginBottom: 20 }}
      />

      {/* Embedded Rich Word-Style Notes Canvas */}
      <Text style={[styles.notesHeading, { color: theme.text }]}>CONCEPT BOARD & RESEARCH</Text>
      <View style={styles.editorBox}>
        <RichNotesEditor roomId={activeRoomId} noteId="stage1_ideation_notes" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  meta: { fontSize: 12, marginBottom: 14 },
  notesHeading: { fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  editorBox: { height: 480, marginBottom: 40 },
});