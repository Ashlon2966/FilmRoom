import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import ClapperSlate from '../../components/ClapperSlate';
import StageProgressBar from '../../components/StageProgressBar';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { exportTakesToXLSX } from '../../services/exportXLSX';

export default function Stage4_ProductionScreen() {
  const { activeRoomId, roomData, setProductionStage } = useRoom();
  const { theme } = useTheme();

  const [scene, setScene] = useState('1');
  const [shot, setShot] = useState('A');
  const [takeNumber, setTakeNumber] = useState(1);
  const [status, setStatus] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [takes, setTakes] = useState([]);

  useEffect(() => {
    if (!activeRoomId) return;
    const q = query(collection(db, 'rooms', activeRoomId, 'takes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTakes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeRoomId]);

  const handleLogTake = async () => {
    try {
      await addDoc(collection(db, 'rooms', activeRoomId, 'takes'), {
        scene: scene.trim(),
        shot: shot.trim().toUpperCase(),
        take: Number(takeNumber),
        status,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      });
      setNotes('');
      setTakeNumber((prev) => prev + 1);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleExportSpreadsheet = () => {
    const formatted = takes.map((t) => ({
      Scene: t.scene,
      Shot: t.shot,
      Take: t.take,
      Status: t.status,
      Notes: t.notes,
    }));
    exportTakesToXLSX(`${roomData?.title || 'Takes'}_ProductionLog`, formatted);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ paddingHorizontal: 12 }}>
        <StageProgressBar currentStageIndex={3} onSelectStage={(idx) => setProductionStage(idx)} />
      </View>

      <ClapperSlate
        production={roomData?.title || 'UNTITLED'}
        director={roomData?.creatorEmail || 'Lead'}
        scene={scene}
        shot={shot}
        take={takeNumber}
      />

      <View style={styles.controls}>
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <CustomInput label="Scene" value={scene} onChangeText={setScene} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <CustomInput label="Shot" value={shot} onChangeText={setShot} autoCapitalize="characters" />
          </View>
          <View style={{ flex: 1 }}>
            <CustomInput label="Take" value={String(takeNumber)} onChangeText={(t) => setTakeNumber(Number(t) || 1)} keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.statusRow}>
          {['CIRCLE', 'GOOD', 'NG'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.statusBtn, status === opt && { backgroundColor: theme.primary }]}
              onPress={() => setStatus(opt)}
            >
              <Text style={styles.statusText}>{opt === 'CIRCLE' ? '★ CIRCLE' : opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <CustomInput placeholder="Director/Camera notes..." value={notes} onChangeText={setNotes} />

        <View style={styles.btnRow}>
          <CustomButton title="LOG TAKE" onPress={handleLogTake} style={{ flex: 2 }} />
          <CustomButton title="EXPORT .XLSX" variant="secondary" onPress={handleExportSpreadsheet} style={{ flex: 1 }} />
        </View>
      </View>

      <FlatList
        data={takes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.takeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.takeBadge, { color: item.status === 'CIRCLE' ? '#ffd700' : theme.text }]}>
              Sc {item.scene} / {item.shot} - T{item.take} [{item.status}]
            </Text>
            {item.notes ? <Text style={[styles.takeNotes, { color: theme.textSecondary }]}>{item.notes}</Text> : null}
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { paddingHorizontal: 12 },
  inputRow: { flexDirection: 'row', gap: 8 },
  statusRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  statusBtn: { flex: 1, paddingVertical: 8, backgroundColor: '#262626', borderRadius: 6, alignItems: 'center' },
  statusText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  takeRow: { padding: 10, borderRadius: 6, borderWidth: 1, marginBottom: 6 },
  takeBadge: { fontSize: 14, fontWeight: 'bold' },
  takeNotes: { fontSize: 12, marginTop: 2 },
});