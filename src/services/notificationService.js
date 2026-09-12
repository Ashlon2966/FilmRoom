import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * In-App Notification Service for FilmRoom
 * Supports real-time streaming, creating, reading, and batch dismissing notifications.
 */

export const NOTIFICATION_TYPES = {
  ROOM_INVITATION: 'ROOM_INVITATION',
  CONTACT_REQUEST: 'CONTACT_REQUEST',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_DECLINED: 'REQUEST_DECLINED',
  REEL_SUBMITTED: 'REEL_SUBMITTED',
  CREW_CALL_UPDATE: 'CREW_CALL_UPDATE',
  SYSTEM: 'SYSTEM',
};

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
    orderBy('createdAt', 'desc'),
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
      onUpdate(list);
    },
    (err) => {
      console.warn('[NotificationService] Stream error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Dispatch an in-app notification to a user
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
