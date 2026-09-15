import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { validateUsernameFormat } from '../utils/validation';

/**
 * Generates a human-facing FilmRoom ID (exactly 10 characters, e.g. FR7K2P91XA) based on UID.
 * Never exposes raw Firebase UID as the human-facing identifier.
 * Stable, deterministic, unique, and strictly 10 characters.
 */
export const generateFilmRoomId = (uid) => {
  if (!uid) return 'FR7K2P91XA';
  const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  for (let i = 0; i < uid.length; i++) {
    const code = uid.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ (code + i), 1099511628);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 15)) >>> 0;

  let result = 'FR';
  let val1 = h1;
  let val2 = h2;
  for (let i = 0; i < 4; i++) {
    result += CHARS[val1 % CHARS.length];
    val1 = Math.floor(val1 / CHARS.length);
  }
  for (let i = 0; i < 4; i++) {
    result += CHARS[val2 % CHARS.length];
    val2 = Math.floor(val2 / CHARS.length);
  }
  return result;
};

/**
 * Searches for a user document by 10-character FilmRoom Code.
 * @param {string} code - Exactly 10-character FilmRoom code (e.g. FR7K2P91XA)
 * @returns {Promise<Object|null>} User data object or null
 */
export const findUserByFilmRoomCode = async (code) => {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length !== 10) return null;

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('filmRoomId', '==', cleanCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
  } catch (err) {
    console.warn('findUserByFilmRoomCode notice:', err.message);
  }
  return null;
};

/**
 * Checks username availability against /usernames collection with format pre-validation,
 * structured status reporting, and development-only diagnostics.
 *
 * @param {string} rawUsername
 * @returns {Promise<{ available: boolean, status: 'available'|'taken'|'invalid'|'error', message: string, normalized: string }>}
 */
export const checkUsernameAvailability = async (rawUsername) => {
  // 1. Format validation locally — no Firestore query if invalid
  const validation = validateUsernameFormat(rawUsername);
  if (!validation.isValid) {
    return {
      available: false,
      status: 'invalid',
      message: validation.error || 'Invalid username format.',
      normalized: validation.normalized,
    };
  }

  const usernameLower = validation.normalized;

  try {
    const userDocRef = doc(db, 'usernames', usernameLower);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return {
        available: false,
        status: 'taken',
        message: '✕ Username already taken',
        normalized: usernameLower,
      };
    }

    return {
      available: true,
      status: 'available',
      message: '✓ Username available',
      normalized: usernameLower,
    };
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[UsernameCheck] Firestore availability check failed:', err.message, err.code || '');
    }
    return {
      available: false,
      status: 'error',
      message: "Couldn't check username availability. Please try again.",
      normalized: usernameLower,
    };
  }
};

/**
 * Legacy boolean helper wrapping checkUsernameAvailability for backward compatibility.
 */
export const checkUsernameAvailable = async (username) => {
  const res = await checkUsernameAvailability(username);
  if (res.status === 'error') {
    throw new Error(res.message);
  }
  return res.available;
};

/**
 * Atomically updates a user's username, updating both /users/{uid} and reserving /usernames.
 * Releases the previous username reservation if changing to a new handle.
 */
