import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import {
  streamNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  NOTIFICATION_TYPES,
} from '../services/notificationService';
import {
  streamIncomingRequests,
  acceptContactRequest,
  declineContactRequest,
  REQUEST_STATUS,
} from '../services/contactRequestService';
import QuickProfileModal from './QuickProfileModal';

export default function NotificationCenterModal({ visible, onClose, navigation }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useModal();

  const [notifications, setNotifications] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [quickProfileData, setQuickProfileData] = useState(null);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !currentUser?.uid) return;

    setLoading(true);
    const unsubscribe = streamNotifications(
      currentUser.uid,
      (list) => {
        setNotifications(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubRequests = streamIncomingRequests(currentUser.uid, (reqs) => {
      setIncomingRequests(reqs);
    });

    return () => {
      unsubscribe();
      unsubRequests();
    };
  }, [visible, currentUser?.uid]);

  const pendingRequests = incomingRequests.filter(
    (r) => r.status === REQUEST_STATUS.PENDING
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifications);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    showConfirm({
      title: 'Clear All Notifications?',
      message: 'Are you sure you want to remove all activity notifications?',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: () => clearAllNotifications(notifications),
    });
  };

  const handleAcceptRequest = async (req) => {
    setRequestActionLoadingId(req.id);
    try {
      await acceptContactRequest(req);
      showToast({
        type: 'success',
        title: 'Connected',
        message: `You are now connected with ${req.sender?.name || 'Filmmaker'}.`,
      });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to accept request' });
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleDeclineRequest = (req) => {
    showConfirm({
      title: 'Decline Request?',
      message: `Decline contact request from ${req.sender?.name || 'Filmmaker'}?`,
      confirmText: 'Decline',
      cancelText: 'Keep',
      isDestructive: true,
      onConfirm: async () => {
        setRequestActionLoadingId(req.id);
        try {
          await declineContactRequest(req.id);
          showToast({ type: 'info', message: 'Request declined' });
        } catch (err) {
          showToast({ type: 'error', message: err.message || 'Failed to decline request' });
        } finally {
          setRequestActionLoadingId(null);
        }
      },
    });
  };

  const handlePressNotification = async (item) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
    }

    if (item.targetType === 'ROOM' && item.targetId) {
      onClose();
      if (navigation) {
        navigation.navigate('RoomDetail', { roomId: item.targetId });
      }
    } else if (item.targetType === 'CONTACT_REQUEST') {
      onClose();
      if (navigation) {
        navigation.navigate('RequestsTab');
      }
    } else if (item.targetType === 'CONNECTION') {
      onClose();
      if (navigation) {
        navigation.navigate('Messages');
      }
    }
  };

  const handleDeleteItem = async (notificationId) => {
    await deleteNotification(notificationId);
  };

  const getIconForType = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.ROOM_INVITATION:
        return '🎬';
      case NOTIFICATION_TYPES.CONTACT_REQUEST:
        return '🤝';
      case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
        return '🎉';
      case NOTIFICATION_TYPES.REQUEST_DECLINED:
        return '📋';
      case NOTIFICATION_TYPES.REEL_SUBMITTED:
        return '📼';
      case NOTIFICATION_TYPES.CREW_CALL_UPDATE:
        return '📢';
      default:
        return '🔔';
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    try {
      const now = new Date();
      const diffMs = now - new Date(date);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.text }]}>NOTIFICATIONS</Text>
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <View style={styles.actionBar}>
              {unreadCount > 0 ? (
                <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionBtn}>
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>✓ Mark all as read</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <TouchableOpacity onPress={handleClearAll} style={styles.actionBtn}>
                <Text style={[styles.actionBtnText, { color: theme.textMuted }]}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Body Content with distinct Contact Requests & Activity sections */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              {/* ── SECTION 1: CONTACT REQUESTS ── */}
              <View style={styles.sectionHeaderWrap}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>CONTACT REQUESTS</Text>
                {pendingRequests.length > 0 && (
                  <View style={[styles.pendingPill, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
                    <Text style={[styles.pendingPillText, { color: theme.primary }]}>
                      {pendingRequests.length} PENDING
                    </Text>
                  </View>
                )}
              </View>

              {pendingRequests.length === 0 ? (
                <View style={[styles.emptySectionBox, { borderColor: theme.cardBorder, backgroundColor: theme.background }]}>
                  <Text style={[styles.emptySectionText, { color: theme.textMuted }]}>
                    No pending contact requests.
                  </Text>
                </View>
              ) : (
                pendingRequests.map((req) => {
                  const senderName = req.sender?.fullName || req.sender?.name || 'Filmmaker';
                  const senderRole = req.sender?.role || 'Talent';
                  const senderAvatar = req.sender?.photoURL || req.sender?.avatar;
                  const isActionLoading = requestActionLoadingId === req.id;

                  return (
                    <View
                      key={req.id}
                      style={[
                        styles.requestCard,
                        { backgroundColor: theme.background, borderColor: theme.primary + '40' },
                      ]}
                    >
                      <View style={styles.requestTopRow}>
                        <View style={styles.senderWrap}>
                          {senderAvatar ? (
                            <Image source={{ uri: senderAvatar }} style={styles.reqAvatar} resizeMode="cover" />
                          ) : (
                            <View style={[styles.reqAvatarPlaceholder, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                              <Text style={{ color: theme.primary, fontWeight: '700' }}>
                                {senderName[0]?.toUpperCase() || 'F'}
                              </Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.reqName, { color: theme.text }]} numberOfLines={1}>
                              {senderName}
                            </Text>
                            <Text style={[styles.reqRole, { color: theme.primary }]} numberOfLines={1}>
                              {senderRole}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {req.details?.projectInterest || req.details?.roleOrDepartment ? (
                        <Text style={[styles.reqProject, { color: theme.textSecondary }]} numberOfLines={1}>
                          Target: {req.details.roleOrDepartment || 'Role'} • {req.details.projectInterest || 'Project'}
                        </Text>
                      ) : null}

                      {req.details?.message ? (
                        <Text style={[styles.reqMessage, { color: theme.textMuted }]} numberOfLines={2}>
                          "{req.details.message}"
                        </Text>
                      ) : null}

                      {/* Actions: Quick View, Accept, Decline */}
                      <View style={styles.reqActionsRow}>
                        <TouchableOpacity
                          style={[styles.quickViewBtn, { borderColor: theme.cardBorder }]}
                          onPress={() => setQuickProfileData(req.sender)}
                        >
                          <Text style={[styles.quickViewText, { color: theme.textSecondary }]}>Quick View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.declineBtn, { borderColor: theme.danger + '60' }]}
                          onPress={() => handleDeclineRequest(req)}
                          disabled={isActionLoading}
                        >
                          <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '700' }}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                          onPress={() => handleAcceptRequest(req)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              {/* ── SECTION 2: ACTIVITY ── */}
              <View style={[styles.sectionHeaderWrap, { marginTop: 20 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>ACTIVITY</Text>
              </View>

              {notifications.length === 0 ? (
                <View style={[styles.emptySectionBox, { borderColor: theme.cardBorder, backgroundColor: theme.background }]}>
                  <Text style={[styles.emptySectionText, { color: theme.textMuted }]}>
                    No recent activity notifications.
                  </Text>
                </View>
              ) : (
                notifications.map((item) => {
                  const isUnread = !item.isRead;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.notificationCard,
                        {
                          backgroundColor: isUnread ? theme.primary + '12' : theme.background,
                          borderColor: isUnread ? theme.primary + '40' : theme.cardBorder,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handlePressNotification(item)}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.senderWrap}>
                          {item.senderPhotoURL ? (
                            <Image source={{ uri: item.senderPhotoURL }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} resizeMode="cover" />
                          ) : (
                            <Text style={styles.typeIcon}>{getIconForType(item.type)}</Text>
                          )}
                          <View style={styles.senderInfo}>
                            <Text style={[styles.itemTitle, { color: theme.text, fontWeight: isUnread ? '700' : '600' }]}>
                              {item.title}
                            </Text>
                            <Text style={[styles.timeText, { color: theme.textMuted }]}>
                              {formatTime(item.createdAt)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.rightActions}>
                          {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                          <TouchableOpacity
                            onPress={() => handleDeleteItem(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.deleteBtn}
                          >
                            <Text style={{ color: theme.textMuted, fontSize: 13 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={[styles.itemMessage, { color: isUnread ? theme.text : theme.textSecondary }]}>
                        {item.message}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Quick Profile Modal preview */}
          {quickProfileData && (
            <QuickProfileModal
              visible={!!quickProfileData}
              profile={quickProfileData}
              onClose={() => setQuickProfileData(null)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    height: '75%',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
    gap: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  notificationCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  senderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  typeIcon: {
    fontSize: 18,
  },
  senderInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 11,
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteBtn: {
    padding: 2,
  },
  itemMessage: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 28,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pendingPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptySectionBox: {
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reqAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  reqAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  reqName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reqRole: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  reqProject: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  reqMessage: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  reqActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  quickViewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickViewText: {
    fontSize: 11,
    fontWeight: '600',
  },
  declineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  acceptBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
});
