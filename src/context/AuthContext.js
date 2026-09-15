import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { generateFilmRoomId } from '../services/userService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;
    let fallbackTimer = null;

    // Listen for authentication changes (login/logout/token refresh)
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous profile listener immediately on any auth transition
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      setCurrentUser(user);

      if (user) {
        let isHandled = false;
        // Stream user profile data from Firestore in real time
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            isHandled = true;
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (!data.filmRoomId) {
                const stableCode = generateFilmRoomId(user.uid);
                updateDoc(userRef, { filmRoomId: stableCode }).catch((err) =>
                  console.warn('Could not backfill filmRoomId:', err.message)
                );
                data.filmRoomId = stableCode;
              }
              setUserProfile(data);
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            isHandled = true;
            console.warn('User profile onSnapshot error (possibly offline):', err.message);
            setLoading(false);
          }
        );

        // Fallback safety timeout if offline or network slow
        fallbackTimer = setTimeout(() => {
          if (!isHandled) {
            setLoading(false);
          }
        }, 3500);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (fallbackTimer) clearTimeout(fallbackTimer);
      unsubscribeAuth();
    };
  }, []);

  // Register user and seed the base user document in Firestore
  const signup = async (email, password, fullName = '', username = '') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const cleanUsername = username.trim().replace('@', '') || `filmmaker_${cred.user.uid.slice(0, 5)}`;
    const filmRoomId = generateFilmRoomId(cred.user.uid);
    await setDoc(userDocRef, {
      uid: cred.user.uid,
      filmRoomId,
      email: cred.user.email,
      fullName: fullName.trim() || '',
      displayName: fullName.trim() || '',
      username: cleanUsername,
      usernameLower: cleanUsername.toLowerCase(),
      bio: '',
      photoURL: null,
      roles: [],
      isOnboarded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return cred.user;
  };

  // Login existing user
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Log out current user
  const logout = () => {
    return signOut(auth);
  };

  // Send password reset email
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signup,
        login,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);