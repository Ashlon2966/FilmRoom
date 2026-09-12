import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Deterministic connection ID generator ensuring exactly one connection record
 * between any two filmmakers.
 */
export const getConnectionId = (uidA, uidB) => {
  if (!uidA || !uidB) return null;
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
};

/**
 * Checks connection state between two filmmakers.
 * Returns { exists: boolean, status: string|null, isInitiator: boolean, connection: object|null }
 */
export const getConnectionStatus = async (currentUid, targetUid) => {
  if (!currentUid || !targetUid || currentUid === targetUid) {
    return { exists: false, status: null, isInitiator: false, connection: null };
  }

  const connectionId = getConnectionId(currentUid, targetUid);
  try {
    const snap = await getDoc(doc(db, 'connections', connectionId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        exists: true,
        status: data.status, // 'PENDING' | 'ACCEPTED' | 'REJECTED'
        isInitiator: data.initiatorId === currentUid,
        isRecipient: data.recipientId === currentUid,
        connection: { id: snap.id, ...data },
      };
    }
    return { exists: false, status: null, isInitiator: false, connection: null };
  } catch (error) {
    console.error('Error fetching connection status:', error);
    return { exists: false, status: null, isInitiator: false, connection: null };
  }
};

export const isConnectionAccepted = async (uidA, uidB) => {
  if (!uidA || !uidB || uidA === uidB) return false;
  const connectionId = getConnectionId(uidA, uidB);
  try {
    const snap = await getDoc(doc(db, 'connections', connectionId));
    if (snap.exists()) {
      return snap.data().status === 'ACCEPTED';
    }
    return false;
  } catch (err) {
    console.warn('isConnectionAccepted check failed:', err.message);
    return false;
  }
};

/**
 * Sends a connection request from currentUser to targetUser.
 */
export const sendConnectionRequest = async (currentUser, targetUser) => {
  const currentUid = currentUser?.uid || currentUser?.id;
  const targetUid = targetUser?.id || targetUser?.uid;

  if (!currentUid || !targetUid || currentUid === targetUid) {
    throw new Error('Invalid users for connection request.');
  }

  const connectionId = getConnectionId(currentUid, targetUid);
  const connectionRef = doc(db, 'connections', connectionId);

  const payload = {
    id: connectionId,
    users: [currentUid, targetUid],
    initiatorId: currentUid,
    recipientId: targetUid,
    status: 'PENDING',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userData: {
      [currentUid]: {
        id: currentUid,
        fullName: currentUser.fullName || currentUser.displayName || 'Filmmaker',
        username: currentUser.username || 'crew',
        photoURL: currentUser.photoURL || null,
        role: currentUser.roles?.[0] || 'Filmmaker',
      },
      [targetUid]: {
        id: targetUid,
        fullName: targetUser.fullName || targetUser.displayName || targetUser.name || 'Filmmaker',
        username: targetUser.username || 'crew',
        photoURL: targetUser.photoURL || targetUser.avatar || null,
        role: targetUser.roles?.[0] || targetUser.role || 'Crew',
      },
    },
  };

  await setDoc(connectionRef, payload, { merge: true });
  return connectionId;
};

/**
 * Accepts a pending connection request.
 */
export const acceptConnectionRequest = async (connectionId) => {
  if (!connectionId) throw new Error('Connection ID required.');
  const connectionRef = doc(db, 'connections', connectionId);
  await updateDoc(connectionRef, {
    status: 'ACCEPTED',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Rejects or declines a connection request by removing the request record.
 */
export const rejectConnectionRequest = async (connectionId) => {
  if (!connectionId) throw new Error('Connection ID required.');
  const connectionRef = doc(db, 'connections', connectionId);
  await deleteDoc(connectionRef);
};

/**
 * Removes an existing connection between two filmmakers.
 * Crucial rule: Deleting a connection NEVER touches user accounts or message threads.
 */
export const removeConnection = async (connectionId) => {
  if (!connectionId) throw new Error('Connection ID required.');
  const connectionRef = doc(db, 'connections', connectionId);
  await deleteDoc(connectionRef);
};

/**
 * Streams accepted connections for a user.
 */
export const streamAcceptedConnections = (userId, onUpdate, onError) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, 'connections'),
    where('users', 'array-contains', userId),
    where('status', '==', 'ACCEPTED')
  );

  return onSnapshot(
    q,
    (snap) => {
      const connections = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      if (onUpdate) onUpdate(connections);
    },
    (err) => {
      console.error('Error streaming connections:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Streams incoming pending requests for a user.
 */
export const streamPendingRequests = (userId, onUpdate, onError) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, 'connections'),
    where('recipientId', '==', userId),
    where('status', '==', 'PENDING')
  );

  return onSnapshot(
    q,
    (snap) => {
      const requests = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      if (onUpdate) onUpdate(requests);
    },
    (err) => {
      console.error('Error streaming pending requests:', err);
      if (onError) onError(err);
    }
  );
};
