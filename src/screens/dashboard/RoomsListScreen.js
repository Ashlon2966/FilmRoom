import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
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
import { useToast } from '../../context/ToastContext';
import ProductionCallCard from '../../components/ProductionCallCard';
import SubmitInterestModal from '../../components/SubmitInterestModal';
import SubmitReelModal from '../../components/SubmitReelModal';
import ApplyRoleModal from '../../components/ApplyRoleModal';
import PostProductionCallModal from '../../components/PostProductionCallModal';
import EditRoomModal from '../../components/EditRoomModal';
import NotificationCenterModal from '../../components/NotificationCenterModal';
import CustomActionDropUp from '../../components/CustomActionDropUp';
import QuickProfileModal from '../../components/QuickProfileModal';
import { streamNotifications } from '../../services/notificationService';
import { findUserByFilmRoomCode } from '../../services/userService';
import { sendConnectionRequest, getConnectionStatus } from '../../services/connectionService';

export default function RoomsListScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { switchRoom } = useRoom();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [activeSegment, setActiveSegment] = useState('ROOMS'); // 'ROOMS' | 'CALLS'
  const [myRooms, setMyRooms] = useState([]);
  const [productionCalls, setProductionCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [submitInterestVisible, setSubmitInterestVisible] = useState(false);
  const [applyRoleModalVisible, setApplyRoleModalVisible] = useState(false);
  const [appliedRole, setAppliedRole] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [postCallModalVisible, setPostCallModalVisible] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState(null);
  const [callToEdit, setCallToEdit] = useState(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // FAB & Connection Lookup
  const [isFabDropUpVisible, setIsFabDropUpVisible] = useState(false);
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [filmRoomCodeInput, setFilmRoomCodeInput] = useState('');
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const [isQuickProfileVisible, setIsQuickProfileVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(Boolean);
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
        const calls = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(Boolean);
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

  const handleApplyCall = (call) => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to submit interest.');
      return;
    }
    if (call.createdBy === currentUser.uid) {
      Alert.alert('Your Production Call', 'You posted this crew call to The Board. Tap "Edit Call" to modify requirements.');
      return;
    }

    setSelectedCall(call);
    setApplyRoleModalVisible(true);
  };

  const handleSearchFilmRoomCode = async () => {
    const cleanCode = filmRoomCodeInput.trim().toUpperCase();
    if (cleanCode.length !== 10) {
      showToast({ type: 'warning', message: 'Enter a valid 10-character FilmRoom Code (e.g. FR7K2P91XA).' });
      return;
    }

    if (userProfile?.filmRoomId && cleanCode === userProfile.filmRoomId.toUpperCase()) {
      showToast({ type: 'info', message: 'This is your own FilmRoom Code.' });
      return;
    }

    setIsSearchingCode(true);
    try {
      const user = await findUserByFilmRoomCode(cleanCode);
      if (!user) {
        showToast({ type: 'error', message: `No filmmaker found with code ${cleanCode}.` });
        return;
      }
      setIsCodeModalVisible(false);
      setSearchedUser(user);
      setIsQuickProfileVisible(true);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error looking up code.' });
    } finally {
      setIsSearchingCode(false);
    }
  };

  const handleSendConnectionRequest = async (targetUser) => {
    if (!targetUser || !currentUser) return;
    setActionLoading(true);
    try {
      const connStatus = await getConnectionStatus(currentUser.uid, targetUser.id);
      if (connStatus.status === 'ACCEPTED') {
        showToast({ type: 'info', message: `You are already connected with @${targetUser.username || 'filmmaker'}.` });
        setIsQuickProfileVisible(false);
        setSearchedUser(null);
        return;
      }
      if (connStatus.status === 'PENDING') {
        showToast({ type: 'info', message: `A connection request with @${targetUser.username || 'filmmaker'} is already pending.` });
        setIsQuickProfileVisible(false);
        setSearchedUser(null);
        return;
      }

      await sendConnectionRequest(currentUser, targetUser);
      showToast({
        type: 'success',
        title: 'Connection Dispatched',
        message: `Connection request sent to ${targetUser.fullName || targetUser.displayName || 'filmmaker'}.`,
      });
      setIsQuickProfileVisible(false);
      setSearchedUser(null);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to dispatch request.' });
    } finally {
      setActionLoading(false);
    }
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
          keyExtractor={(item, idx) => item?.id || String(idx)}
          renderItem={({ item }) => {
            if (!item || !item.id) return null;
            const isOwner = item.creatorId === currentUser?.uid || item.members?.[currentUser?.uid]?.roomAccess === 'Owner';
            const isManager = !isOwner && item.members?.[currentUser?.uid]?.roomAccess === 'Manager';

            return (
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
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <View
                    style={[
                      styles.roleTagPill,
                      {
                        backgroundColor: isOwner ? '#2a2215' : isManager ? '#141d2e' : '#181b1f',
                        borderColor: isOwner ? (theme?.primary || '#f5a623') : isManager ? '#38bdf8' : (theme?.cardBorder || '#242830'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleTagText,
                        {
                          color: isOwner ? (theme?.primary || '#f5a623') : isManager ? '#38bdf8' : (theme?.textSecondary || '#9ca3af'),
                        },
                      ]}
                    >
                      {isOwner ? '👑 OWNER' : isManager ? '🛡️ MANAGER' : '🎬 CREW'}
                    </Text>
                  </View>
                  <View style={[styles.stagePill, { backgroundColor: item.visibility === 'PUBLIC' ? '#1e3d29' : '#242830' }]}>
                    <Text style={[styles.stagePillText, { color: item.visibility === 'PUBLIC' ? '#4ade80' : theme?.textSecondary || '#9ca3af' }]}>
                      {item.visibility || 'PUBLIC'}
                    </Text>
                  </View>
                  <View style={[styles.stagePill, { backgroundColor: '#2a2215' }]}>
                    <Text style={[styles.stagePillText, { color: theme?.primary || '#f5a623' }]}>
                      Stage {(item.currentStage || 0) + 1}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.roomGenre, { color: theme?.textSecondary || '#9ca3af' }]}>
                {item.projectType || 'Film'} • {Object.keys(item.members || {}).length} Crew • {item.crewRequirements?.length ? `${item.crewRequirements.length} Open Roles` : 'Crew Set'}
              </Text>

              <Text style={[styles.roomLogline, { color: theme?.text || '#ffffff' }]} numberOfLines={2}>
                {item.logline || 'Production in progress.'}
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
          );
        }}
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
          keyExtractor={(item, idx) => item?.id || String(idx)}
          renderItem={({ item }) => {
            if (!item || !item.id) return null;
            return (
              <ProductionCallCard
                project={item}
                onExpressInterest={() => handleApplyCall(item)}
                onApply={() => handleApplyCall(item)}
                onEditCall={() => setCallToEdit(item)}
              />
            );
          }}
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

      {/* Role Selection Pop-up for Specified Role Application */}
      <ApplyRoleModal
        visible={applyRoleModalVisible}
        call={selectedCall}
        onClose={() => {
          setApplyRoleModalVisible(false);
        }}
        onSelectRole={(roleName) => {
          setApplyRoleModalVisible(false);
          setAppliedRole(roleName);
          setSubmitInterestVisible(true);
        }}
      />

      {/* Flow B Modal for Crew / Casting Call Submissions */}
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
          initialRole={appliedRole || selectedCall.characterName || selectedCall.neededRoles?.[0] || selectedCall.roleName || ''}
          callData={selectedCall}
          onClose={() => {
            setSubmitInterestVisible(false);
            setSelectedCall(null);
            setAppliedRole('');
          }}
          onSuccess={() => {
            setSubmitInterestVisible(false);
            setSelectedCall(null);
            setAppliedRole('');
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
        onUpdated={(updated) => {
          if (!updated?.id) return;
          setMyRooms((prev) =>
            (prev || []).map((r) => (r && r.id === updated.id ? { ...r, ...updated } : r))
          );
        }}
        onDeleted={(deletedId) => {
          if (!deletedId) return;
          setMyRooms((prev) => (prev || []).filter((r) => r && r.id !== deletedId));
          setRoomToEdit(null);
        }}
      />

      {/* In-App Notification Center */}
      <NotificationCenterModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        navigation={navigation}
      />

      {/* Floating Action Button (Requirement 8) */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
        onPress={() => setIsFabDropUpVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabBtnText}>+</Text>
      </TouchableOpacity>

      {/* Custom Action Drop-Up */}
      <CustomActionDropUp
        visible={isFabDropUpVisible}
        title="QUICK ACTIONS"
        subtitle="The Board & Network"
        actions={[
          {
            label: 'Add New Connection',
            icon: '🔗',
            subtitle: 'Find a filmmaker by 10-character FilmRoom Code',
            onPress: () => {
              setFilmRoomCodeInput('');
              setIsCodeModalVisible(true);
            },
          },
          {
            label: 'Start New Chat',
            icon: '💬',
            subtitle: 'Message a verified connection or open conversations',
            onPress: () => {
              navigation.navigate('RequestsTab', { screen: 'ConversationsList' });
            },
          },
          {
            label: 'New Production Room',
            icon: '🎬',
            subtitle: 'Create a new digital slate & pipeline room',
            onPress: () => {
              navigation.navigate('CreateRoom');
            },
          },
          {
            label: 'Post Crew Call',
            icon: '📢',
            subtitle: 'Broadcast open positions on The Board',
            onPress: () => {
              setPostCallModalVisible(true);
            },
          },
        ]}
        onClose={() => setIsFabDropUpVisible(false)}
      />

      {/* FilmRoom Code Lookup Modal */}
      <Modal
        visible={isCodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCodeModalVisible(false)}
      >
        <View style={styles.codeModalOverlay}>
          <View
            style={[
              styles.codeModalCard,
              {
                backgroundColor: theme?.card || '#181b1f',
                borderColor: theme?.cardBorder || '#242830',
              },
            ]}
          >
            <Text style={[styles.codeModalTitle, { color: theme?.text || '#ffffff' }]}>
              CONNECT BY CODE
            </Text>
            <Text style={[styles.codeModalSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
              Enter a 10-character FilmRoom Code (e.g. FR7K2P91XA) to find and connect with a verified filmmaker.
            </Text>

            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme?.surface || '#121417',
                  borderColor: theme?.cardBorder || '#242830',
                  color: theme?.text || '#ffffff',
                },
              ]}
              placeholder="FR..."
              placeholderTextColor={theme?.textMuted || '#64748b'}
              value={filmRoomCodeInput}
              onChangeText={(t) => setFilmRoomCodeInput(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
            />

            <View style={styles.codeModalActions}>
              <TouchableOpacity
                style={[styles.codeCancelBtn, { backgroundColor: theme?.surface || '#121417' }]}
                onPress={() => setIsCodeModalVisible(false)}
              >
                <Text style={{ color: theme?.textSecondary || '#9ca3af', fontWeight: '700' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.codeSubmitBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
                onPress={handleSearchFilmRoomCode}
                disabled={isSearchingCode}
              >
                {isSearchingCode ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.codeSubmitBtnText}>Search Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Profile Modal for Code Search Result */}
      {searchedUser && (
        <QuickProfileModal
          visible={isQuickProfileVisible}
          profile={searchedUser}
          contextInfo="Search Result via FilmRoom Code"
          onClose={() => {
            setIsQuickProfileVisible(false);
            setSearchedUser(null);
          }}
          onConnect={() => handleSendConnectionRequest(searchedUser)}
          connectLabel="+ Send Connection Request"
          actionLoading={actionLoading}
        />
      )}
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
  roleTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 99,
  },
  fabBtnText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 32,
  },
  codeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  codeModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  codeModalTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  codeModalSubtitle: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  codeInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  codeModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  codeCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeSubmitBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
});