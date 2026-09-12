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
import { sendNotification, NOTIFICATION_TYPES } from './notificationService';

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

  const participants = Array.from(
    new Set([sender.uid, recipientUid, targetTalent.uid].filter(Boolean))
  );

  const requestData = {
    type: type || REQUEST_TYPES.HIRING_TO_TALENT,
    senderUid: sender.uid,
    recipientUid,
    targetTalentUid: targetTalent.uid,
    participants,
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

  // Dispatch In-App Notification to recipient
  sendNotification({
    recipientUid,
    senderUid: sender.uid,
    senderName: sender.name || sender.fullName || 'A filmmaker',
    senderPhotoURL: sender.photoURL || null,
    type: type === REQUEST_TYPES.TALENT_TO_HIRING ? NOTIFICATION_TYPES.REEL_SUBMITTED : NOTIFICATION_TYPES.CONTACT_REQUEST,
    title: type === REQUEST_TYPES.TALENT_TO_HIRING ? 'New Reel / Craft Submission' : 'New Collaboration Request',
    message: `${sender.name || sender.fullName || 'A filmmaker'} sent you a ${type === REQUEST_TYPES.TALENT_TO_HIRING ? 'reel submission' : 'contact request'}.`,
    targetId: docRef.id,
    targetType: 'CONTACT_REQUEST',
  });

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

  // Query using top-level senderUid (compatible with security rules)
  const q = query(
    collection(db, 'contact_requests'),
    where('senderUid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      let requests = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Sort descending by creation date
      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(requests);
    },
    (err) => {
      console.warn('streamOutgoingRequests senderUid query error, falling back to nested sender.uid:', err.message);
      // Fallback for legacy requests created before senderUid was indexed
      try {
        const fallbackQ = query(
          collection(db, 'contact_requests'),
          where('sender.uid', '==', uid)
        );
        return onSnapshot(
          fallbackQ,
          (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            callback(list);
          },
          (fErr) => {
            console.warn('streamOutgoingRequests fallback error:', fErr.message);
            callback([]);
          }
        );
      } catch {
        callback([]);
      }
    }
  );
};

/**
 * Accept a contact request and establish a mutual professional connection.
 */
export const acceptContactRequest = async (request) => {
  if (!request?.id) throw new Error('Valid request object required.');

  const uidA = request.sender?.uid || request.senderUid;
  const uidB = request.targetTalent?.uid || request.targetTalentUid;
  const managerUid = request.isRoutedToManager ? request.recipientUid : null;
  
  // Ensure all authorized participants (including manager if routed) are in the users array
  const users = Array.from(new Set([uidA, uidB, managerUid].filter(Boolean)));
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
      users,
      uids: [uidA < uidB ? uidA : uidB, uidA < uidB ? uidB : uidA],
      status: 'ACCEPTED',
      initiatorId: uidA,
      initiatorUid: uidA,
      recipientId: request.recipientUid,
      recipientUid: request.recipientUid,
      talentUid: uidB,
      fromRequestId: request.id,
      connectedAt: now,
      isManagerRouted: !!request.isRoutedToManager,
      managerUid,
      userData: {
        [uidA]: request.sender,
        [uidB]: request.targetTalent,
        ...(managerUid ? { [managerUid]: { fullName: request.managerName || 'Manager', role: 'Talent Manager' } } : {}),
      },
      participants: {
        [uidA]: request.sender,
        [uidB]: request.targetTalent,
        ...(managerUid ? { [managerUid]: { fullName: request.managerName || 'Manager', role: 'Talent Manager' } } : {}),
      },
    },
    { merge: true }
  );

  // Dispatch In-App Notification to original requester (uidA)
  sendNotification({
    recipientUid: uidA,
    senderUid: request.recipientUid,
    senderName: request.targetTalent?.name || 'Filmmaker',
    senderPhotoURL: request.targetTalent?.photoURL || null,
    type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
    title: 'Connection Accepted',
    message: `${request.targetTalent?.name || 'A filmmaker'} accepted your contact request! You are now connected.`,
    targetId: canonicalConnectionId,
    targetType: 'CONNECTION',
  });

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
 * Toggle saved status on a contact request.
 */
export const toggleSaveContactRequest = async (requestId, isCurrentlySaved) => {
  if (!requestId) throw new Error('Request ID required.');

  await updateDoc(doc(db, 'contact_requests', requestId), {
    isSaved: !isCurrentlySaved,
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
      where('senderUid', '==', senderUid),
      where('targetTalentUid', '==', targetUid),
      where('status', '==', REQUEST_STATUS.PENDING)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    }

    // Fallback check on nested fields for legacy docs
    const legacyQ = query(
      collection(db, 'contact_requests'),
      where('sender.uid', '==', senderUid),
      where('targetTalent.uid', '==', targetUid),
      where('status', '==', REQUEST_STATUS.PENDING)
    );
    const legacySnap = await getDocs(legacyQ);
    if (!legacySnap.empty) {
      const d = legacySnap.docs[0];
      return { id: d.id, ...d.data() };
    }

    return null;
  } catch (err) {
    console.warn('getPendingRequestBetweenUsers check:', err.message);
    return null;
  }
};
