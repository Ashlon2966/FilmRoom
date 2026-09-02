import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Fetch all takes for an active room
export const getRoomTakes = async (roomId) => {
  const takesRef = collection(db, 'rooms', roomId, 'takes');
  const snapshot = await getDocs(takesRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Add call sheet entry
export const createCallSheet = async (roomId, callSheetData) => {
  const ref = collection(db, 'rooms', roomId, 'callsheets');
  return await addDoc(ref, {
    ...callSheetData,
    createdAt: serverTimestamp(),
  });
};

// Log sound department roll
export const logSoundTrack = async (roomId, soundData) => {
  const ref = collection(db, 'rooms', roomId, 'sound_logs');
  return await addDoc(ref, {
    ...soundData,
    createdAt: serverTimestamp(),
  });
};