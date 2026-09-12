/**
 * FilmRoom Private Shortlist & Talent Saving Service
 * 
 * Allows Directors, Producers, and Casting Directors to privately organize
 * and curate talent for projects without exposing public metrics or rankings.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * Create a new private shortlist.
 */
export const createShortlist = async (uid, { name, projectId = null }) => {
  if (!uid) throw new Error('User ID required.');
  if (!name?.trim()) throw new Error('Shortlist name required.');

  const shortlistsRef = collection(db, 'users', uid, 'shortlists');
  const docRef = await addDoc(shortlistsRef, {
    name: name.trim(),
    projectId: projectId || null,
    talentList: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { id: docRef.id, name: name.trim(), projectId, talentList: [] };
};

/**
 * Stream all shortlists owned by the user.
 */
export const streamShortlists = (uid, callback) => {
  if (!uid) return () => {};

  const shortlistsRef = collection(db, 'users', uid, 'shortlists');

  return onSnapshot(
    shortlistsRef,
    (snapshot) => {
      const lists = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      lists.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      callback(lists);
    },
    (err) => {
      console.warn('streamShortlists error:', err.message);
      callback([]);
    }
  );
};

/**
 * Add a talent to a specific shortlist.
 */
export const addTalentToShortlist = async (uid, shortlistId, talent, note = '') => {
  if (!uid || !shortlistId || !talent?.id) {
    throw new Error('User ID, Shortlist ID, and Talent required.');
  }

  const shortlistRef = doc(db, 'users', uid, 'shortlists', shortlistId);

  // Fetch current shortlist to ensure no duplicate in the list
  const snapshot = await getDocs(collection(db, 'users', uid, 'shortlists'));
  const targetDoc = snapshot.docs.find((d) => d.id === shortlistId);

  if (!targetDoc) throw new Error('Shortlist not found.');

  const currentList = targetDoc.data().talentList || [];
  const exists = currentList.some((t) => t.uid === talent.id);

  if (exists) {
    return; // Already added
  }

  const talentEntry = {
    uid: talent.id,
    name: talent.name || talent.fullName || 'Filmmaker',
    username: talent.username || 'crew',
    role: talent.role || 'Filmmaker',
    photoURL: talent.avatar || talent.photoURL || null,
    location: talent.location || null,
    unionStatus: talent.unionStatus || 'Non-Union',
    note: note.trim() || null,
    addedAt: new Date().toISOString(),
  };

  await updateDoc(shortlistRef, {
    talentList: [...currentList, talentEntry],
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Remove a talent from a specific shortlist.
 */
export const removeTalentFromShortlist = async (uid, shortlistId, talentUid) => {
  if (!uid || !shortlistId || !talentUid) return;

  const shortlistRef = doc(db, 'users', uid, 'shortlists', shortlistId);
  const snapshot = await getDocs(collection(db, 'users', uid, 'shortlists'));
  const targetDoc = snapshot.docs.find((d) => d.id === shortlistId);

  if (!targetDoc) return;

  const currentList = targetDoc.data().talentList || [];
  const filteredList = currentList.filter((t) => t.uid !== talentUid);

  await updateDoc(shortlistRef, {
    talentList: filteredList,
    updatedAt: new Date().toISOString(),
  });
};

/**
 * Delete an entire shortlist.
 */
export const deleteShortlist = async (uid, shortlistId) => {
  if (!uid || !shortlistId) return;
  const shortlistRef = doc(db, 'users', uid, 'shortlists', shortlistId);
  await deleteDoc(shortlistRef);
};
