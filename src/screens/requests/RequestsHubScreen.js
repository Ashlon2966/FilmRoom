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
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  streamIncomingRequests,
  streamOutgoingRequests,
  acceptContactRequest,
  declineContactRequest,
  REQUEST_STATUS,
  REQUEST_TYPES,
} from '../../services/contactRequestService';
import { streamAcceptedConnections } from '../../services/connectionService';

export default function RequestsHubScreen({ navigation }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();

  const [activeSegment, setActiveSegment] = useState('INCOMING'); // 'INCOMING' | 'OUTGOING' | 'CONNECTIONS'
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

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

  // Handle Accept
  const handleAccept = async (req) => {
    setActionLoadingId(req.id);
    try {
      await acceptContactRequest(req);
      Alert.alert(
        'Connection Established',
        `You and ${req.sender?.name || 'Filmmaker'} are now connected. Private messaging is unlocked.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Message Now',
            onPress: () => {
              navigation.navigate('DirectMessage', {
                peerUser: {
                  id: req.sender.uid,
                  fullName: req.sender.name,
                  username: req.sender.username,
                  photoURL: req.sender.photoURL || null,
                  role: req.sender.role,
                },
              });
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Decline
  const handleDecline = (req) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline this inquiry from ${req.sender?.name || 'Filmmaker'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(req.id);
            try {
              await declineContactRequest(req.id);
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Open Material Link
  const handleOpenLink = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open material link.');
    });
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

        {/* 3-Segment Control */}
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
                Incoming
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
              Outgoing ({outgoingRequests.length})
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
                        backgroundColor:
                          item.type === REQUEST_TYPES.HIRING_TO_TALENT ? '#2a2215' : '#141a24',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        {
                          color:
                            item.type === REQUEST_TYPES.HIRING_TO_TALENT ? theme.primary : '#93c5fd',
                        },
                      ]}
                    >
                      {item.type === REQUEST_TYPES.HIRING_TO_TALENT
                        ? '🎬 HIRING INQUIRY'
                        : '🎗 TALENT SUBMISSION'}
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
                  {item.sender?.photoURL ? (
                    <Image source={{ uri: item.sender.photoURL }} style={styles.senderAvatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                        {item.sender?.name ? item.sender.name[0].toUpperCase() : 'F'}
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

                  {item.details?.roleName && (
                    <Text style={[styles.detailLine, { color: theme.text }]}>
                      Role Needed: <Text style={{ fontWeight: '700' }}>{item.details.roleName}</Text>
                    </Text>
                  )}

                  {item.details?.roleOrDepartment && (
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
                </View>

                {/* Actions Row */}
                {isPending && (
                  <View style={styles.cardActionsRow}>
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

            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.targetLabel, { color: theme.textSecondary }]}>
                    Inquiry sent to {item.targetTalent?.name || 'Filmmaker'}
                  </Text>
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

                {item.details?.roleName && (
                  <Text style={[styles.detailLine, { color: theme.text }]}>
                    Role: <Text style={{ fontWeight: '700' }}>{item.details.roleName}</Text>
                  </Text>
                )}

                {item.details?.message && (
                  <Text style={[styles.messageText, { color: theme.textSecondary }]}>
                    "{item.details.message}"
                  </Text>
                )}

                {/* If accepted, offer direct message button */}
                {isAccepted && (
                  <TouchableOpacity
                    style={[styles.messageConnectionBtn, { backgroundColor: theme.surface, borderColor: theme.primary }]}
                    onPress={() => {
                      navigation.navigate('DirectMessage', {
                        peerUser: {
                          id: item.targetTalent.uid,
                          fullName: item.targetTalent.name,
                          username: item.targetTalent.username,
                          photoURL: item.targetTalent.photoURL || null,
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
                  {peerData.photoURL ? (
                    <Image source={{ uri: peerData.photoURL }} style={styles.senderAvatar} />
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
                          photoURL: peerData.photoURL || null,
                          role: peerData.role || 'Creative',
                        },
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.messageBtnText}>💬 Message</Text>
                  </TouchableOpacity>
                </View>
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
});
