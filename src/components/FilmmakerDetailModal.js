import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  getConnectionStatus,
  acceptConnectionRequest,
  removeConnection,
} from '../services/connectionService';
import { getPendingRequestBetweenUsers } from '../services/contactRequestService';
import { AVAILABILITY_CONFIG, AVAILABILITY_STATUS, hasCapability } from '../config/rolesConfig';

// Modals for the two contact flows and private shortlist
import RequestContactModal from './RequestContactModal';
import SubmitInterestModal from './SubmitInterestModal';
import SaveToShortlistModal from './SaveToShortlistModal';

export default function FilmmakerDetailModal({ visible, filmmaker, onClose, onSendPitch }) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('Showreel');
  const [connectionState, setConnectionState] = useState({
    exists: false,
    status: null,
    isInitiator: false,
    isRecipient: false,
    connection: null,
  });
  const [pendingContactRequest, setPendingContactRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal display states
  const [isRequestContactModalOpen, setIsRequestContactModalOpen] = useState(false);
  const [isSubmitInterestModalOpen, setIsSubmitInterestModalOpen] = useState(false);
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);

  // Query connection and request state when modal opens
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      if (visible && currentUser?.uid && filmmaker?.id && currentUser.uid !== filmmaker.id) {
        const [conn, pendingReq] = await Promise.all([
          getConnectionStatus(currentUser.uid, filmmaker.id),
          getPendingRequestBetweenUsers(currentUser.uid, filmmaker.id),
        ]);
        if (isMounted) {
          setConnectionState(conn);
          setPendingContactRequest(pendingReq);
        }
      }
    };

    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, [visible, currentUser?.uid, filmmaker?.id]);

  if (!filmmaker) return null;

  const isSelf = currentUser?.uid === filmmaker.id;

  // Resolve 4-state availability
  let availKey = AVAILABILITY_STATUS.AVAILABLE;
  let availDate = null;
  if (filmmaker.availability) {
    if (typeof filmmaker.availability === 'object') {
      availKey = filmmaker.availability.status || AVAILABILITY_STATUS.AVAILABLE;
      availDate = filmmaker.availability.availableFromDate || null;
    } else if (typeof filmmaker.availability === 'string') {
      availKey = filmmaker.availability;
    }
  }

  const availCfg = AVAILABILITY_CONFIG[availKey] || AVAILABILITY_CONFIG[AVAILABILITY_STATUS.AVAILABLE];
  const availLabel =
    availKey === AVAILABILITY_STATUS.AVAILABLE_FROM && availDate
      ? `Avail: ${availDate}`
      : availCfg.label;

  // Representation info
  const isRepresented = !!filmmaker.representation?.isRepresented;
  const agencyName = filmmaker.representation?.agencyName;
  const managerName = filmmaker.representation?.managerName;

  // Capability checks
  const myRole = userProfile?.role || userProfile?.roles?.[0] || 'Filmmaker';
  const canShortlist = hasCapability(myRole, 'canShortlistTalent');
  const canRequestHiringContact = hasCapability(myRole, 'canRequestContact');

  // Determine if Flow B (Talent to Hiring) applies
  const isTargetHiringLead =
    filmmaker.category === 'PRODUCTION' ||
    ['Film Director', 'Film Producer / Exec Producer', 'Casting Director', 'Line Producer / UPM'].includes(
      filmmaker.role
    );
  const isFlowB = !canRequestHiringContact && isTargetHiringLead;

  // Contact / Message Handler
  const handleMessagePress = () => {
    if (connectionState.status === 'ACCEPTED') {
      onSendPitch();
    } else {
      Alert.alert(
        'Professional Connection Required',
        'FilmRoom requires an accepted contact request between filmmakers before private direct messaging is enabled. Dispatch a contact request or submission to establish a verified connection.',
        [{ text: 'Understood' }]
      );
    }
  };

  const handlePrimaryContactPress = () => {
    if (isSelf || actionLoading) return;

    if (connectionState.status === 'ACCEPTED') {
      // Prompt to remove connection
      Alert.alert(
        'Professional Connection',
        `You and ${filmmaker.name} are professionally connected. Would you like to remove this connection?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove Connection',
            style: 'destructive',
            onPress: async () => {
              setActionLoading(true);
              try {
                if (connectionState.connection?.id) {
                  await removeConnection(connectionState.connection.id);
                  setConnectionState({
                    exists: false,
                    status: null,
                    isInitiator: false,
                    isRecipient: false,
                    connection: null,
                  });
                }
              } catch (e) {
                Alert.alert('Error', e.message);
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
      return;
    }

    if (connectionState.status === 'PENDING' && connectionState.isRecipient) {
      // Accept connection directly
      setActionLoading(true);
      acceptConnectionRequest(connectionState.connection.id)
        .then(() => {
          return getConnectionStatus(currentUser.uid, filmmaker.id);
        })
        .then((updated) => {
          setConnectionState(updated);
          Alert.alert('Connected', `You and ${filmmaker.name} are now connected.`);
        })
        .catch((err) => Alert.alert('Error', err.message))
        .finally(() => setActionLoading(false));
      return;
    }

    // Open appropriate contextual modal
    if (isFlowB) {
      setIsSubmitInterestModalOpen(true);
    } else {
      setIsRequestContactModalOpen(true);
    }
  };

  const handleOpenShowreel = () => {
    if (filmmaker.showreelUrl) {
      Linking.openURL(filmmaker.showreelUrl).catch(() => {
        Alert.alert('Unable to open link', 'Please check the URL format.');
      });
    }
  };

  const isPending =
    (connectionState.status === 'PENDING' && connectionState.isInitiator) ||
    !!pendingContactRequest;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: theme.background, borderColor: theme.cardBorder },
          ]}
        >
          {/* Close Icon */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.surface }]}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header / Avatar Block */}
            <View style={styles.profileHeader}>
              {filmmaker.avatar ? (
                <Image source={{ uri: filmmaker.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                    {filmmaker.name ? filmmaker.name[0].toUpperCase() : 'F'}
                  </Text>
                </View>
              )}

              <View style={styles.titleCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.name, { color: theme.text }]}>{filmmaker.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: '#242830', borderColor: theme.primary + '55' }]}>
                    <Text style={[styles.roleText, { color: theme.primary }]}>
                      {filmmaker.role || 'Filmmaker'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.metaSub, { color: theme.textSecondary }]}>
                  @{filmmaker.username} • 📍 {filmmaker.location || 'Available Worldwide'}
                </Text>
              </View>
            </View>

            {/* 4-State Availability Pill */}
            <View
              style={[
                styles.availBanner,
                { backgroundColor: availCfg.bgColor, borderColor: availCfg.color + '55' },
              ]}
            >
              <Text style={{ fontSize: 13 }}>{availCfg.icon}</Text>
              <Text style={[styles.availBannerText, { color: availCfg.color }]}>
                {availLabel.toUpperCase()}
              </Text>
            </View>

            {/* Representation Gateway Box */}
            <View
              style={[
                styles.repGatewayBox,
                {
                  backgroundColor: isRepresented ? '#141a24' : theme.card,
                  borderColor: isRepresented ? '#2b3952' : theme.cardBorder,
                },
              ]}
            >
              <View style={styles.repGatewayHeader}>
                <Text style={[styles.repGatewayTitle, { color: isRepresented ? '#93c5fd' : theme.text }]}>
                  {isRepresented ? '🏛 OFFICIAL REPRESENTATION' : '👤 SELF-REPRESENTED TALENT'}
                </Text>
              </View>

              {isRepresented ? (
                <View style={{ marginTop: 4 }}>
                  {agencyName ? (
                    <Text style={[styles.repDetailLine, { color: theme.text }]}>
                      Agency: <Text style={{ fontWeight: '800' }}>{agencyName}</Text>
                    </Text>
                  ) : null}
                  {managerName ? (
                    <Text style={[styles.repDetailLine, { color: theme.text }]}>
                      Manager / Agent: <Text style={{ fontWeight: '800' }}>{managerName}</Text>
                    </Text>
                  ) : null}
                  <Text style={[styles.repNotice, { color: theme.textMuted }]}>
                    All inquiries route to official representation. Private contact info remains shielded.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.repNotice, { color: theme.textSecondary, marginTop: 4 }]}>
                  Direct professional inquiries and casting requests accepted via FilmRoom.
                </Text>
              )}
            </View>

            {/* Action Row: Primary Contact + Message + Shortlist */}
            {!isSelf && (
              <View style={styles.actionButtonRow}>
                {/* Primary Contact Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryContactBtn,
                    {
                      backgroundColor:
                        connectionState.status === 'ACCEPTED'
                          ? '#1e3d29'
                          : isPending
                          ? theme.surface
                          : theme.primary,
                      borderColor:
                        connectionState.status === 'ACCEPTED'
                          ? '#4ade80'
                          : isPending
                          ? theme.cardBorder
                          : theme.primary,
                    },
                  ]}
                  onPress={handlePrimaryContactPress}
                  disabled={actionLoading || isPending}
                  activeOpacity={0.8}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryBtnText,
                        {
                          color:
                            connectionState.status === 'ACCEPTED'
                              ? '#4ade80'
                              : isPending
                              ? theme.textSecondary
                              : '#000000',
                        },
                      ]}
                    >
                      {connectionState.status === 'ACCEPTED'
                        ? 'Connected ✔'
                        : isPending
                        ? 'Inquiry Pending ⏳'
                        : connectionState.status === 'PENDING' && connectionState.isRecipient
                        ? 'Accept Request'
                        : isFlowB
                        ? '+ Submit Interest'
                        : '+ Request Contact'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Shortlist Button (Available to hiring roles) */}
                {canShortlist && (
                  <TouchableOpacity
                    style={[
                      styles.shortlistBtn,
                      { backgroundColor: theme.surface, borderColor: theme.cardBorder },
                    ]}
                    onPress={() => setIsShortlistModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.shortlistBtnText, { color: theme.text }]}>★ Save</Text>
                  </TouchableOpacity>
                )}

                {/* Direct Message Button (Requires connection) */}
                <TouchableOpacity
                  style={[
                    styles.messageBtn,
                    {
                      backgroundColor:
                        connectionState.status === 'ACCEPTED' ? theme.surface : '#14161a',
                      borderColor:
                        connectionState.status === 'ACCEPTED' ? theme.primary : theme.cardBorder,
                      opacity: connectionState.status === 'ACCEPTED' ? 1 : 0.6,
                    },
                  ]}
                  onPress={handleMessagePress}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.messageBtnText,
                      {
                        color:
                          connectionState.status === 'ACCEPTED'
                            ? theme.primary
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    💬 Message
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Union, Age Range, and Languages Row */}
            <View style={styles.attributesRow}>
              {filmmaker.unionStatus && (
                <View style={[styles.attrChip, { backgroundColor: '#18202c', borderColor: '#2b3952' }]}>
                  <Text style={[styles.attrText, { color: '#93c5fd' }]}>
                    Union: {filmmaker.unionStatus}
                  </Text>
                </View>
              )}
              {filmmaker.ageRange ? (
                <View style={[styles.attrChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.attrText, { color: theme.text }]}>
                    Age: {filmmaker.ageRange}
                  </Text>
                </View>
              ) : null}
            </View>

            {filmmaker.languages && filmmaker.languages.length > 0 && (
              <Text style={[styles.langLine, { color: theme.textSecondary }]}>
                🗣 Languages:{' '}
                <Text style={{ color: theme.text }}>
                  {Array.isArray(filmmaker.languages)
                    ? filmmaker.languages.join(', ')
                    : filmmaker.languages}
                </Text>
              </Text>
            )}

            {/* Bio */}
            {filmmaker.bio ? (
              <Text style={[styles.bio, { color: theme.textSecondary }]}>{filmmaker.bio}</Text>
            ) : null}

            {/* Rate & Focus Line */}
            {filmmaker.dayRate ? (
              <Text style={[styles.rateContract, { color: theme.primary }]}>
                Day Rate / Terms: <Text style={{ color: theme.text }}>{filmmaker.dayRate}</Text>
              </Text>
            ) : null}

            {/* Portfolio Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
              {['Showreel', 'Equipment Kit', 'Credits & Accolades'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tabItem,
                      isActive && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                    ]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        { color: isActive ? theme.primary : theme.textMuted },
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Tab Contents */}
            {activeTab === 'Showreel' && (
              <View style={styles.tabContent}>
                {filmmaker.showreelUrl ? (
                  <TouchableOpacity
                    style={[
                      styles.reelPlaceholder,
                      { backgroundColor: '#000000', borderColor: theme.primary },
                    ]}
                    onPress={handleOpenShowreel}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 36 }}>🎬</Text>
                    <Text style={[styles.reelUrlText, { color: theme.primary }]}>
                      {filmmaker.showreelUrl}
                    </Text>
                    <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 11 }}>
                      Tap to open external showreel (Vimeo / YouTube / Drive)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.emptyTabCard, { borderColor: theme.cardBorder }]}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                      No showreel link attached.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'Equipment Kit' && (
              <View style={styles.tabContent}>
                {filmmaker.equipment && filmmaker.equipment.length > 0 ? (
                  filmmaker.equipment.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.gearItem,
                        { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                    >
                      <Text style={{ color: theme.primary, marginRight: 8 }}>✔</Text>
                      <Text style={[styles.gearName, { color: theme.text }]}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyTabCard, { borderColor: theme.cardBorder }]}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                      No owned gear package listed.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'Credits & Accolades' && (
              <View style={styles.tabContent}>
                {filmmaker.credits && filmmaker.credits.length > 0 ? (
                  filmmaker.credits.map((c, i) => (
                    <View
                      key={i}
                      style={[
                        styles.creditRow,
                        { backgroundColor: theme.card, borderColor: theme.cardBorder },
                      ]}
                    >
                      <Text style={[styles.creditTitle, { color: theme.text }]}>
                        {typeof c === 'string' ? c : c.title}
                      </Text>
                      {c.type ? (
                        <Text style={[styles.creditType, { color: theme.textMuted }]}>{c.type}</Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyTabCard, { borderColor: theme.cardBorder }]}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                      No credits listed yet.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Flow A Contact Request Modal */}
      <RequestContactModal
        visible={isRequestContactModalOpen}
        targetTalent={filmmaker}
        onClose={() => setIsRequestContactModalOpen(false)}
        onSuccess={() => {
          setPendingContactRequest({ status: 'PENDING' });
        }}
      />

      {/* Flow B Submit Interest Modal */}
      <SubmitInterestModal
        visible={isSubmitInterestModalOpen}
        targetLead={filmmaker}
        onClose={() => setIsSubmitInterestModalOpen(false)}
        onSuccess={() => {
          setPendingContactRequest({ status: 'PENDING' });
        }}
      />

      {/* Private Shortlist Modal */}
      <SaveToShortlistModal
        visible={isShortlistModalOpen}
        talent={filmmaker}
        onClose={() => setIsShortlistModalOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '900',
  },
  titleCol: { flex: 1 },
  name: { fontSize: 18, fontWeight: '900' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '700' },
  metaSub: { fontSize: 11, marginTop: 4 },
  availBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  availBannerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  repGatewayBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  repGatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repGatewayTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  repDetailLine: {
    fontSize: 12,
    marginTop: 4,
  },
  repNotice: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  primaryContactBtn: {
    flex: 1.4,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  shortlistBtn: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortlistBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  messageBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  attributesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  attrChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  attrText: {
    fontSize: 11,
    fontWeight: '700',
  },
  langLine: {
    fontSize: 12,
    marginBottom: 10,
  },
  bio: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  rateContract: { fontSize: 12, fontWeight: 'bold', marginBottom: 16 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#242830', marginBottom: 16 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabContent: { marginTop: 4 },
  reelPlaceholder: {
    padding: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  reelUrlText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  emptyTabCard: {
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  gearName: { fontSize: 13, fontWeight: '600', flex: 1 },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  creditTitle: { fontSize: 13, fontWeight: '700' },
  creditType: { fontSize: 11 },
});