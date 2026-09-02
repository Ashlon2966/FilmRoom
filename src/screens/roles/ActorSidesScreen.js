import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import { getActorSides } from '../../utils/fountainParser';

export default function ActorSidesScreen() {
  const { activeRoomId } = useRoom();
  const { theme } = useTheme();

  const [characterName, setCharacterName] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [dialogueSides, setDialogueSides] = useState([]);

  useEffect(() => {
    if (!activeRoomId) return;
    const fetchScript = async () => {
      const snap = await getDoc(doc(db, 'rooms', activeRoomId, 'screenplay', 'master'));
      if (snap.exists()) {
        setScriptText(snap.data().content || '');
      }
    };
    fetchScript();
  }, [activeRoomId]);

  useEffect(() => {
    if (characterName.trim() && scriptText) {
      const sides = getActorSides(scriptText, characterName);
      setDialogueSides(sides);
    } else {
      setDialogueSides([]);
    }
  }, [characterName, scriptText]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.filterBox}>
        <Text style={[styles.title, { color: theme.text }]}>ACTOR SIDES & CUES</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Enter Character Name (e.g. ALEX)"
          placeholderTextColor={theme.textSecondary}
          value={characterName}
          onChangeText={setCharacterName}
          autoCapitalize="characters"
        />
      </View>

      <FlatList
        data={dialogueSides}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <View style={[styles.sideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sceneHeading, { color: theme.primary }]}>{item.scene}</Text>
            <Text style={[styles.charName, { color: theme.text }]}>{item.character}</Text>
            <Text style={[styles.line, { color: theme.textSecondary }]}>{item.line}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textSecondary }]}>
            {characterName ? 'No dialogue cues found for this character.' : 'Enter a character name to filter lines.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBox: { padding: 16, borderBottomWidth: 1, borderColor: '#222' },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  sideCard: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  sceneHeading: { fontSize: 12, fontWeight: 'bold' },
  charName: { fontSize: 15, fontWeight: '900', marginTop: 4 },
  line: { fontSize: 14, marginTop: 4, fontStyle: 'italic', lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 60, fontStyle: 'italic' },
});