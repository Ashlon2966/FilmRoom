import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import {
  streamIncomingRequests,
  streamOutgoingRequests,
  acceptContactRequest,
  declineContactRequest,
  toggleSaveContactRequest,
  shareDraftScript,
  REQUEST_STATUS,
  REQUEST_TYPES,
} from '../../services/contactRequestService';
import { streamAcceptedConnections, sendConnectionRequest } from '../../services/connectionService';
import { findUserByFilmRoomCode } from '../../services/userService';
import CustomActionDropUp from '../../components/CustomActionDropUp';
import QuickProfileModal from '../../components/QuickProfileModal';

export default function RequestsHubScreen({ navigation }) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useModal();

  const [activeSegment, setActiveSegment] = useState('INCOMING'); // 'INCOMING' | 'OUTGOING' | 'SAVED' | 'CONNECTIONS'
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [sharingScriptId, setSharingScriptId] = useState(null);
  const [dismissedPromptIds, setDismissedPromptIds] = useState({});

  // FAB & Drop-Up State (Requirements 33, 34, 35, 79)
  const [isFabDropUpVisible, setIsFabDropUpVisible] = useState(false);
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [filmRoomCodeInput, setFilmRoomCodeInput] = useState('');
  const [isSearchingCode, setIsSearchingCode] = useState(false);
  const [selectedQuickProfile, setSelectedQuickProfile] = useState(null);
  const [isQuickProfileVisible, setIsQuickProfileVisible] = useState(false);
  const [isConnectionPickerVisible, setIsConnectionPickerVisible] = useState(false);

  // Stream Incoming Requests
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = streamIncomingRequests(currentUser.uid, (reqs) => {
      setIncomingRequests(reqs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Stream Outgoing Requests
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = streamOutgoingRequests(currentUser.uid, (reqs) => {
      setOutgoingRequests(reqs);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Stream Accepted Connections
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = streamAcceptedConnections(currentUser.uid, (conns) => {
      setConnections(conns);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const pendingIncomingCount = incomingRequests.filter(
    (r) => r.status === REQUEST_STATUS.PENDING
  ).length;

  const savedRequests = incomingRequests.filter((r) => r.isSaved);

  const handleToggleSave = async (req) => {
    try {
      const willSave = !req.isSaved;
      await toggleSaveContactRequest(req.id, !!req.isSaved);
      showToast({
        type: 'success',
        message: willSave ? 'Inquiry saved to bookmarks' : 'Inquiry removed from saved',
      });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to update saved status' });
    }
  };

  // Handle Accept
  const handleAccept = async (req) => {
    setActionLoadingId(req.id);
    try {
      await acceptContactRequest(req);
      showToast({
        type: 'success',
        title: 'Connection Established',
        message: `You and ${req.sender?.name || 'Filmmaker'} are now connected.`,
      });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to accept request' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Decline
  const handleDecline = (req) => {
    showConfirm({
      title: 'Decline Request?',
      message: `Are you sure you want to decline this inquiry from ${req.sender?.name || 'Filmmaker'}?`,
      confirmText: 'Decline',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setActionLoadingId(req.id);
        try {
          await declineContactRequest(req.id);
          showToast({ type: 'info', message: 'Inquiry declined' });
        } catch (err) {
          showToast({ type: 'error', message: err.message || 'Failed to decline request' });
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  // FAB Handlers (Requirements 33, 34, 35, 79)
  const handleFabActionSelect = (action) => {
    setIsFabDropUpVisible(false);
    setTimeout(() => {
      if (action.id === 'ADD_CONNECTION') {
        setFilmRoomCodeInput('');
        setIsCodeModalVisible(true);
      } else if (action.id === 'START_CHAT') {
        if (connections.length === 0) {
          showToast({
            type: 'info',
            title: 'Connection Required',
            message: 'Professional connection required before direct messaging. Connect with a filmmaker using their FilmRoom Code first.',
          });
        } else {
          setIsConnectionPickerVisible(true);
        }
      }
    }, 150);
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
      setSelectedQuickProfile(user);
      setIsQuickProfileVisible(true);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error looking up code.' });
    } finally {
      setIsSearchingCode(false);
    }
  };

  const handleSendConnectionRequestFromCode = async (targetUser) => {
    try {
      await sendConnectionRequest(currentUser, targetUser);
      showToast({
        type: 'success',
        title: 'Request Dispatched',
        message: `Connection request sent to ${targetUser.fullName || targetUser.displayName || 'filmmaker'}.`,
      });
      setIsQuickProfileVisible(false);
      setSelectedQuickProfile(null);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to send connection request.' });
    }
  };

  // Open Material Link
  const handleOpenLink = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      showToast({ type: 'error', message: 'Unable to open material link.' });
    });
  };

  // In-Charge Shares Draft Script with Actor
  const handleShareScript = async (requestId, scriptUrl = null) => {
    setSharingScriptId(requestId);
    try {
      await shareDraftScript(requestId, scriptUrl);
      showToast({
        type: 'success',
        title: 'Script Sides Shared',
        message: 'The draft script sides have been unlocked and shared with the actor.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Share Failed',
        message: err.message || 'Could not share draft script sides.',
      });
    } finally {
      setSharingScriptId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            PROFESSIONAL <Text style={{ color: theme.primary }}>REQUESTS</Text>
          </Text>

          {/* Quick link to conversations */}
          <TouchableOpacity
            style={[styles.conversationsBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.navigate('ConversationsList')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13 }}>💬</Text>
            <Text style={[styles.conversationsBtnText, { color: theme.text }]}>Chats</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Contextual hiring inquiries, submissions, and verified connections
        </Text>

        {/* 4-Segment Control */}
        <View style={[styles.segmentedControl, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Incoming */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'INCOMING' && { backgroundColor: theme.surface },
            ]}
            onPress={() => setActiveSegment('INCOMING')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text
                style={[
                  styles.segmentText,
                  { color: activeSegment === 'INCOMING' ? theme.primary : theme.textSecondary },
                ]}
              >
                Received
              </Text>
              {pendingIncomingCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.countBadgeText}>{pendingIncomingCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Outgoing */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'OUTGOING' && { backgroundColor: theme.surface },
            ]}
            onPress={() => setActiveSegment('OUTGOING')}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeSegment === 'OUTGOING' ? theme.primary : theme.textSecondary },
              ]}
            >
              Sent ({outgoingRequests.length})
            </Text>
          </TouchableOpacity>

          {/* Saved */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'SAVED' && { backgroundColor: theme.surface },
            ]}
            onPress={() => setActiveSegment('SAVED')}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeSegment === 'SAVED' ? theme.primary : theme.textSecondary },
              ]}
            >
              Saved ({savedRequests.length})
            </Text>
          </TouchableOpacity>

          {/* Connections */}
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeSegment === 'CONNECTIONS' && { backgroundColor: theme.surface },
            ]}
            onPress={() => setActiveSegment('CONNECTIONS')}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeSegment === 'CONNECTIONS' ? theme.primary : theme.textSecondary },
              ]}
            >
              Connections ({connections.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Feed */}
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : activeSegment === 'INCOMING' ? (
        /* INCOMING REQUESTS */
        <FlatList
          data={incomingRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPending = item.status === REQUEST_STATUS.PENDING;
            const isManagerRouted = !!item.isRoutedToManager;

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: isPending ? theme.primary + '55' : theme.cardBorder,
                  },
                ]}
              >
                {/* Top Request Type Tag & Status */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: item.details?.isActorCall
                          ? '#281a3d'
                          : item.type === REQUEST_TYPES.HIRING_TO_TALENT
                          ? '#2a2215'
                          : '#141a24',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        {
                          color: item.details?.isActorCall
                            ? '#c084fc'
                            : item.type === REQUEST_TYPES.HIRING_TO_TALENT
                            ? theme.primary
                            : '#93c5fd',
                        },
                      ]}
                    >
                      {item.details?.isActorCall
                        ? (item.type === REQUEST_TYPES.HIRING_TO_TALENT ? '🎭 CASTING OFFER' : '🎭 ACTOR APPLICATION')
                        : item.type === REQUEST_TYPES.HIRING_TO_TALENT
                        ? '🎬 HIRING INQUIRY'
                        : '🎗 TALENT SUBMISSION'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleToggleSave(item)}
                      style={styles.starSaveBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 16, color: item.isSaved ? theme.primary : theme.textMuted }}>
                        {item.isSaved ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            item.status === REQUEST_STATUS.ACCEPTED
                              ? '#1e3d29'
                              : item.status === REQUEST_STATUS.DECLINED
                              ? '#3d1c1c'
                              : '#242830',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              item.status === REQUEST_STATUS.ACCEPTED
                                ? '#4ade80'
                                : item.status === REQUEST_STATUS.DECLINED
                                ? '#f87171'
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Manager routing notice if handled on behalf of client */}
                {isManagerRouted && (
                  <View style={[styles.managerNotice, { backgroundColor: '#141a24', borderColor: '#2b3952' }]}>
                    <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '800' }}>
                      🏛 INQUIRY FOR YOUR REPRESENTED TALENT: {item.targetTalent?.name}
                    </Text>
                  </View>
                )}

                {/* Sender Row */}
                <View style={styles.senderRow}>
                  {(item.sender?.photoURL || item.sender?.avatar) ? (
                    <Image source={{ uri: item.sender.photoURL || item.sender.avatar }} style={styles.senderAvatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                        {(item.sender?.fullName || item.sender?.name) ? (item.sender.fullName || item.sender.name)[0].toUpperCase() : 'F'}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.senderName, { color: theme.text }]}>
                      {item.sender?.name || 'Filmmaker'}
                    </Text>
                    <Text style={[styles.senderRole, { color: theme.textSecondary }]}>
                      @{item.sender?.username || 'crew'} • {item.sender?.role || 'Creative'}
                    </Text>
                  </View>
                </View>

                {/* Details Block */}
                <View style={[styles.detailsBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  {item.details?.projectName && (
                    <Text style={[styles.detailLine, { color: theme.text }]}>
                      Project:{' '}
                      <Text style={{ fontWeight: '800', color: theme.primary }}>
                        {item.details.projectName}
                      </Text>
                      {item.details?.productionType ? ` (${item.details.productionType})` : ''}
                    </Text>
                  )}

                  {item.details?.characterName && (
                    <Text style={[styles.detailLine, { color: theme.text }]}>
                      Character / Role:{' '}
                      <Text style={{ fontWeight: '800', color: '#c084fc' }}>
                        {item.details.characterName}
                      </Text>
                      {item.details?.rolePosition ? ` • ${item.details.rolePosition}` : ''}
                    </Text>
                  )}

                  {item.details?.roleName && !item.details?.characterName && (
                    <Text style={[styles.detailLine, { color: theme.text }]}>
                      Role Needed: <Text style={{ fontWeight: '700' }}>{item.details.roleName}</Text>
                    </Text>
                  )}

                  {item.details?.characterDescription && (
                    <Text style={[styles.detailLine, { color: theme.textSecondary, fontStyle: 'italic' }]}>
                      Breakdown: {item.details.characterDescription}
                    </Text>
                  )}

                  {item.details?.shootDates && (
                    <Text style={[styles.detailLine, { color: theme.textSecondary }]}>
                      📅 Projected Shoot: <Text style={{ fontWeight: '700', color: theme.text }}>{item.details.shootDates}</Text>
                    </Text>
                  )}

                  {item.details?.roleOrDepartment && !item.details?.characterName && (
                    <Text style={[styles.detailLine, { color: theme.text }]}>
                      Craft / Consideration:{' '}
                      <Text style={{ fontWeight: '700' }}>{item.details.roleOrDepartment}</Text>
                    </Text>
                  )}

                  {item.details?.message && (
                    <Text style={[styles.messageText, { color: theme.textSecondary }]}>
                      "{item.details.message}"
                    </Text>
                  )}

                  {/* Material Link */}
                  {(item.details?.materialLink || item.details?.portfolioOrReel) && (
                    <TouchableOpacity
                      style={[styles.linkBtn, { borderColor: theme.primary + '55' }]}
                      onPress={() =>
                        handleOpenLink(item.details.materialLink || item.details.portfolioOrReel)
                      }
                    >
                      <Text style={[styles.linkBtnText, { color: theme.primary }]}>
                        🔗 Review Audition Material / Deck
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Draft Script Sides Display & Unlocking */}
                  {item.details?.scriptUrl && (
                    item.details?.scriptShared ? (
                      <TouchableOpacity
                        style={[styles.scriptSidesBtn, { backgroundColor: '#1e3d29', borderColor: '#4ade80' }]}
                        onPress={() => handleOpenLink(item.details.scriptUrl)}
                      >
                        <Text style={{ color: '#4ade80', fontWeight: '800', fontSize: 12 }}>
                          📖 Review Draft Script / Sides (Unlocked)
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.lockedScriptNotice, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                        <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>
                          🔒 Draft Script Sides Attached • Unlocks upon confirmation
                        </Text>
                      </View>
                    )
                  )}
                </View>

                {/* Actions Row */}
                {isPending && (
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={[styles.declineBtn, { borderColor: theme.cardBorder, marginRight: 6 }]}
                      onPress={() => {
                        setSelectedQuickProfile(item.sender);
                        setIsQuickProfileVisible(true);
                      }}
                    >
                      <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 12 }}>
                        Quick View
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.declineBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => handleDecline(item)}
                      disabled={actionLoadingId === item.id}
                    >
                      <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 12 }}>
                        Decline
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                      onPress={() => handleAccept(item)}
                      disabled={actionLoadingId === item.id}
                    >
                      {actionLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Text style={styles.acceptBtnText}>Accept & Connect</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📥</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No incoming contact requests
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                When directors, producers, or talent reach out to you, their structured inquiries will appear here for review.
              </Text>
            </View>
          }
        />
      ) : activeSegment === 'OUTGOING' ? (
        /* OUTGOING REQUESTS */
        <FlatList
          data={outgoingRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isAccepted = item.status === REQUEST_STATUS.ACCEPTED;
            const targetAvatar = item.targetTalent?.photoURL || item.targetTalent?.avatar;
            const targetName = item.targetTalent?.fullName || item.targetTalent?.name || 'Filmmaker';

            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <View style={[styles.avatarPlaceholder, { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface, overflow: 'hidden', marginRight: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder }]}>
                      {targetAvatar ? (
                        <Image source={{ uri: targetAvatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={[styles.avatarInitial, { color: theme.primary, fontSize: 13 }]}>
                          {targetName[0]?.toUpperCase() || 'F'}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.targetLabel, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
                      Inquiry sent to <Text style={{ color: theme.text, fontWeight: '800' }}>{targetName}</Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          item.status === REQUEST_STATUS.ACCEPTED
                            ? '#1e3d29'
                            : item.status === REQUEST_STATUS.DECLINED
                            ? '#3d1c1c'
                            : '#2a2215',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === REQUEST_STATUS.ACCEPTED
                              ? '#4ade80'
                              : item.status === REQUEST_STATUS.DECLINED
                              ? '#f87171'
                              : theme.primary,
                        },
                      ]}
                    >
                      {item.status === REQUEST_STATUS.PENDING ? 'Pending Review' : item.status}
                    </Text>
                  </View>
                </View>

                {item.details?.projectName && (
                  <Text style={[styles.detailLine, { color: theme.text, marginTop: 4 }]}>
                    Project: <Text style={{ fontWeight: '800' }}>{item.details.projectName}</Text>
                  </Text>
                )}

                {item.details?.characterName && (
                  <Text style={[styles.detailLine, { color: theme.text }]}>
                    Role: <Text style={{ fontWeight: '800', color: '#c084fc' }}>{item.details.characterName}</Text>
                    {item.details?.rolePosition ? ` • ${item.details.rolePosition}` : ''}
                  </Text>
                )}

                {item.details?.roleName && !item.details?.characterName && (
                  <Text style={[styles.detailLine, { color: theme.text }]}>
                    Role: <Text style={{ fontWeight: '700' }}>{item.details.roleName}</Text>
                  </Text>
                )}

                {item.details?.shootDates && (
                  <Text style={[styles.detailLine, { color: theme.textSecondary, marginTop: 2 }]}>
                    📅 Shoot Window: <Text style={{ fontWeight: '700', color: theme.text }}>{item.details.shootDates}</Text>
                  </Text>
                )}

                {item.details?.message && (
                  <Text style={[styles.messageText, { color: theme.textSecondary }]}>
                    "{item.details.message}"
                  </Text>
                )}

                {/* Director Script Sharing Prompt Card (Flow A: Director reached out to Actor, Actor accepted) */}
                {isAccepted && item.details?.scriptUrl && !item.details?.scriptShared && item.type === REQUEST_TYPES.HIRING_TO_TALENT && !dismissedPromptIds[item.id] && (
                  <View style={[styles.sharePromptCard, { backgroundColor: '#281a3d', borderColor: '#7c3aed' }]}>
                    <Text style={{ color: '#c084fc', fontWeight: '800', fontSize: 12 }}>
                      🎭 {item.targetTalent?.name || 'Actor'} Accepted Role!
                    </Text>
                    <Text style={{ color: '#e9d5ff', fontSize: 11, marginTop: 3, marginBottom: 8 }}>
                      Would you like to share the draft script sides with {item.targetTalent?.name || 'them'} now?
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.shareNowBtn, { backgroundColor: '#8b5cf6' }]}
                        onPress={() => handleShareScript(item.id)}
                        disabled={sharingScriptId === item.id}
                      >
                        {sharingScriptId === item.id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 11 }}>
                            Share Script Now
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.shareLaterBtn, { borderColor: '#7c3aed' }]}
                        onPress={() => setDismissedPromptIds({ ...dismissedPromptIds, [item.id]: true })}
                      >
                        <Text style={{ color: '#c084fc', fontWeight: '700', fontSize: 11 }}>
                          Later
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Director Script Shared Confirmation */}
                {item.details?.scriptShared && (
                  <View style={[styles.scriptSharedBadge, { backgroundColor: '#1e3d29', borderColor: '#4ade80' }]}>
                    <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '700' }}>
                      ✓ Draft script sides shared with {item.targetTalent?.name || 'actor'}
                    </Text>
                  </View>
                )}

                {/* Actor Review Button (Flow B: Actor applied to call, call accepted and script unlocked) */}
                {isAccepted && item.details?.scriptShared && item.details?.scriptUrl && (
                  <TouchableOpacity
                    style={[styles.scriptSidesBtn, { backgroundColor: '#1e3d29', borderColor: '#4ade80' }]}
                    onPress={() => handleOpenLink(item.details.scriptUrl)}
                  >
                    <Text style={{ color: '#4ade80', fontWeight: '800', fontSize: 12 }}>
                      📖 Review Draft Script / Sides (Unlocked)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* If accepted, offer direct message button */}
                {isAccepted && (
                  <TouchableOpacity
                    style={[styles.messageConnectionBtn, { backgroundColor: theme.surface, borderColor: theme.primary }]}
                    onPress={() => {
                      navigation.navigate('DirectMessage', {
                        peerUser: {
                          id: item.targetTalent.uid,
                          fullName: item.targetTalent.fullName || item.targetTalent.name,
                          username: item.targetTalent.username,
                          photoURL: item.targetTalent.photoURL || item.targetTalent.avatar || null,
                          role: item.targetTalent.role,
                        },
                      });
                    }}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>
                      💬 Open Direct Message
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📤</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No outgoing requests
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Browse the Talent Directory to discover filmmakers and dispatch professional contact requests.
              </Text>
            </View>
          }
        />
      ) : activeSegment === 'SAVED' ? (
        /* SAVED REQUESTS */
        <FlatList
          data={savedRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPending = item.status === REQUEST_STATUS.PENDING;
            const senderAvatar = item.sender?.photoURL || item.sender?.avatar;
            const senderName = item.sender?.fullName || item.sender?.name || 'Filmmaker';

            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <View style={[styles.avatarPlaceholder, { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surface, overflow: 'hidden', marginRight: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder }]}>
                      {senderAvatar ? (
                        <Image source={{ uri: senderAvatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={[styles.avatarInitial, { color: theme.primary, fontSize: 13 }]}>
                          {senderName[0]?.toUpperCase() || 'F'}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.targetLabel, { color: theme.primary, flex: 1 }]} numberOfLines={1}>
                      ★ Saved Inquiry from {senderName}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleToggleSave(item)} style={styles.starSaveBtn}>
                    <Text style={{ fontSize: 16, color: theme.primary }}>★</Text>
                  </TouchableOpacity>
                </View>

                {item.details?.projectName && (
                  <Text style={[styles.detailLine, { color: theme.text, marginTop: 4 }]}>
                    Project: <Text style={{ fontWeight: '800' }}>{item.details.projectName}</Text>
                  </Text>
                )}

                {item.details?.shootDates && (
                  <Text style={[styles.detailLine, { color: theme.textSecondary, marginTop: 2 }]}>
                    📅 Shoot: <Text style={{ fontWeight: '700', color: theme.text }}>{item.details.shootDates}</Text>
                  </Text>
                )}

                {item.details?.message ? (
                  <Text style={[styles.messageText, { color: theme.textSecondary, marginTop: 4 }]} numberOfLines={3}>
                    "{item.details.message}"
                  </Text>
                ) : null}

                {isPending && (
                  <View style={[styles.cardActionsRow, { marginTop: 12 }]}>
                    <TouchableOpacity
                      style={[styles.declineBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => handleDecline(item)}
                    >
                      <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 12 }}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                      onPress={() => handleAccept(item)}
                    >
                      <Text style={styles.acceptBtnText}>Accept & Connect</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No saved inquiries
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Tap the star icon (☆) on any received contact request to bookmark it here for later review.
              </Text>
            </View>
          }
        />
      ) : (
        /* ACCEPTED CONNECTIONS */
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const peerId = (item.users || []).find((u) => u !== currentUser.uid);
            const peerData =
              item.userData?.[peerId] || item.participants?.[peerId] || {};

            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.senderRow}>
                  {(peerData.photoURL || peerData.avatar) ? (
                    <Image source={{ uri: peerData.photoURL || peerData.avatar }} style={styles.senderAvatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                        {peerData.fullName || peerData.name ? (peerData.fullName || peerData.name)[0].toUpperCase() : 'F'}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.senderName, { color: theme.text }]}>
                      {peerData.fullName || peerData.name || 'Filmmaker'}
                    </Text>
                    <Text style={[styles.senderRole, { color: theme.textSecondary }]}>
                      @{peerData.username || 'crew'} • {peerData.role || 'Connected'}
                    </Text>
                  </View>

                  {/* Message Action */}
                  <TouchableOpacity
                    style={[styles.messageBtn, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      navigation.navigate('DirectMessage', {
                        peerUser: {
                          id: peerId,
                          fullName: peerData.fullName || peerData.name || 'Filmmaker',
                          username: peerData.username || 'crew',
                          photoURL: peerData.photoURL || peerData.avatar || null,
                          role: peerData.role || 'Creative',
                        },
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.messageBtnText}>💬 Message</Text>
                  </TouchableOpacity>
                </View>

                {/* Script Sides if unlocked in connection */}
                {item.scriptShared && item.scriptUrl && (
                  <TouchableOpacity
                    style={[styles.scriptSidesBtn, { backgroundColor: '#1e3d29', borderColor: '#4ade80', marginTop: 8 }]}
                    onPress={() => handleOpenLink(item.scriptUrl)}
                  >
                    <Text style={{ color: '#4ade80', fontWeight: '800', fontSize: 12 }}>
                      📖 Review Draft Script / Sides (Unlocked)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🤝</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No verified connections yet
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                When contact requests are accepted, your professional relationships and controlled messaging channels appear here.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button (Requirements 33 & 79) */}
      <TouchableOpacity
        style={[styles.fabBtn, { backgroundColor: theme.primary || '#f5a623' }]}
        onPress={() => setIsFabDropUpVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabBtnText}>+</Text>
      </TouchableOpacity>

      {/* Custom Action Drop-Up (Requirement 79) */}
      <CustomActionDropUp
        visible={isFabDropUpVisible}
        title="COMMUNICATIONS & NETWORK"
        actions={[
          {
            id: 'ADD_CONNECTION',
            label: 'Add New Connection',
            description: 'Find a filmmaker by 10-character FilmRoom Code',
            icon: '🔗',
          },
          {
            id: 'START_CHAT',
            label: 'Start New Chat',
            description: 'Message one of your verified professional connections',
            icon: '💬',
          },
        ]}
        onSelect={handleFabActionSelect}
        onClose={() => setIsFabDropUpVisible(false)}
      />

      {/* FilmRoom Code Lookup Modal (Requirement 34) */}
      <Modal visible={isCodeModalVisible} transparent animationType="fade" onRequestClose={() => setIsCodeModalVisible(false)}>
        <View style={styles.codeModalOverlay}>
          <View style={[styles.codeModalCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.codeModalTitle, { color: theme.text || '#ffffff' }]}>FIND FILMMAKER</Text>
            <Text style={[styles.codeModalSubtitle, { color: theme.textSecondary || '#9ca3af' }]}>
              Enter their unique 10-character FilmRoom Code (e.g. FR7K2P91XA)
            </Text>

            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.surface || '#121417',
                  borderColor: theme.cardBorder || '#242830',
                  color: theme.text || '#ffffff',
                },
              ]}
              placeholder="FR..."
              placeholderTextColor={theme.textMuted || '#64748b'}
              value={filmRoomCodeInput}
              onChangeText={(t) => setFilmRoomCodeInput(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
            />

            <View style={styles.codeModalActions}>
              <TouchableOpacity
                style={[styles.codeCancelBtn, { borderColor: theme.cardBorder || '#242830' }]}
                onPress={() => setIsCodeModalVisible(false)}
              >
                <Text style={{ color: theme.textSecondary || '#9ca3af', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.codeFindBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                onPress={handleSearchFilmRoomCode}
                disabled={isSearchingCode}
              >
                {isSearchingCode ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={{ color: '#000000', fontWeight: '800', fontSize: 13 }}>Find User</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Connection Picker for Start New Chat (Requirement 35) */}
      <Modal visible={isConnectionPickerVisible} transparent animationType="slide" onRequestClose={() => setIsConnectionPickerVisible(false)}>
        <View style={styles.codeModalOverlay}>
          <View style={[styles.connectionPickerCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <View style={styles.pickerHeaderRow}>
              <Text style={[styles.codeModalTitle, { color: theme.text || '#ffffff' }]}>START NEW CHAT</Text>
              <TouchableOpacity onPress={() => setIsConnectionPickerVisible(false)}>
                <Text style={{ color: theme.textMuted || '#64748b', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.codeModalSubtitle, { color: theme.textSecondary || '#9ca3af' }]}>
              Select a verified connection to open direct messaging
            </Text>
            <FlatList
              data={connections}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 280 }}
              renderItem={({ item: conn }) => {
                const peerId = (conn.users || []).find((id) => id !== currentUser?.uid);
                const peer = conn.userData?.[peerId] || conn.participants?.[peerId] || {};
                return (
                  <TouchableOpacity
                    style={[
                      styles.connPickerItem,
                      { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' },
                    ]}
                    onPress={() => {
                      setIsConnectionPickerVisible(false);
                      navigation.navigate('DirectMessage', {
                        peerUser: {
                          id: peerId,
                          fullName: peer.fullName || peer.name || 'Filmmaker',
                          username: peer.username || 'crew',
                          photoURL: peer.photoURL || peer.avatar || null,
                          role: peer.role || 'Filmmaker',
                        },
                      });
                    }}
                  >
                    <Text style={{ color: theme.text || '#ffffff', fontWeight: '700', fontSize: 13 }}>
                      {peer.fullName || peer.name || 'Filmmaker'}
                    </Text>
                    <Text style={{ color: theme.primary || '#f5a623', fontSize: 11, marginTop: 2 }}>
                      {peer.role || 'Connection'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Quick Profile Modal for Code-found User */}
      {selectedQuickProfile && (
        <QuickProfileModal
          visible={isQuickProfileVisible}
          profile={selectedQuickProfile}
          onClose={() => {
            setIsQuickProfileVisible(false);
            setSelectedQuickProfile(null);
          }}
          onAccept={() => handleSendConnectionRequestFromCode(selectedQuickProfile)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
  },
  conversationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  conversationsBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  starSaveBtn: {
    padding: 4,
    marginRight: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 60,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  managerNotice: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 10,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  senderName: {
    fontSize: 15,
    fontWeight: '800',
  },
  senderRole: {
    fontSize: 11,
    marginTop: 2,
  },
  detailsBox: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  detailLine: {
    fontSize: 12,
    marginBottom: 3,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    fontStyle: 'italic',
  },
  linkBtn: {
    paddingVertical: 6,
    marginTop: 8,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  linkBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  declineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageConnectionBtn: {
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  messageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  messageBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  scriptSidesBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sharePromptCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  shareNowBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLaterBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedScriptNotice: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  scriptSharedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 999,
  },
  fabBtnText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 34,
  },
  codeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  codeModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  codeModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  codeModalSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  codeCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeFindBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  connectionPickerCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    maxHeight: 400,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connPickerItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
});
