import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import StageProgressBar from '../../components/StageProgressBar';

export default function Stage3_PreProdScreen() {
  const { activeRoomId, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [shotNumber, setShotNumber] = useState('');
  const [shotDescription, setShotDescription] = useState('');
  const [lens, setLens] = useState('');
  const [shotList, setShotList] = useState([]);

  useEffect(() => {
    if (!activeRoomId) return;
    const q = query(collection(db, 'rooms', activeRoomId, 'shots'));
    const unsub = onSnapshot(q, (snap) => {
      setShotList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeRoomId]);

  const handleAddShot = async () => {
    if (!shotNumber.trim() || !shotDescription.trim()) {
      Alert.alert('Required', 'Specify shot identifier and description.');
      return;
    }

    try {
      await addDoc(collection(db, 'rooms', activeRoomId, 'shots'), {
        shotNumber: shotNumber.trim().toUpperCase(),
        description: shotDescription.trim(),
        lens: lens.trim() || '35mm',
        createdAt: serverTimestamp(),
      });
      setShotNumber('');
      setShotDescription('');
      setLens('');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ paddingHorizontal: 12 }}>
        <StageProgressBar currentStageIndex={2} onSelectStage={(idx) => setProductionStage(idx)} />
      </View>

      <View style={styles.inputCard}>
        <Text style={[styles.heading, { color: theme.text }]}>SHOT LIST PLANNER</Text>
        <View style={styles.row}>
          <View style={{ width: 80 }}>
            <CustomInput label="Shot" placeholder="1A" value={shotNumber} onChangeText={setShotNumber} />
          </View>
          <View style={{ width: 100 }}>
            <CustomInput label="Lens" placeholder="50mm" value={lens} onChangeText={setLens} />
          </View>
          <View style={{ flex: 1 }}>
            <CustomInput label="Description" placeholder="Close-Up on Protagonist" value={shotDescription} onChangeText={setShotDescription} />
          </View>
        </View>
        <CustomButton title="+ ADD SHOT TO SCHEDULE" onPress={handleAddShot} />
      </View>

      <FlatList
        data={shotList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.shotRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.shotBadge}>
              <Text style={[styles.shotNum, { color: theme.primary }]}>{item.shotNumber}</Text>
              <Text style={[styles.lensText, { color: theme.textSecondary }]}>{item.lens}</Text>
            </View>
            <Text style={[styles.shotDesc, { color: theme.text }]}>{item.description}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textSecondary }]}>No shots planned yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputCard: { padding: 12 },
  heading: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  shotBadge: { width: 70 },
  shotNum: { fontSize: 16, fontWeight: '900' },
  lensText: { fontSize: 11, fontWeight: 'bold' },
  shotDesc: { flex: 1, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
});