export const updateUserUsername = async ({ uid, oldUsername, newUsername }) => {
  if (!uid) throw new Error('User ID required.');

  const validation = validateUsernameFormat(newUsername);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const newLower = validation.normalized;
  const oldLower = (oldUsername || '').trim().toLowerCase().replace(/^@+/, '');

  if (newLower === oldLower) {
    // Only capitalization changed
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid), {
      username: newUsername.trim().replace(/^@+/, ''),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'usernames', newLower), {
      username: newUsername.trim().replace(/^@+/, ''),
    });
    await batch.commit();
    return { success: true, username: newUsername.trim().replace(/^@+/, '') };
  }

  // Check if new username is available
  const availability = await checkUsernameAvailability(newUsername);
  if (!availability.available) {
    throw new Error(availability.message || 'Selected username is not available.');
  }

  const batch = writeBatch(db);
  // Reserve new username
  batch.set(doc(db, 'usernames', newLower), {
    uid,
    username: newUsername.trim().replace(/^@+/, ''),
    createdAt: serverTimestamp(),
  });

  // Release old reservation if existed
  if (oldLower) {
    batch.delete(doc(db, 'usernames', oldLower));
  }

  // Update user profile document
  batch.update(doc(db, 'users', uid), {
    username: newUsername.trim().replace(/^@+/, ''),
    usernameLower: newLower,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return { success: true, username: newUsername.trim().replace(/^@+/, '') };
};

/**
 * Atomically reserves a username in /usernames and creates the base user profile in /users.
 */
export const reserveUsernameAndCreateUser = async ({
  user,
  fullName,
  username,
  email,
}) => {
  const cleanUsername = username.trim().replace('@', '');
  const usernameLower = cleanUsername.toLowerCase();
  const filmRoomId = generateFilmRoomId(user.uid);

  const batch = writeBatch(db);

  // 1. Initial user document in /users
  const userRef = doc(db, 'users', user.uid);
  batch.set(userRef, {
    uid: user.uid,
    filmRoomId,
    fullName: fullName.trim(),
    displayName: fullName.trim(),
    username: cleanUsername,
    usernameLower,
    email: email.trim(),
    bio: '',
    photoURL: null,
    roles: [],
    primaryRole: null,
    secondaryRoles: [],
    location: '',
    country: '',
    stateRegion: '',
    gender: null,
    phone: '',
    phoneCountryCode: '+1',
    isPhonePublic: false,
    isEmailPublic: false,
    isLocationPublic: true,
    discoverability: 'PUBLIC', // 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN'
    blockedUsers: [],
    blockedUids: [],
    isOnboarded: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Reservation document in /usernames
  const usernameRef = doc(db, 'usernames', usernameLower);
  batch.set(usernameRef, {
    uid: user.uid,
    username: cleanUsername,
    createdAt: serverTimestamp(),
  });

  // 3. Reservation document in /registered_emails for availability check
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const emailKey = encodeURIComponent(cleanEmail).replace(/\./g, '%2E');
    const emailRef = doc(db, 'registered_emails', emailKey);
    batch.set(emailRef, {
      uid: user.uid,
      email: cleanEmail,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return { uid: user.uid, filmRoomId, username: cleanUsername };
};

/**
 * Searches for a user document by exact username match (case-insensitive search key).
 * @param {string} username - Target username without '@'
 * @returns {Promise<Object|null>} User data object or null
 */
export const findUserByUsername = async (username) => {
  const cleanUsername = (username || '').trim().toLowerCase().replace('@', '');
  if (!cleanUsername) return null;

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('usernameLower', '==', cleanUsername));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
  } catch (err) {
    console.warn('findUserByUsername notice:', err.message);
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

/**
 * Saves a structured search criteria set to a user's saved_searches subcollection.
 */
export const saveSearchCriteria = async (userId, title, criteria) => {
  if (!userId || !title) throw new Error('Missing required user or search title.');
  const colRef = collection(db, 'users', userId, 'saved_searches');
  return await addDoc(colRef, {
    title: title.trim(),
    criteria: criteria || {},
    createdAt: serverTimestamp(),
  });
};

/**
 * Streams saved searches for a given user.
 */
export const streamSavedSearches = (userId, onData) => {
  if (!userId) return () => {};
  const colRef = collection(db, 'users', userId, 'saved_searches');
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort in-memory to prevent composite index requirement on Firestore Spark
      list.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      onData(list);
    },
    (err) => {
      console.warn('streamSavedSearches notice:', err.message);
    }
  );
};

/**
 * Deletes a saved search document.
 */
export const deleteSavedSearch = async (userId, searchId) => {
  if (!userId || !searchId) return;
  const docRef = doc(db, 'users', userId, 'saved_searches', searchId);
  return await deleteDoc(docRef);
};