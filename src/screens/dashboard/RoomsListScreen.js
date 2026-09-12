import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import SubmitInterestModal from '../../components/SubmitInterestModal';
import SubmitReelModal from '../../components/SubmitReelModal';
import PostProductionCallModal from '../../components/PostProductionCallModal';
import EditRoomModal from '../../components/EditRoomModal';
import NotificationCenterModal from '../../components/NotificationCenterModal';
import { streamNotifications } from '../../services/notificationService';

export default function RoomsListScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { switchRoom } = useRoom();
  const { theme } = useTheme();

  const [activeSegment, setActiveSegment] = useState('ROOMS'); // 'ROOMS' | 'CALLS'
  const [myRooms, setMyRooms] = useState([]);
  const [productionCalls, setProductionCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [submitInterestVisible, setSubmitInterestVisible] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState(null);
  const [callToEdit, setCallToEdit] = useState(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Stream in-app notifications
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = streamNotifications(currentUser.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  // Stream user's production rooms (Guarded by currentUser)
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

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
        console.warn('Rooms fetch notice:', err.message);
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
        console.warn('Calls fetch notice:', err.message);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleEnterRoom = (roomId) => {
    switchRoom(roomId);
    navigation.navigate('StagePipeline', { screen: 'Stage1_Ideation' });
  };

  const handleExpressInterest = (call) => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to submit interest.');
      return;
    }
    if (call.createdBy === currentUser.uid) {
      Alert.alert('Your Production Call', 'You posted this crew call to The Board.');
      return;
    }

    setSelectedCall(call);
    setSubmitInterestVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme?.background || '#0c0d0e' }]}>
      {/* Pinned Top Bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.headerTitle, { color: theme?.text || '#ffffff' }]}>
            THE <Text style={{ color: theme?.primary || '#f5a623' }}>BOARD</Text>
          </Text>

          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={[
                styles.bellBtn,
                {
                  backgroundColor: theme?.card || '#181b1f',
                  borderColor: theme?.cardBorder || '#242830',
                },
              ]}
              onPress={() => setNotificationsVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 16 }}>🔔</Text>
              {unreadNotificationCount > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: theme?.primary || '#f5a623' }]}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {activeSegment === 'ROOMS' ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
                onPress={() => navigation.navigate('CreateRoom')}
              >
                <Text style={styles.actionBtnText}>+ New Room</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
                onPress={() => setPostCallModalVisible(true)}
              >
                <Text style={styles.actionBtnText}>+ Post Crew Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Segmented Toggle: Production Rooms vs Public Crew Calls */}
        <View style={styles.segmentBar}>
          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'ROOMS' && {
                borderBottomColor: theme?.primary || '#f5a623',
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveSegment('ROOMS')}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeSegment === 'ROOMS'
                      ? theme?.primary || '#f5a623'
                      : theme?.textMuted || '#64748b',
                },
              ]}
            >
              My Production Rooms ({myRooms.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentItem,
              activeSegment === 'CALLS' && {
                borderBottomColor: theme?.primary || '#f5a623',
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveSegment('CALLS')}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeSegment === 'CALLS'
                      ? theme?.primary || '#f5a623'
                      : theme?.textMuted || '#64748b',
                },
              ]}
            >
              Public Crew Calls ({productionCalls.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <ActivityIndicator color={theme?.primary || '#f5a623'} style={{ marginTop: 40 }} />
      ) : activeSegment === 'ROOMS' ? (
        <FlatList
          data={myRooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.roomCard,
                {
                  backgroundColor: theme?.card || '#181b1f',
                  borderColor: theme?.cardBorder || '#242830',
                },
              ]}
              onPress={() => handleEnterRoom(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.roomCardHeader}>
                <Text style={[styles.roomTitle, { color: theme?.primary || '#f5a623' }]}>
                  {item.title}
                </Text>
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
                {(item.creatorId === currentUser?.uid ||
                  item.members?.[currentUser?.uid]?.roomAccess === 'Owner' ||
                  item.members?.[currentUser?.uid]?.roomAccess === 'Manager') && (
                  <TouchableOpacity
                    style={[styles.editBadgeBtn, { backgroundColor: theme?.surface || '#121417', borderColor: theme?.cardBorder || '#242830' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setRoomToEdit(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.editBadgeText, { color: theme?.textSecondary || '#9ca3af' }]}>
                      ⚙️ Edit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: theme?.text || '#ffffff' }]}>
                No Active Rooms
              </Text>
              <Text style={[styles.emptySub, { color: theme?.textSecondary || '#9ca3af' }]}>
                Tap "+ New Room" above to set up your digital slate and screenplay space.
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
              onExpressInterest={() => handleExpressInterest(item)}
              onEditCall={() => setCallToEdit(item)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: theme?.text || '#ffffff' }]}>
                No Calls Posted
              </Text>
              <Text style={[styles.emptySub, { color: theme?.textSecondary || '#9ca3af' }]}>
                No public crew calls have been posted to The Board yet. Tap "+ Post Crew Call" above to broadcast open department positions.
              </Text>
            </View>
          }
        />
      )}

      {/* Flow B Modal for Crew Call Submissions */}
      {selectedCall && (
        <SubmitReelModal
          visible={submitInterestVisible}
          targetLead={{
            uid: selectedCall.createdBy,
            name: selectedCall.director || 'Production Lead',
            role: 'Director / Production Lead',
            category: 'PRODUCTION',
          }}
          initialProject={selectedCall.title}
          initialRole={selectedCall.neededRoles?.[0] || ''}
          onClose={() => {
            setSubmitInterestVisible(false);
            setSelectedCall(null);
          }}
          onSuccess={() => {
            setSubmitInterestVisible(false);
            setSelectedCall(null);
          }}
        />
      )}

      {/* Modal to Post or Edit Crew Call on The Board */}
      <PostProductionCallModal
        visible={postCallModalVisible || !!callToEdit}
        callToEdit={callToEdit}
        onClose={() => {
          setPostCallModalVisible(false);
          setCallToEdit(null);
        }}
        onPublished={() => {
          setPostCallModalVisible(false);
          setCallToEdit(null);
        }}
      />

      {/* Edit Production Room Modal */}
      <EditRoomModal
        visible={!!roomToEdit}
        roomId={roomToEdit?.id}
        roomData={roomToEdit}
        onClose={() => setRoomToEdit(null)}
      />

      {/* In-App Notification Center */}
      <NotificationCenterModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 44,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  segmentBar: {
    flexDirection: 'row',
    marginTop: 14,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  segmentItem: {
    paddingVertical: 10,
    marginRight: 16,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  roomCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  stagePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stagePillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  roomGenre: {
    fontSize: 11,
    marginVertical: 4,
  },
  roomLogline: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  enterRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enterText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  editBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});