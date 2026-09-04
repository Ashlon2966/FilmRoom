import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import ProductionCallCard from '../../components/ProductionCallCard';

export default function RoomsListScreen({ navigation }) {
  const { currentUser } = useAuth();
  const { switchRoom } = useRoom();
  const { theme } = useTheme();

  const [activeSegment, setActiveSegment] = useState('ROOMS'); // 'ROOMS' | 'CALLS'
  const [myRooms, setMyRooms] = useState([]);
  const [productionCalls, setProductionCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stream user's production rooms
  useEffect(() => {
    if (!currentUser) return;

    const roomsRef = collection(db, 'rooms');
    const q = query(
      roomsRef,
      where('memberUids', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMyRooms(rooms);
        setLoading(false);
      },
      (err) => {
        console.error('Rooms fetch error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Stream public production calls on The Board
  useEffect(() => {
    const callsRef = collection(db, 'production_calls');
    const q = query(callsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const calls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProductionCalls(calls);
      },
      (err) => {
        console.error('Calls fetch error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleEnterRoom = (roomId) => {
    switchRoom(roomId);
    navigation.navigate('StagePipeline', { screen: 'Stage1_Ideation' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme?.background || '#0c0d0e' }]}>
      {/* Pinned Top Bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.headerTitle, { color: theme?.text || '#ffffff' }]}>
            THE <Text style={{ color: theme?.primary || '#f5a623' }}>BOARD</Text>
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
            onPress={() => navigation.navigate('CreateRoom')}
          >
            <Text style={styles.createBtnText}>+ New Room</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle Segments: My Rooms vs Public Crew Calls */}
        <View style={styles.segmentBar}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'ROOMS' && { borderBottomColor: theme?.primary || '#f5a623', borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveSegment('ROOMS')}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeSegment === 'ROOMS' ? (theme?.primary || '#f5a623') : (theme?.textMuted || '#64748b') },
              ]}
            >
              My Production Rooms ({myRooms.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'CALLS' && { borderBottomColor: theme?.primary || '#f5a623', borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveSegment('CALLS')}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeSegment === 'CALLS' ? (theme?.primary || '#f5a623') : (theme?.textMuted || '#64748b') },
              ]}
            >
              Public Crew Calls ({productionCalls.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Feed */}
      {loading ? (
        <ActivityIndicator color={theme?.primary || '#f5a623'} style={{ marginTop: 40 }} />
      ) : activeSegment === 'ROOMS' ? (
        <FlatList
          data={myRooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.roomCard, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}
              onPress={() => handleEnterRoom(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.roomCardHeader}>
                <Text style={[styles.roomTitle, { color: theme?.primary || '#f5a623' }]}>{item.title}</Text>
                <View style={[styles.stagePill, { backgroundColor: '#2a2215' }]}>
                  <Text style={[styles.stagePillText, { color: theme?.primary || '#f5a623' }]}>
                    Stage {(item.currentStage || 0) + 1}
                  </Text>
                </View>
              </View>

              <Text style={[styles.roomGenre, { color: theme?.textSecondary || '#9ca3af' }]}>
                Genre: {item.genre || 'Film'} • {Object.keys(item.members || {}).length} Crew Members
              </Text>

              <Text style={[styles.roomLogline, { color: theme?.text || '#ffffff' }]} numberOfLines={2}>
                {item.logline}
              </Text>

              <View style={styles.enterRow}>
                <Text style={[styles.enterText, { color: theme?.primary || '#f5a623' }]}>
                  Enter Digital Slate & Pipeline ➔
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: theme?.text || '#ffffff' }]}>No Active Rooms</Text>
              <Text style={[styles.emptySub, { color: theme?.textSecondary || '#9ca3af' }]}>
                Tap "+ New Room" above or the golden "+" icon below to create your first production pipeline.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={productionCalls}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductionCallCard
              project={item}
              onExpressInterest={() => {
                navigation.navigate('MessagesTab', {
                  screen: 'DirectMessage',
                  params: {
                    peerUser: {
                      id: item.createdBy,
                      fullName: item.director || 'Production Lead',
                    },
                  },
                });
              }}
              onAnalyzeMatch={() => {
                alert(`Matching your gear and skills against ${item.title}...`);
              }}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: theme?.text || '#ffffff' }]}>No Calls Posted</Text>
              <Text style={[styles.emptySub, { color: theme?.textSecondary || '#9ca3af' }]}>
                No public crew calls have been listed yet.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 44, paddingHorizontal: 16, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  createBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  createBtnText: { color: '#000000', fontWeight: 'bold', fontSize: 12 },
  segmentBar: { flexDirection: 'row', marginTop: 14, borderBottomWidth: 1, borderColor: '#222' },
  segmentItem: { paddingVertical: 10, marginRight: 16 },
  segmentText: { fontSize: 13, fontWeight: '700' },
  roomCard: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomTitle: { fontSize: 17, fontWeight: '900' },
  stagePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  stagePillText: { fontSize: 10, fontWeight: 'bold' },
  roomGenre: { fontSize: 11, marginVertical: 4 },
  roomLogline: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  enterRow: { marginTop: 10 },
  enterText: { fontSize: 12, fontWeight: '800' },
  emptyCard: { padding: 30, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold' },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});