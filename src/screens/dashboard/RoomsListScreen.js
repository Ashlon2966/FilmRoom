import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import CustomButton from '../../components/CustomButton';

export default function RoomsListScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { switchRoom } = useRoom();
  const { theme } = useTheme();

  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'rooms'),
      where('memberUids', 'array-contains', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentUser]);

  const handleSelectRoom = (roomId) => {
    switchRoom(roomId);
    navigation.navigate('StagePipeline');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>PRODUCTION ROOMS</Text>
        <CustomButton
          title="+ NEW FILM"
          onPress={() => navigation.navigate('CreateRoom')}
          style={{ paddingVertical: 6, paddingHorizontal: 12 }}
        />
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleSelectRoom(item.id)}
          >
            <View style={styles.row}>
              <Text style={[styles.roomTitle, { color: theme.text }]}>{item.title}</Text>
              <View style={[styles.stageBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.stageText}>{item.stageName || 'Idea'}</Text>
              </View>
            </View>
            <Text style={[styles.genre, { color: theme.textSecondary }]}>{item.genre || 'Film Project'}</Text>
            <Text style={[styles.logline, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.logline || 'Tap to enter production workspace.'}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              You are not part of any production rooms yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomTitle: { fontSize: 16, fontWeight: '800' },
  stageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  stageText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  genre: { fontSize: 12, marginVertical: 3 },
  logline: { fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', fontSize: 13, fontStyle: 'italic' },
});