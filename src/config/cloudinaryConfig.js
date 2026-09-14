/**
 * FilmRoom Cloudinary Client-Side Configuration
 * 
 * SECURITY RULES:
 * 1. NEVER include Cloudinary API secret here or anywhere in client-side code.
 * 2. Uses unsigned upload presets strictly configured for FilmRoom media uploads.
 * 3. Client-side size & type limits protect Cloudinary free tier allowances.
 * 4. Fake/example placeholders (filmroom_media, etc.) are NEVER treated as real credentials.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLOUDINARY_STORAGE_KEY = '@filmroom_cloudinary_config';

// List of known dummy/placeholder strings that must never be treated as valid credentials
const PLACEHOLDER_PATTERNS = [
  'filmroom_media',
  'your_cloud_name',
  'your-cloud-name',
  'your_upload_preset',
  'your-upload-preset',
  'your_cloudinary_name',
  'cloud_name',
  'upload_preset',
  'demo',
  'sample',
  'example',
];

/**
 * Checks whether a given string is empty or strictly matches a known dummy placeholder.
 */
export const isPlaceholderValue = (value) => {
  if (!value || typeof value !== 'string') return true;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => trimmed === pattern);
};

// Active in-memory settings (never defaulted to fake placeholders)
export const CLOUDINARY_CONFIG = {
  // Public cloud name (safe to expose client-side)
  cloudName: null,

  // Unsigned upload preset created in Cloudinary Console (Settings -> Upload -> Upload presets)
  uploadPreset: null,

  // Free-tier protection thresholds (in bytes)
  limits: {
    maxImageBytes: 10 * 1024 * 1024,      // 10 MB max image size
    maxVideoBytes: 50 * 1024 * 1024,      // 50 MB max video size (free tier safety)
    maxDocumentBytes: 15 * 1024 * 1024,   // 15 MB max document size
  },

  // Allowed file extensions
  supportedImageTypes: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'],
  supportedVideoTypes: ['mp4', 'mov', 'webm', 'm4v', 'avi'],
  supportedDocTypes: ['pdf', 'txt', 'fountain', 'doc', 'docx'],
};

/**
 * Resolves Cloudinary configuration following strict priority:
 * 1. Valid user configuration stored in AsyncStorage (@filmroom_cloudinary_config)
 * 2. Valid environment variables: EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME & EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 * 3. Unconfigured (configured: false)
 */
export const resolveCloudinaryConfig = () => {
  let result = null;

  // 1. Check in-memory / local override first
  if (
    CLOUDINARY_CONFIG.cloudName &&
    !isPlaceholderValue(CLOUDINARY_CONFIG.cloudName) &&
    CLOUDINARY_CONFIG.uploadPreset &&
    !isPlaceholderValue(CLOUDINARY_CONFIG.uploadPreset)
  ) {
    result = {
      configured: true,
      cloudName: CLOUDINARY_CONFIG.cloudName,
      uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
      source: CLOUDINARY_CONFIG._source || 'local',
    };
  } else {
    // 2. Check environment variables
    const envCloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const envPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (
      envCloud &&
      !isPlaceholderValue(envCloud) &&
      envPreset &&
      !isPlaceholderValue(envPreset)
    ) {
      result = {
        configured: true,
        cloudName: envCloud.trim(),
        uploadPreset: envPreset.trim(),
        source: 'env',
      };
    } else {
      // 3. Unconfigured
      result = {
        configured: false,
        cloudName: null,
        uploadPreset: null,
        source: null,
        reason: 'Cloudinary is not configured. Add your Cloud Name and Unsigned Upload Preset in Settings → Storage & Data → Cloudinary Setup.',
      };
    }
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[Cloudinary] cloudName resolved:', !!result.cloudName);
    console.log('[Cloudinary] uploadPreset resolved:', !!result.uploadPreset);
    console.log('[Cloudinary] configuration valid:', result.configured);
  }

  return result;
};

/**
 * Initialize config from local storage, migrating/wiping any stale placeholder credentials.
 */
