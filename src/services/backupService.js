import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Alert } from 'react-native';
import { cacheRoom, cacheCrewCall } from './localDatabaseService';

export const CURRENT_BACKUP_VERSION = '2.0';

/**
 * Full FilmRoom Backup Export
 * Exports user profile, participating rooms, owned crew calls, shortlists, and media references.
 * Large media binaries are NOT stored; Cloudinary URLs and metadata are preserved.
 * Passwords, auth tokens, and external secrets are strictly excluded.
 */
export async function exportFullFilmRoomBackup(userId) {
  if (!userId) {
    Alert.alert('Backup Error', 'User ID is missing. Please sign in first.');
    return;
  }

  try {
    // 1. User profile
    let userData = {};
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        userData = userSnap.data();
      }
    } catch (profErr) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Backup: Profile fetch warning:', profErr.message);
      }
    }
    // Clean sensitive auth/private fields if any
    delete userData.token;
    delete userData.auth;

    // 2. Production Rooms
    let roomsData = [];
    try {
      const roomsSnap = await getDocs(
        query(collection(db, 'rooms'), where('memberUids', 'array-contains', userId))
      );
      roomsData = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (roomErr) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Backup: Rooms fetch warning:', roomErr.message);
      }
    }

    // 3. User's Published Crew Calls
    let callsData = [];
    try {
      const callsSnap = await getDocs(
        query(collection(db, 'production_calls'), where('createdBy', '==', userId))
      );
      callsData = callsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (callErr) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Backup: Production calls fetch warning:', callErr.message);
      }
    }

    // 4. Shortlists (fetch from user subcollection first, fallback to root)
    let shortlistsData = [];
    try {
      const subShortlistsSnap = await getDocs(collection(db, 'users', userId, 'shortlists'));
      if (!subShortlistsSnap.empty) {
        shortlistsData = subShortlistsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        const rootShortlistsSnap = await getDocs(
          query(collection(db, 'shortlists'), where('ownerId', '==', userId))
        );
        shortlistsData = rootShortlistsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (shortErr) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Backup: Shortlists fetch warning:', shortErr.message);
      }
    }

    // 5. User's Authorized Contact Requests
    let requestsData = [];
    try {
      const outgoingSnap = await getDocs(
        query(collection(db, 'contact_requests'), where('senderUid', '==', userId))
      );
      const incomingSnap = await getDocs(
        query(collection(db, 'contact_requests'), where('recipientUid', '==', userId))
      );
      const seen = new Set();
      [...outgoingSnap.docs, ...incomingSnap.docs].forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          requestsData.push({ id: d.id, ...d.data() });
        }
      });
    } catch (reqErr) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Backup: Contact requests fetch warning:', reqErr.message);
      }
    }

    // 6. User's Authorized Connections
    let connectionsData = [];
    try {
      const connsSnap = await getDocs(
        query(collection(db, 'connections'), where('users', 'array-contains', userId))
      );
      connectionsData = connsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (connErr) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Backup: Connections fetch warning:', connErr.message);
      }
    }

    const fileName = `filmroom_full_backup_${Date.now()}.json`;
    const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

    const backupPayload = {
      filmroomBackupVersion: CURRENT_BACKUP_VERSION,
      packageType: 'FULL_BACKUP',
      exportedAt: new Date().toISOString(),
      userId,
      fileName,
      profile: userData,
      rooms: roomsData,
      crewCalls: callsData,
      shortlists: shortlistsData,
      contactRequests: requestsData,
      connections: connectionsData,
      mediaReferences: {
        profilePhoto: userData.photoURL || null,
        roomPosters: roomsData.map((r) => ({ roomId: r.id, posterUrl: r.posterUrl })).filter((r) => r.posterUrl),
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    await FileSystem.writeAsStringAsync(destinationUri, jsonString, { encoding: 'utf8' });

    const isShareAvailable = await Sharing.isAvailableAsync();
    if (isShareAvailable) {
      await Sharing.shareAsync(destinationUri, {
        mimeType: 'application/json',
        dialogTitle: `Save ${fileName} to Drive, Files or Cloud`,
      });
    }
    return { uri: destinationUri, fileName, recordCount: roomsData.length + callsData.length + shortlistsData.length };
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('Full backup error:', err);
    }
    throw new Error("Couldn't create the full backup. Please try again.");
  }
}

/**
 * Project Package Export (.filmroom / .json)
 * Exports a single production room, team roles, stages, call sheets, and slate metadata.
 * Strips private phone numbers and emails for safe sharing.
 */
