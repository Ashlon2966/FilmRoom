/**
 * FilmRoom Contact Request Service
 * 
 * Handles structured professional contact requests between filmmakers:
 * - Flow A: Hiring Side (Director/Producer/Casting) ➔ Talent
 * - Flow B: Talent ➔ Hiring Side (Professional Interest Submission)
 * - Representation Gateway Routing (Manager / Agent handling)
 * - Transitions accepted requests into mutual professional Connections
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const REQUEST_TYPES = {
  HIRING_TO_TALENT: 'HIRING_TO_TALENT', // Flow A
  TALENT_TO_HIRING: 'TALENT_TO_HIRING', // Flow B
};

export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
};

/**
 * Submit a new structured contact request.
 */
export const submitContactRequest = async ({
  type,
  sender,
  targetTalent,
  details,
}) => {
  if (!sender?.uid || !targetTalent?.uid) {
    throw new Error('Sender and target filmmaker must be specified.');
  }

  if (sender.uid === targetTalent.uid) {
    throw new Error('You cannot send a contact request to yourself.');
  }

  // Determine representation routing
  const isTargetRepresented = !!targetTalent.representation?.isRepresented;
  const managerUid = targetTalent.representation?.managerUid || null;
  const managerName = targetTalent.representation?.managerName || null;
  const managerEmail = targetTalent.representation?.managerEmail || null;

  // If represented and manager has a linked FilmRoom account, route to manager
  // Otherwise route directly to talent with representation details noted
  const isRoutedToManager = isTargetRepresented && !!managerUid;
  const recipientUid = isRoutedToManager ? managerUid : targetTalent.uid;

  const requestData = {
    type: type || REQUEST_TYPES.HIRING_TO_TALENT,
    sender: {
      uid: sender.uid,
      name: sender.name || sender.fullName || sender.displayName || 'Filmmaker',
      username: sender.username || 'crew',
      role: sender.role || 'Filmmaker',
      category: sender.category || 'TALENT',
      photoURL: sender.photoURL || null,
    },
    targetTalent: {
      uid: targetTalent.uid,
      name: targetTalent.name || targetTalent.fullName || targetTalent.displayName || 'Filmmaker',
      username: targetTalent.username || 'crew',
      role: targetTalent.role || 'Filmmaker',
      category: targetTalent.category || 'TALENT',
      photoURL: targetTalent.photoURL || null,
    },
    recipientUid,
    isRoutedToManager,
    managerName,
    managerEmail,
    details: {
      // Flow A
      projectName: details.projectName || null,
      roleName: details.roleName || null,
      productionType: details.productionType || null,
      materialLink: details.materialLink || null,
      // Flow B
      roleOrDepartment: details.roleOrDepartment || null,
      portfolioOrReel: details.portfolioOrReel || null,
      projectInterest: details.projectInterest || null,
      // Common
      message: (details.message || '').trim(),
    },
    status: REQUEST_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    connectionId: null,
  };

  const docRef = await addDoc(collection(db, 'contact_requests'), requestData);
  return { id: docRef.id, ...requestData };
};

/**
 * Stream incoming contact requests for a given user (either as talent or as manager).
 */
export const streamIncomingRequests = (uid, callback) => {
  if (!uid) return () => {};

  const q = query(
    collection(db, 'contact_requests'),
    where('recipientUid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Sort descending by creation date
      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(requests);
    },
    (err) => {
      console.warn('streamIncomingRequests error:', err.message);
      callback([]);
    }
  );
};

/**
 * Stream outgoing contact requests sent by the current user.
 */
export const streamOutgoingRequests = (uid, callback) => {
  if (!uid) return () => {};

  const q = query(
    collection(db, 'contact_requests'),
    where('sender.uid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Sort descending by creation date
      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(requests);
    },
    (err) => {
      console.warn('streamOutgoingRequests error:', err.message);
      callback([]);
    }
  );
};

/**
 * Accept a contact request and establish a mutual professional connection.
 */
export const acceptContactRequest = async (request) => {
  if (!request?.id) throw new Error('Valid request object required.');

  const uidA = request.sender.uid;
  const uidB = request.targetTalent.uid;
  const canonicalConnectionId = uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;

  const now = new Date().toISOString();

  // 1. Update contact request status
  await updateDoc(doc(db, 'contact_requests', request.id), {
    status: REQUEST_STATUS.ACCEPTED,
    resolvedAt: now,
    connectionId: canonicalConnectionId,
  });

  // 2. Create or activate mutual connection document
  await setDoc(
    doc(db, 'connections', canonicalConnectionId),
    {
      id: canonicalConnectionId,
      users: [uidA, uidB],
      uids: [uidA < uidB ? uidA : uidB, uidA < uidB ? uidB : uidA],
      status: 'ACCEPTED',
      initiatorUid: uidA,
      recipientUid: request.recipientUid,
      talentUid: uidB,
      fromRequestId: request.id,
      connectedAt: now,
      isManagerRouted: !!request.isRoutedToManager,
      managerUid: request.isRoutedToManager ? request.recipientUid : null,
      userData: {
        [uidA]: request.sender,
        [uidB]: request.targetTalent,
      },
      participants: {
        [uidA]: request.sender,
        [uidB]: request.targetTalent,
      },
    },
    { merge: true }
  );

  return { connectionId: canonicalConnectionId };
};

/**
 * Decline a contact request.
 */
export const declineContactRequest = async (requestId, reason = null) => {
  if (!requestId) throw new Error('Request ID required.');

  await updateDoc(doc(db, 'contact_requests', requestId), {
    status: REQUEST_STATUS.DECLINED,
    resolvedAt: new Date().toISOString(),
    declineReason: reason ? reason.trim() : null,
  });
};

/**
 * Cancel an outgoing contact request before it is accepted.
 */
export const cancelContactRequest = async (requestId) => {
  if (!requestId) throw new Error('Request ID required.');

  await updateDoc(doc(db, 'contact_requests', requestId), {
    status: REQUEST_STATUS.CANCELLED,
    resolvedAt: new Date().toISOString(),
  });
};

/**
 * Check if an active PENDING request exists between two users.
 */
export const getPendingRequestBetweenUsers = async (senderUid, targetUid) => {
  if (!senderUid || !targetUid) return null;

  try {
    const q = query(
      collection(db, 'contact_requests'),
      where('sender.uid', '==', senderUid),
      where('targetTalent.uid', '==', targetUid),
      where('status', '==', REQUEST_STATUS.PENDING)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (err) {
    console.warn('getPendingRequestBetweenUsers check:', err.message);
    return null;
  }
};
