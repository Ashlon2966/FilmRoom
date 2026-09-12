/**
 * FilmRoom Cloudinary Client-Side Configuration
 * 
 * SECURITY RULES:
 * 1. NEVER include Cloudinary API secret here or anywhere in client-side code.
 * 2. Uses unsigned upload presets strictly configured for FilmRoom media uploads.
 * 3. Client-side size & type limits protect Cloudinary free tier allowances.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@filmroom_cloudinary_config';

// Active in-memory settings (initialized from environment variables)
export const CLOUDINARY_CONFIG = {
  // Public cloud name (safe to expose client-side)
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'filmroom_media',

  // Unsigned upload preset created in Cloudinary Console (Settings -> Upload -> Upload presets)
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'filmroom_unsigned',

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

// Initialize any user-overridden config from local storage
export const initCloudinaryConfig = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.cloudName) CLOUDINARY_CONFIG.cloudName = saved.cloudName.trim();
      if (saved.uploadPreset) CLOUDINARY_CONFIG.uploadPreset = saved.uploadPreset.trim();
    }
  } catch (_) {
    // Non-critical: continue with env values
  }
  return CLOUDINARY_CONFIG;
};

// Save user-provided config from in-app settings
export const setCustomCloudinaryConfig = async (cloudName, uploadPreset) => {
  if (cloudName) CLOUDINARY_CONFIG.cloudName = cloudName.trim();
  if (uploadPreset) CLOUDINARY_CONFIG.uploadPreset = uploadPreset.trim();
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cloudName: CLOUDINARY_CONFIG.cloudName, uploadPreset: CLOUDINARY_CONFIG.uploadPreset })
    );
  } catch (_) {}
  return CLOUDINARY_CONFIG;
};

// Reset custom config and restore env defaults
export const resetCustomCloudinaryConfig = async () => {
  CLOUDINARY_CONFIG.cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'filmroom_media';
  CLOUDINARY_CONFIG.uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'filmroom_unsigned';
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  return CLOUDINARY_CONFIG;
};

/**
 * Returns detailed status of Cloudinary configuration.
 */
export const getCloudinaryStatus = () => {
  const isDefaultPlaceholder =
    !CLOUDINARY_CONFIG.cloudName ||
    CLOUDINARY_CONFIG.cloudName === 'filmroom_media' ||
    !CLOUDINARY_CONFIG.uploadPreset ||
    CLOUDINARY_CONFIG.uploadPreset === 'filmroom_unsigned';

  return {
    isConfigured: !isDefaultPlaceholder,
    cloudName: CLOUDINARY_CONFIG.cloudName,
    uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
    isPlaceholder: isDefaultPlaceholder,
  };
};

/**
 * Backward compatibility check
 */
export const isCloudinaryConfigured = () => {
  return getCloudinaryStatus().isConfigured;
};
