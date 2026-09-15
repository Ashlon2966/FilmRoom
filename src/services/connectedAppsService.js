import { Linking, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const STORAGE_KEY = '@filmroom_connected_apps';

export const DEFAULT_CONNECTED_APPS = [
  {
    id: 'app_writerduet',
    name: 'WriterDuet',
    type: 'WEB',
    url: 'https://www.writerduet.com',
    deepLink: 'writerduet://',
    description: 'Real-time collaborative screenwriting',
    icon: '📝',
  },
  {
    id: 'app_highland',
    name: 'Highland 2',
    type: 'APP',
    url: 'https://quoteunquoteapps.com/highland-2/',
    deepLink: 'highland://',
    description: 'Screenwriting and plain text formatting',
    icon: '🏔',
  },
  {
    id: 'app_notion',
    name: 'Notion Film Bible',
    type: 'WEB',
    url: 'https://www.notion.so',
    deepLink: 'notion://',
    description: 'World-building & character bible database',
    icon: '📓',
  },
];

/**
 * Load user's configured connected apps
 */
export async function getConnectedApps(uid) {
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEY);
    if (local !== null) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    if (uid) {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().connectedApps) {
        const apps = snap.data().connectedApps;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
        return apps;
      }
    }
  } catch (err) {
    console.warn('[ConnectedApps] Failed to load connected apps:', err.message);
  }

  // Fallback to defaults
  return DEFAULT_CONNECTED_APPS;
}

/**
 * Save connected apps persistently
 */
export async function saveConnectedApps(uid, apps) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apps));

    if (uid) {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        connectedApps: apps,
        updatedAt: serverTimestamp(),
      }).catch((e) => console.warn('Could not sync connected apps to Firestore:', e.message));
    }
    return true;
  } catch (err) {
    console.warn('[ConnectedApps] Failed to save connected apps:', err.message);
    return false;
  }
}

/**
 * Add a new user-configured connected app or web link
 */
export async function addConnectedApp(uid, { name, url, deepLink, type = 'WEB', description = '' }) {
  if (!name || !name.trim()) {
    throw new Error('Please enter an application or website name.');
  }

  const cleanUrl = (url || '').trim();
  const cleanDeepLink = (deepLink || '').trim();

  if (!cleanUrl && !cleanDeepLink) {
    throw new Error('Please provide either a website URL or an app link scheme.');
  }

  const currentApps = await getConnectedApps(uid);
  const newApp = {
    id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    url: cleanUrl || null,
    deepLink: cleanDeepLink || null,
    type: cleanDeepLink ? 'APP' : 'WEB',
    description: description.trim() || (cleanUrl ? cleanUrl : cleanDeepLink),
    icon: cleanDeepLink ? '📱' : '🌐',
    createdAt: new Date().toISOString(),
  };

  const updated = [...currentApps, newApp];
  await saveConnectedApps(uid, updated);
  return newApp;
}

/**
 * Remove a connected app
 */
export async function removeConnectedApp(uid, appId) {
  const currentApps = await getConnectedApps(uid);
  const filtered = currentApps.filter((a) => a.id !== appId);
  await saveConnectedApps(uid, filtered);
  return filtered;
}

/**
 * Launch an app or website with deep link support and graceful fallback
 */
export async function launchConnectedApp(app) {
  if (!app) return;

  const targetDeepLink = app.deepLink?.trim();
  const targetUrl = app.url?.trim();

  // 1. Try launching deep link first if defined
  if (targetDeepLink) {
    try {
      const canOpen = await Linking.canOpenURL(targetDeepLink);
      if (canOpen) {
        await Linking.openURL(targetDeepLink);
        return { success: true, method: 'DEEP_LINK' };
      }
    } catch (e) {
      console.warn('Deep link error:', e.message);
    }
  }

  // 2. Fallback to website URL if available
  if (targetUrl) {
    try {
      let formattedUrl = targetUrl;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      await Linking.openURL(formattedUrl);
      return { success: true, method: 'WEB_URL' };
    } catch (err) {
      Alert.alert('Launch Error', `Could not open link: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  Alert.alert(
    'App Unavailable',
    `"${app.name}" could not be opened on this device. Please verify the application is installed or configure a web URL.`
  );
  return { success: false, error: 'App unavailable' };
}
