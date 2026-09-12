import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  streamNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  NOTIFICATION_TYPES,
} from '../services/notificationService';

export default function NotificationCenterModal({ visible, onClose, navigation }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
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

    return () => unsubscribe();
  }, [visible, currentUser?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifications);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to remove all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearAllNotifications(notifications),
        },
      ]
    );
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

          {/* List Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIcon}>🔔</Text>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Notifications</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                    You're completely caught up! Room invitations, requests, and updates will appear here.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isUnread = !item.isRead;
                return (
                  <TouchableOpacity
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
                        <Text style={styles.typeIcon}>{getIconForType(item.type)}</Text>
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
              }}
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
});
