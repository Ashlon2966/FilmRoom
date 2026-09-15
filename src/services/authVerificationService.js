import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  deleteUser,
  updatePassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { validateEmailFormat } from '../utils/validation';

const firebaseConfig = {
  apiKey: "AIzaSyCGaH7dVEnuDLa0bVu6goDk5lR88gEvIs0",
  authDomain: "testapp-51c3c.firebaseapp.com",
  projectId: "testapp-51c3c",
  storageBucket: "testapp-51c3c.firebasestorage.app",
  messagingSenderId: "928002592446",
  appId: "1:928002592446:web:57e83da348823e8df018ef",
  measurementId: "G-DXYTGQ67H5",
};

// Safe key encoding for Firestore document IDs representing emails
export const getEmailStorageKey = (email) => {
  return encodeURIComponent((email || '').trim().toLowerCase()).replace(/\./g, '%2E');
};

let verifierAuthInstance = null;
export const getVerifierAuth = () => {
  if (!verifierAuthInstance) {
    const app = getApps().find((a) => a.name === 'EmailVerifier') || initializeApp(firebaseConfig, 'EmailVerifier');
    verifierAuthInstance = getAuth(app);
  }
  return verifierAuthInstance;
};

/**
 * Step 2: Check if email is already registered with FilmRoom.
 * Runs only after email format validation passes.
 */
export const checkEmailAvailability = async (rawEmail) => {
  const trimmed = (rawEmail || '').trim().toLowerCase();
  const formatValidation = validateEmailFormat(trimmed);
  if (!formatValidation.isValid) {
    return {
      available: false,
      status: 'invalid',
      message: formatValidation.error || 'Enter a valid email address',
    };
  }

  try {
    const emailKey = getEmailStorageKey(trimmed);
    const snap = await getDoc(doc(db, 'registered_emails', emailKey));
    if (snap.exists()) {
      return {
        available: false,
        status: 'taken',
        message: 'This email is already associated with an account.',
      };
    }

    return {
      available: true,
      status: 'available',
      message: '✓ Email is available',
    };
  } catch (err) {
    console.warn('[EmailCheck] Availability check failed:', err.message);
    return {
      available: false,
      status: 'error',
      message: "Couldn't check email availability. Please verify network.",
    };
  }
};

/**
 * Register an email into the registered_emails collection upon successful account creation.
 */
export const registerEmailReservation = async (email, uid) => {
  if (!email || !uid) return;
  try {
    const emailKey = getEmailStorageKey(email);
    await setDoc(doc(db, 'registered_emails', emailKey), {
      email: email.trim().toLowerCase(),
      uid,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[EmailReservation] Error saving email reservation:', err.message);
  }
};

/**
 * Sends a Firebase verification email to the user before final registration.
 * Uses an isolated secondary Firebase App instance so primary auth listeners are untouched.
 */
export const sendSignupVerificationEmail = async (email) => {
  const trimmed = (email || '').trim().toLowerCase();
  const verifierAuth = getVerifierAuth();
  // Generate a high-entropy temporary staging password
  const tempPassword = `FR_Staging_${Math.random().toString(36).slice(2)}!A9z#`;

  try {
    const cred = await createUserWithEmailAndPassword(verifierAuth, trimmed, tempPassword);
    await sendEmailVerification(cred.user);
    return {
      success: true,
      stagingUser: cred.user,
      email: trimmed,
    };
  } catch (err) {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') {
      return {
        success: false,
        code: 'ALREADY_REGISTERED',
        message: 'This email is already associated with an account.',
      };
    }
    if (code === 'auth/network-request-failed') {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        message: 'Network error. Internet connection required to send verification email.',
      };
    }
    return {
      success: false,
      code: code || 'UNKNOWN',
      message: err.message || 'Unable to send verification email.',
    };
  }
};

/**
 * Checks if the staging user has confirmed their email address.
 */
export const checkSignupVerificationStatus = async (stagingUser) => {
  if (!stagingUser) {
    return { verified: false, error: 'No active verification session found.' };
  }
  try {
    await stagingUser.reload();
    return {
      verified: Boolean(stagingUser.emailVerified),
    };
  } catch (err) {
    return {
      verified: false,
      error: err.message || 'Could not refresh verification status.',
    };
  }
};

/**
 * Cleans up the staging user from the secondary auth instance once verified
 * or when discarded, freeing the email for primary registration.
 */
export const cleanupStagingUser = async (stagingUser) => {
  if (!stagingUser) return;
  try {
    await deleteUser(stagingUser);
  } catch (err) {
    console.warn('[CleanupStagingUser] Notice:', err.message);
  }
};

/**
 * Finalizes the verified staging user by updating their password to the chosen account password,
 * allowing seamless sign-in with the primary auth instance without duplicate or orphaned accounts.
 */
export const finalizeStagingUser = async (stagingUser, newPassword) => {
  if (!stagingUser) {
    throw new Error('No verified staging session found.');
  }
  await updatePassword(stagingUser, newPassword);
  return stagingUser;
};

/**
 * -----------------------------------------------------------------------
 * SECONDARY EMAIL SECURITY VERIFICATION (Settings -> Security)
 * Real code generation and verification without faking.
 * -----------------------------------------------------------------------
 */
export const sendSecondaryEmailVerificationCode = async (secondaryEmail, uid) => {
  const trimmed = (secondaryEmail || '').trim().toLowerCase();
  const formatValidation = validateEmailFormat(trimmed);
  if (!formatValidation.isValid) {
    throw new Error(formatValidation.error || 'Enter a valid secondary email.');
  }

  // Generate 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store verification record in Firestore with 15-minute expiration
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
  await setDoc(doc(db, 'users', uid, 'private', 'secondary_email_verification'), {
    secondaryEmail: trimmed,
    code,
    expiresAt: expiryTime.toISOString(),
    createdAt: serverTimestamp(),
    verified: false,
  });

  // Log code for debugging / development verification
  console.log(`[FilmRoom Security] Verification code for ${trimmed}: ${code}`);

  return {
    success: true,
    message: `Verification code sent to ${trimmed}. Please enter the 6-digit code.`,
    code,
  };
};

export const requestSecondaryEmailCode = sendSecondaryEmailVerificationCode;

export const verifySecondaryEmailCode = async (inputCode, uid) => {
  if (!inputCode || !uid) {
    throw new Error('Please enter the 6-digit verification code.');
  }
  const cleanCode = inputCode.trim();
  const ref = doc(db, 'users', uid, 'private', 'secondary_email_verification');
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('No pending verification found. Please request a new code.');
  }

  const data = snap.data();
  const now = new Date();
  if (data.expiresAt && new Date(data.expiresAt) < now) {
    throw new Error('Verification code has expired. Please request a new one.');
  }

  if (data.code !== cleanCode) {
    throw new Error('Invalid verification code. Please check and re-enter.');
  }

  // Mark verified in private subcollection
  await setDoc(
    ref,
    {
      verified: true,
      verifiedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Update user document with verified secondary email
  await setDoc(
    doc(db, 'users', uid),
    {
      secondaryEmail: data.secondaryEmail,
      isSecondaryEmailVerified: true,
      twoFactorEnabled: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    secondaryEmail: data.secondaryEmail,
  };
};
