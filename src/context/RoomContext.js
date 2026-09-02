import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from './AuthContext';

const RoomContext = createContext({});

export const PRODUCTION_STAGES = [
  'Idea',
  'Screenplay',
  'Pre-Prod',
  'Production',
  'Post-Prod',
];

export const RoomProvider = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [roomLoading, setRoomLoading] = useState(false);

  // Synchronize active room details in real time across all member devices
  useEffect(() => {
    if (!activeRoomId) {
      setRoomData(null);
      return;
    }

    setRoomLoading(true);
    const roomRef = doc(db, 'rooms', activeRoomId);

    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setRoomData({ id: snapshot.id, ...snapshot.data() });
        } else {
          setRoomData(null);
        }
        setRoomLoading(false);
      },
      (error) => {
        console.error('Room sync error:', error);
        setRoomLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeRoomId]);

  // Create a new room with the creator assigned to their initial roles
  const createRoom = async (title, logline = '', genre = '') => {
    if (!currentUser) throw new Error('Authentication required.');

    const newRoomRef = await addDoc(collection(db, 'rooms'), {
      title: title.trim(),
      logline: logline.trim(),
      genre: genre.trim(),
      createdBy: currentUser.uid,
      creatorEmail: currentUser.email,
      stageIndex: 0, // Defaults to 'Idea'
      stageName: PRODUCTION_STAGES[0],
      members: {
        [currentUser.uid]: {
          email: currentUser.email,
          displayName: userProfile?.displayName || currentUser.email,
          roles: userProfile?.roles || ['Director'],
          joinedAt: new Date().toISOString(),
        },
      },
      memberUids: [currentUser.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setActiveRoomId(newRoomRef.id);
    return newRoomRef.id;
  };

  // Switch current active project room
  const switchRoom = (roomId) => {
    setActiveRoomId(roomId);
  };

  // Update room production stage (syncs to all room members immediately)
  const setProductionStage = async (stageIndex) => {
    if (!activeRoomId || stageIndex < 0 || stageIndex >= PRODUCTION_STAGES.length) return;

    const roomRef = doc(db, 'rooms', activeRoomId);
    await updateDoc(roomRef, {
      stageIndex: stageIndex,
      stageName: PRODUCTION_STAGES[stageIndex],
      updatedAt: serverTimestamp(),
    });
  };

  // Assign or update a collaborator's roles within the current active room
  const updateMemberRoles = async (targetUid, newRoles) => {
    if (!activeRoomId || !roomData) return;

    const roomRef = doc(db, 'rooms', activeRoomId);
    const updatedMembers = {
      ...roomData.members,
      [targetUid]: {
        ...roomData.members[targetUid],
        roles: newRoles,
      },
    };

    await updateDoc(roomRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <RoomContext.Provider
      value={{
        activeRoomId,
        roomData,
        roomLoading,
        createRoom,
        switchRoom,
        setProductionStage,
        updateMemberRoles,
        stages: PRODUCTION_STAGES,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => useContext(RoomContext);