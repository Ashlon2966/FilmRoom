import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { sendNotification, NOTIFICATION_TYPES } from './notificationService';

/**
 * Generates a deterministic ID for a follow relationship.
 * Ensures an exact 1:1 follow edge between follower and target entity.
 */
export const getFollowDocId = (followerUid, targetUid) => `${followerUid}_${targetUid}`;

/**
 * Checks whether followerUid is currently following targetUid.
 * @param {string} followerUid - Active user UID
 * @param {string} targetUid - Target filmmaker/production UID
 * @returns {Promise<boolean>}
 */
export const isFollowingUser = async (followerUid, targetUid) => {
  if (!followerUid || !targetUid) return false;
  try {
    const docRef = doc(db, 'follows', getFollowDocId(followerUid, targetUid));
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (err) {
    return false;
  }
};

/**
 * Follow a filmmaker, director, producer, or casting profile for production updates.
 * Requirement 29 & 91: Following is for updates, not popularity. No counts, no likes.
 * Completely independent from connections, contact requests, and chat.
 *
 * @param {Object} follower - Current user object
 * @param {Object} target - Target filmmaker profile
 */
export const followFilmmaker = async (follower, target) => {
  if (!follower?.uid || !target?.id) return;
  const followId = getFollowDocId(follower.uid, target.id);
  const docRef = doc(db, 'follows', followId);

  await setDoc(docRef, {
    followId,
    followerUid: follower.uid,
    followerName: follower.displayName || follower.fullName || 'Filmmaker',
    targetUid: target.id,
    targetName: target.fullName || target.name || target.displayName || 'Filmmaker',
    targetRole: target.role || target.roles?.[0] || 'Creative',
    createdAt: serverTimestamp(),
  });

  // Notify target that a filmmaker is following for production updates
  try {
    await sendNotification({
      recipientUid: target.id,
      senderUid: follower.uid,
      senderName: follower.displayName || follower.fullName || 'Filmmaker',
      type: NOTIFICATION_TYPES.FOLLOW_UPDATE || 'FOLLOW_UPDATE',
      title: 'New Profile Follower',
      message: `${follower.displayName || follower.fullName || 'A filmmaker'} followed your profile for production updates and calls.`,
      targetId: follower.uid,
      targetType: 'USER',
    });
  } catch (_) {
    // Notification failure should not block follow
  }
};

/**
 * Unfollow a filmmaker.
 * Requirement 57: Unfollowing must NOT delete an existing connection.
 */
export const unfollowFilmmaker = async (followerUid, targetUid) => {
  if (!followerUid || !targetUid) return;
  const followId = getFollowDocId(followerUid, targetUid);
  const docRef = doc(db, 'follows', followId);
  await deleteDoc(docRef);
};

/**
 * Real-time subscription to check if currentUser is following targetUid.
 */
export const streamFollowStatus = (followerUid, targetUid, onStatusChange) => {
  if (!followerUid || !targetUid) {
    onStatusChange(false);
    return () => {};
  }

  const followId = getFollowDocId(followerUid, targetUid);
  const docRef = doc(db, 'follows', followId);
  return onSnapshot(
    docRef,
    (snap) => {
      onStatusChange(snap.exists());
    },
    () => {
      onStatusChange(false);
    }
  );
};
