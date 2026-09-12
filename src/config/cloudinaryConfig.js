/**
 * FilmRoom Cloudinary Client-Side Configuration
 * 
 * SECURITY RULES:
 * 1. NEVER include Cloudinary API secret here or anywhere in client-side code.
 * 2. Uses unsigned upload presets strictly configured for FilmRoom media uploads.
 * 3. Client-side size & type limits protect Cloudinary free tier allowances.
 */

export const CLOUDINARY_CONFIG = {
  // Public cloud name (safe to expose client-side)
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'filmroom_media',

  // Unsigned upload preset created in Cloudinary Console (Settings -> Upload -> Upload presets)
  // Ensure mode is set to 'Unsigned' with folder e.g. 'filmroom_uploads'
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

/**
 * Returns whether Cloudinary is configured with custom credentials or defaults.
 */
export const isCloudinaryConfigured = () => {
  return (
    Boolean(CLOUDINARY_CONFIG.cloudName) &&
    CLOUDINARY_CONFIG.cloudName !== 'filmroom_media' &&
    Boolean(CLOUDINARY_CONFIG.uploadPreset) &&
    CLOUDINARY_CONFIG.uploadPreset !== 'filmroom_unsigned'
  );
};