export async function exportProjectPackage(roomId) {
  if (!roomId) {
    Alert.alert('Error', 'Room ID is required to export project package.');
    return;
  }

  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (!roomSnap.exists()) {
      Alert.alert('Error', 'Production Room not found in Firestore.');
      return;
    }

    const room = roomSnap.data();

    // Sanitize team members: remove private email and phone numbers
    const sanitizedMembers = {};
    if (room.members) {
      Object.entries(room.members).forEach(([uid, m]) => {
        sanitizedMembers[uid] = {
          name: m.name || m.fullName || 'Crew Member',
          username: m.username || 'filmmaker',
          productionRole: m.productionRole || m.roles?.[0] || 'Crew',
          roomAccess: m.roomAccess || 'Crew',
          photoURL: m.photoURL || null,
        };
      });
    }

    const projectPackage = {
      filmroomBackupVersion: CURRENT_BACKUP_VERSION,
      packageType: 'PROJECT_PACKAGE',
      exportedAt: new Date().toISOString(),
      room: {
        id: roomId,
        title: room.title || 'Untitled Production',
        projectType: room.projectType || 'Film',
        logline: room.logline || null,
        synopsis: room.synopsis || null,
        shootStartDate: room.shootStartDate || null,
        shootEndDate: room.shootEndDate || null,
        location: room.location || null,
        budgetTier: room.budgetTier || null,
        posterUrl: room.posterUrl || null,
        currentStage: room.currentStage || 0,
        stage1: room.stage1 || null,
        members: sanitizedMembers,
      },
    };

    const cleanTitle = (room.title || 'project').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${cleanTitle}_package_${Date.now()}.json`;
    const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(destinationUri, JSON.stringify(projectPackage, null, 2), {
      encoding: 'utf8',
    });

    const isShareAvailable = await Sharing.isAvailableAsync();
    if (isShareAvailable) {
      await Sharing.shareAsync(destinationUri, {
        mimeType: 'application/json',
        dialogTitle: `Share ${room.title} Project Package`,
      });
    } else {
      Alert.alert('✓ Project Exported', `Saved locally as ${fileName}`);
    }
  } catch (err) {
    Alert.alert('Export Failed', err.message);
  }
}

/**
 * Validates an imported FilmRoom backup file and computes a preview.
 */
export async function validateBackupFile(fileUri) {
  try {
    const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
    const parsed = JSON.parse(fileContent);

    const version = parsed.filmroomBackupVersion || parsed.version || '1.0';
    const packageType = parsed.packageType || (parsed.rooms ? 'FULL_BACKUP' : parsed.room ? 'PROJECT_PACKAGE' : 'LEGACY_PROFILE');

    let projectsCount = 0;
    let peopleCount = 0;
    let callsCount = 0;
    let documentsCount = 0;
    let mediaRefsCount = 0;
    const conflicts = [];

    if (packageType === 'FULL_BACKUP') {
      const rooms = parsed.rooms || [];
      projectsCount = rooms.length;
      callsCount = (parsed.crewCalls || []).length;
      rooms.forEach((r) => {
        peopleCount += Object.keys(r.members || {}).length;
        if (r.stage1?.scriptFile) documentsCount++;
        if (r.posterUrl) mediaRefsCount++;
      });
      if (parsed.profile?.photoURL) mediaRefsCount++;
    } else if (packageType === 'PROJECT_PACKAGE') {
      projectsCount = 1;
      peopleCount = Object.keys(parsed.room?.members || {}).length;
      if (parsed.room?.stage1?.scriptFile) documentsCount++;
      if (parsed.room?.posterUrl) mediaRefsCount++;
    } else if (packageType === 'LEGACY_PROFILE') {
      if (parsed.data?.fullName) peopleCount = 1;
      if (parsed.data?.posters?.length) mediaRefsCount += parsed.data.posters.length;
    }

    return {
      isValid: true,
      version,
      packageType,
      counts: {
        projects: projectsCount,
        people: peopleCount,
        crewCalls: callsCount,
        documents: documentsCount,
        mediaRefs: mediaRefsCount,
      },
      conflicts,
      parsedData: parsed,
    };
  } catch (err) {
    return {
      isValid: false,
      error: err.message || 'Invalid or unreadable FilmRoom backup file.',
    };
  }
}

/**
 * Executes import of validated data with conflict handling.
 */
export async function executeImport({ parsedData, conflictResolutions = {}, userId }) {
  if (!parsedData || !userId) return;

  const packageType = parsedData.packageType || (parsedData.rooms ? 'FULL_BACKUP' : parsedData.room ? 'PROJECT_PACKAGE' : 'LEGACY_PROFILE');

  if (packageType === 'FULL_BACKUP') {
    // 1. Restore rooms
    for (const r of parsedData.rooms || []) {
      const roomId = r.id;
      if (conflictResolutions[roomId] === 'SKIP') continue;

      await setDoc(doc(db, 'rooms', roomId), {
        ...r,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await cacheRoom(r);
    }

    // 2. Restore crew calls
    for (const c of parsedData.crewCalls || []) {
      const callId = c.id;
      if (conflictResolutions[callId] === 'SKIP') continue;

      await setDoc(doc(db, 'production_calls', callId), {
        ...c,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await cacheCrewCall(c);
    }

    // 3. Restore profile if present
    if (parsedData.profile && Object.keys(parsedData.profile).length > 0) {
      await updateDoc(doc(db, 'users', userId), {
        ...parsedData.profile,
        updatedAt: serverTimestamp(),
      });
    }
  } else if (packageType === 'PROJECT_PACKAGE' && parsedData.room) {
    const room = parsedData.room;
    await setDoc(doc(db, 'rooms', room.id), {
      ...room,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await cacheRoom(room);
  } else if (packageType === 'LEGACY_PROFILE' && parsedData.data) {
    await updateDoc(doc(db, 'users', userId), {
      ...parsedData.data,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Restores user's current cloud records from Firestore into the local SQLite database.
 */
export async function restoreCloudDataToLocal(userId) {
  if (!userId) return 0;

  const roomsSnap = await getDocs(
    query(collection(db, 'rooms'), where('memberUids', 'array-contains', userId))
  );
  let count = 0;
  for (const docSnap of roomsSnap.docs) {
    await cacheRoom({ id: docSnap.id, ...docSnap.data() });
    count++;
  }

  const callsSnap = await getDocs(
    query(collection(db, 'production_calls'), where('createdBy', '==', userId))
  );
  for (const docSnap of callsSnap.docs) {
    await cacheCrewCall({ id: docSnap.id, ...docSnap.data() });
    count++;
  }

  return count;
}