import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Searches for a user document by exact username match (case-insensitive search key).
 * @param {string} username - Target username without '@'
 * @returns {Promise<Object|null>} User data object or null
 */
export const findUserByUsername = async (username) => {
  const cleanUsername = username.trim().toLowerCase().replace('@', '');
  if (!cleanUsername) return null;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('usernameLower', '==', cleanUsername));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

/**
 * Sends an invitation to a target user to join a film room.
 */
export const sendRoomInvite = async (roomId, roomTitle, senderUser, targetUser, assignedRoles) => {
  const invitesRef = collection(db, 'invitations');
  return await addDoc(invitesRef, {
    roomId,
    roomTitle,
    senderId: senderUser.uid,
    senderName: senderUser.displayName || senderUser.email,
    recipientId: targetUser.id,
    recipientUsername: targetUser.username,
    assignedRoles: assignedRoles || ['Crew'],
    status: 'PENDING', // 'PENDING' | 'ACCEPTED' | 'REJECTED'
    createdAt: serverTimestamp(),
  });
};