export const initCloudinaryConfig = async () => {
  try {
    const raw = await AsyncStorage.getItem(CLOUDINARY_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const savedCloud = saved?.cloudName?.trim();
      const savedPreset = saved?.uploadPreset?.trim();

      // Check if stored data contains stale placeholder values (e.g. legacy filmroom_media)
      if (isPlaceholderValue(savedCloud) || isPlaceholderValue(savedPreset)) {
        // Clean up stale legacy placeholder data
        await AsyncStorage.removeItem(CLOUDINARY_STORAGE_KEY);
        CLOUDINARY_CONFIG.cloudName = null;
        CLOUDINARY_CONFIG.uploadPreset = null;
        CLOUDINARY_CONFIG._source = null;
      } else {
        CLOUDINARY_CONFIG.cloudName = savedCloud;
        CLOUDINARY_CONFIG.uploadPreset = savedPreset;
        CLOUDINARY_CONFIG._source = 'local';
      }
    } else {
      CLOUDINARY_CONFIG.cloudName = null;
      CLOUDINARY_CONFIG.uploadPreset = null;
      CLOUDINARY_CONFIG._source = null;
    }
  } catch (_) {
    // Non-critical: continue with env or unconfigured
  }

  // If local config wasn't set, populate from env if valid
  if (!CLOUDINARY_CONFIG.cloudName || !CLOUDINARY_CONFIG.uploadPreset) {
    const envCloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const envPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (envCloud && !isPlaceholderValue(envCloud) && envPreset && !isPlaceholderValue(envPreset)) {
      CLOUDINARY_CONFIG.cloudName = envCloud.trim();
      CLOUDINARY_CONFIG.uploadPreset = envPreset.trim();
      CLOUDINARY_CONFIG._source = 'env';
    } else {
      CLOUDINARY_CONFIG.cloudName = null;
      CLOUDINARY_CONFIG.uploadPreset = null;
      CLOUDINARY_CONFIG._source = null;
    }
  }

  return resolveCloudinaryConfig();
};

/**
 * Save user-provided config from in-app settings after validating not placeholder.
 */
export const setCustomCloudinaryConfig = async (cloudName, uploadPreset) => {
  const trimmedCloud = (cloudName || '').trim();
  const trimmedPreset = (uploadPreset || '').trim();

  if (!trimmedCloud || isPlaceholderValue(trimmedCloud)) {
    throw new Error('Please enter a valid Cloudinary Cloud Name (placeholders are not allowed).');
  }

  if (!trimmedPreset || isPlaceholderValue(trimmedPreset)) {
    throw new Error('Please enter a valid Unsigned Upload Preset (placeholders are not allowed).');
  }

  CLOUDINARY_CONFIG.cloudName = trimmedCloud;
  CLOUDINARY_CONFIG.uploadPreset = trimmedPreset;
  CLOUDINARY_CONFIG._source = 'local';

  try {
    await AsyncStorage.setItem(
      CLOUDINARY_STORAGE_KEY,
      JSON.stringify({ cloudName: trimmedCloud, uploadPreset: trimmedPreset })
    );
  } catch (err) {
    throw new Error('Failed to persist Cloudinary settings to local storage.');
  }

  return resolveCloudinaryConfig();
};

/**
 * Reset custom config, remove local storage, and restore env (or unconfigured).
 */
export const resetCustomCloudinaryConfig = async () => {
  try {
    await AsyncStorage.removeItem(CLOUDINARY_STORAGE_KEY);
  } catch (_) {}

  CLOUDINARY_CONFIG.cloudName = null;
  CLOUDINARY_CONFIG.uploadPreset = null;
  CLOUDINARY_CONFIG._source = null;

  const envCloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const envPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (envCloud && !isPlaceholderValue(envCloud) && envPreset && !isPlaceholderValue(envPreset)) {
    CLOUDINARY_CONFIG.cloudName = envCloud.trim();
    CLOUDINARY_CONFIG.uploadPreset = envPreset.trim();
    CLOUDINARY_CONFIG._source = 'env';
  }

  return resolveCloudinaryConfig();
};

/**
 * Returns detailed status of Cloudinary configuration.
 */
export const getCloudinaryStatus = () => {
  const resolved = resolveCloudinaryConfig();
  return {
    isConfigured: resolved.configured,
    configured: resolved.configured,
    cloudName: resolved.cloudName,
    uploadPreset: resolved.uploadPreset,
    isPlaceholder: !resolved.configured,
    source: resolved.source,
    reason: resolved.reason,
  };
};

/**
 * Backward compatibility check
 */
export const isCloudinaryConfigured = () => {
  return resolveCloudinaryConfig().configured;
};
