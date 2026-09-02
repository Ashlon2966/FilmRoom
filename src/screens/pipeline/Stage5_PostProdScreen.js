import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import StageProgressBar from '../../components/StageProgressBar';
import CustomButton from '../../components/CustomButton';
import { exportTakesToXLSX } from '../../services/exportXLSX';

export default function Stage5_PostProdScreen() {
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [circleTakes, setCircleTakes] = useState([]);

  useEffect(() => {
    if (!activeRoomId) return;
    const q = query(
      collection(db, 'rooms', activeRoomId, 'takes'),
      where('status', '==', 'CIRCLE')
    );
    const unsub = onSnapshot(q, (snap) => {
      setCircleTakes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeRoomId]);

  const handleExportEditorBin = () => {
    const data = circleTakes.map((t) => ({
      Scene: t.scene,
      Shot: t.shot,
      Take: t.take,
      Verdict: 'CIRCLE TAKE (SELECT)',
      Notes: t.notes,
    }));
    exportTakesToXLSX(`${roomData?.title || 'Edit'}_CircleTakes`, data);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ paddingHorizontal: 12 }}>
        <StageProgressBar currentStageIndex={4} onSelectStage={(idx) => setProductionStage(idx)} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>STAGE 5: POST-PRODUCTION</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Circle Takes Bin for Editors & Sound Sync
        </Text>
        <CustomButton
          title="EXPORT CIRCLE TAKES (.XLSX)"
          onPress={handleExportEditorBin}
          style={{ marginVertical: 10 }}
        />
      </View>

      <FlatList
        data={circleTakes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: '#ffd700' }]}>
            <Text style={styles.takeTitle}>
              ★ SCENE {item.scene} | SHOT {item.shot} | TAKE {item.take}
            </Text>
            <Text style={[styles.notes, { color: theme.textSecondary }]}>
              Notes: {item.notes || 'No director notes entered.'}
            </Text>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textSecondary }]}>
            No circle takes flagged during production.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subtitle: { fontSize: 12, marginTop: 2 },
  card: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  takeTitle: { color: '#ffd700', fontSize: 15, fontWeight: 'bold' },
  notes: { fontSize: 13, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
});