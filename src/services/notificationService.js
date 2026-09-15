import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { db } from '../../firebaseConfig';

/**
 * In-App & Device Notification Service for FilmRoom
 * Supports real-time streaming, creating, device push/local scheduling,
 * permission management, and settings-driven filtering.
 */

export const NOTIFICATION_TYPES = {
  ROOM_INVITATION: 'ROOM_INVITATION',
  CONTACT_REQUEST: 'CONTACT_REQUEST',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_DECLINED: 'REQUEST_DECLINED',
  REEL_SUBMITTED: 'REEL_SUBMITTED',
  CREW_CALL_UPDATE: 'CREW_CALL_UPDATE',
  SCRIPT_SHARED: 'SCRIPT_SHARED',
  CASTING_ACCEPTED: 'CASTING_ACCEPTED',
  SYSTEM: 'SYSTEM',
};

export const DEFAULT_NOTIF_PREFS = {
  reqContact: true,
  reqAccepted: true,
  reqDeclined: true,
  prodCrewCall: true,
  prodInvite: true,
  prodChanges: true,
  msgDirect: true,
  msgConnection: true,
  syncDone: false,
  syncFail: true,
  syncImport: true,
  quietHoursEnabled: false,
  quietFromHour: '22:00',
  quietToHour: '08:00',
};

// Set up notification handler for foreground notifications
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = notification.request.content.data?.type;
      const shouldDeliver = await shouldDeliverNotificationType(type);
      return {
        shouldShowAlert: shouldDeliver,
        shouldPlaySound: shouldDeliver,
        shouldSetBadge: shouldDeliver,
      };
    },
  });
} catch (e) {
  console.warn('[NotificationService] setNotificationHandler notice:', e.message);
}

/**
 * Request notification permissions safely at appropriate times.
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    await AsyncStorage.setItem('@filmroom_notif_permission_requested', 'true');
    await AsyncStorage.setItem('@filmroom_notif_permission_granted', granted ? 'true' : 'false');
    return granted;
  } catch (err) {
    console.warn('[NotificationService] requestNotificationPermissions error:', err.message);
    return false;
  }
}

/**
 * Check if permission has already been prompted to avoid repeatedly asking.
 */
export async function hasRequestedNotificationPermission() {
  try {
    const requested = await AsyncStorage.getItem('@filmroom_notif_permission_requested');
    return requested === 'true';
  } catch {
    return false;
  }
}

/**
 * Load user notification preferences from local storage and sync with Firestore
 */
export async function getNotificationPreferences(uid) {
  try {
    const local = await AsyncStorage.getItem('@filmroom_notification_prefs');
    if (local) {
      return { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(local) };
    }
  } catch (e) {
    console.warn('[NotificationService] Read local prefs error:', e.message);
  }
  return DEFAULT_NOTIF_PREFS;
}

/**
 * Save user notification preferences persistently to AsyncStorage and Firestore
 */
export async function saveNotificationPreferences(uid, prefs) {
  try {
    const merged = { ...DEFAULT_NOTIF_PREFS, ...prefs };
    await AsyncStorage.setItem('@filmroom_notification_prefs', JSON.stringify(merged));

    if (uid) {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        notificationPreferences: merged,
        updatedAt: serverTimestamp(),
      }).catch((e) => console.warn('Could not sync notif prefs to Firestore:', e.message));
    }
    return true;
  } catch (err) {
    console.warn('[NotificationService] saveNotificationPreferences error:', err.message);
    return false;
  }
}

/**
 * Check if a notification type is allowed based on user preferences and quiet hours.
 */
export async function shouldDeliverNotificationType(type) {
  try {
    const prefs = await getNotificationPreferences();
    if (!prefs) return true;

    // Check quiet hours
    if (prefs.quietHoursEnabled && prefs.quietFromHour && prefs.quietToHour) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const [fh, fm] = prefs.quietFromHour.split(':').map(Number);
      const [th, tm] = prefs.quietToHour.split(':').map(Number);
      const fromMins = (fh || 0) * 60 + (fm || 0);
      const toMins = (th || 0) * 60 + (tm || 0);

      const inQuiet =
        fromMins < toMins
          ? currentMins >= fromMins && currentMins < toMins
          : currentMins >= fromMins || currentMins < toMins;

      if (inQuiet) return false;
    }

    switch (type) {
      case NOTIFICATION_TYPES.CONTACT_REQUEST:
        return prefs.reqContact !== false;
      case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
        return prefs.reqAccepted !== false;
      case NOTIFICATION_TYPES.REQUEST_DECLINED:
        return prefs.reqDeclined !== false;
      case NOTIFICATION_TYPES.CREW_CALL_UPDATE:
        return prefs.prodCrewCall !== false;
      case NOTIFICATION_TYPES.ROOM_INVITATION:
        return prefs.prodInvite !== false;
      case NOTIFICATION_TYPES.SCRIPT_SHARED:
      case NOTIFICATION_TYPES.CASTING_ACCEPTED:
        return prefs.prodChanges !== false;
      default:
        return true;
    }
  } catch {
    return true;
  }
}

/**
 * Schedule or immediately trigger a device notification (visible in-app and in background)
 */
export async function scheduleDeviceNotification({ title, body, data = {} }) {
  try {
    const allowed = await shouldDeliverNotificationType(data?.type);
    if (!allowed) return null;

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'FilmRoom',
        body: body || '',
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // deliver immediately
    });
    return notifId;
  } catch (err) {
    console.warn('[NotificationService] scheduleDeviceNotification notice:', err.message);
    return null;
  }
}

/**
 * Real-time subscription to current user's in-app notifications
 */
export function streamNotifications(userId, onUpdate, onError) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'notifications'),
    where('recipientUid', '==', userId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(),
      }));

      list.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return timeB - timeA;
      });

      onUpdate(list);
    },
    (err) => {
      console.warn('[NotificationService] Stream error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Dispatch an in-app notification to a user and schedule a device notification
 */
export async function sendNotification({
  recipientUid,
  senderUid = null,
  senderName = 'A collaborator',
  senderPhotoURL = null,
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  targetId = null,
  targetType = null,
}) {
  if (!recipientUid) return null;

  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      recipientUid,
      senderUid,
      senderName,
      senderPhotoURL,
      type,
      title: title || 'New Notification',
      message: message || '',
      targetId,
      targetType,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // Also schedule device notification if permitted
    scheduleDeviceNotification({
      title: title || 'FilmRoom',
      body: message || '',
      data: { notificationId: docRef.id, type, targetId, targetType },
    });

    return docRef.id;
  } catch (err) {
    console.warn('[NotificationService] Failed to send notification:', err.message);
    return null;
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
      readAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[NotificationService] markNotificationAsRead error:', err.message);
  }
}

/**
 * Mark all unread notifications in the list as read in a single batch
 */
export async function markAllNotificationsAsRead(notifications = []) {
  const unread = notifications.filter((n) => !n.isRead);
  if (unread.length === 0) return;

  try {
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), {
        isRead: true,
        readAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn('[NotificationService] markAllNotificationsAsRead error:', err.message);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) return;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (err) {
    console.warn('[NotificationService] deleteNotification error:', err.message);
  }
}

/**
 * Clear all notifications for user in a batch
 */
export async function clearAllNotifications(notifications = []) {
  if (notifications.length === 0) return;
  try {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  } catch (err) {
    console.warn('[NotificationService] clearAllNotifications error:', err.message);
  }
}
