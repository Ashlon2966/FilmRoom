import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import CustomButton from '../../components/CustomButton';

export default function DirectorScreen() {
  const { activeRoomId, roomData } = useRoom();
  const { theme } = useTheme();
  const [takes, setTakes] = useState([]);

  useEffect(() => {
    if (!activeRoomId) return;
    const q = query(collection(db, 'rooms', activeRoomId, 'takes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTakes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeRoomId]);

  const toggleCircleTake = async (takeId, currentStatus) => {
    const newStatus = currentStatus === 'CIRCLE' ? 'GOOD' : 'CIRCLE';
    try {
      await updateDoc(doc(db, 'rooms', activeRoomId, 'takes', takeId), {
        status: newStatus,
      });
    } catch (err) {
      Alert.alert('Update Failed', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>DIRECTOR MONITOR</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          Project: {roomData?.title || 'Active Set'}
        </Text>
      </View>

      <FlatList
        data={takes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCircle = item.status === 'CIRCLE';
          return (
            <View style={[styles.takeCard, { backgroundColor: theme.card, borderColor: isCircle ? '#ffd700' : theme.border }]}>
              <View style={styles.row}>
                <Text style={[styles.takeId, { color: theme.text }]}>
                  Sc {item.scene} | Shot {item.shot} | Take {item.take}
                </Text>
                <CustomButton
                  title={isCircle ? '★ CIRCLED' : 'CIRCLE TAKE'}
                  variant={isCircle ? 'primary' : 'outline'}
                  onPress={() => toggleCircleTake(item.id, item.status)}
                  style={styles.circleBtn}
                />
              </View>
              {item.notes ? (
                <Text style={[styles.notes, { color: theme.textSecondary }]}>
                  Notes: {item.notes}
                </Text>
              ) : null}
            </View>
          );
        }}
        contentContainerStyle={{ padding: 14 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textSecondary }]}>
            No takes logged on this production yet.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#222' },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  sub: { fontSize: 12, marginTop: 2 },
  takeCard: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  takeId: { fontSize: 15, fontWeight: 'bold' },
  circleBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  notes: { fontSize: 13, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 60, fontStyle: 'italic' },
});