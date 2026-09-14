/**
 * FilmRoom Cloudinary Media Upload Service
 * 
 * Secure, reusable client-side upload service using Cloudinary Unsigned Upload Presets.
 * - Zero API secret exposure (client uses only Cloud Name + Unsigned Preset)
 * - Granular 0-100% upload progress reporting
 * - Cancellation support via XMLHttpRequest abort
 * - Client-side size & file-type validation
 * - Dynamic URL transformations for optimized cinema thumbnails
 * - Pre-upload configuration validation (no network calls if unconfigured)
 * - Lightweight live connectivity testing
 */

import {
  CLOUDINARY_CONFIG,
  resolveCloudinaryConfig,
  initCloudinaryConfig,
  isPlaceholderValue,
} from '../config/cloudinaryConfig';

/**
 * Validates a file's format and size before upload to protect free-tier quotas.
 */
export const validateMediaFile = ({ uri, size, type = 'image', name = '' }) => {
  if (!uri) {
    throw new Error('No media file selected.');
  }

  // Derive file extension
  const extension = (name || uri).split('.').pop().toLowerCase().split('?')[0];

  if (type === 'image') {
    if (size && size > CLOUDINARY_CONFIG.limits.maxImageBytes) {
      const maxMb = Math.round(CLOUDINARY_CONFIG.limits.maxImageBytes / (1024 * 1024));
      const actualMb = (size / (1024 * 1024)).toFixed(1);
      throw new Error(`Image size (${actualMb} MB) exceeds limit of ${maxMb} MB. Please select a smaller photo.`);
    }
  } else if (type === 'video') {
    if (size && size > CLOUDINARY_CONFIG.limits.maxVideoBytes) {
      const maxMb = Math.round(CLOUDINARY_CONFIG.limits.maxVideoBytes / (1024 * 1024));
      const actualMb = (size / (1024 * 1024)).toFixed(1);
      throw new Error(`Video size (${actualMb} MB) exceeds limit of ${maxMb} MB. Please compress or select a shorter video.`);
    }
  }

  return { isValid: true, extension };
};

/**
 * Uploads media to Cloudinary using an unsigned upload preset.
 * 
 * @param {Object} options
 * @param {string} options.fileUri - Local device URI of the media file
 * @param {string} [options.resourceType='image'] - 'image' | 'video' | 'raw' | 'auto'
 * @param {string} [options.fileName] - Original file name
 * @param {number} [options.fileSize] - File size in bytes for pre-validation
 * @param {string} [options.folder='filmroom_uploads'] - Destination folder in Cloudinary
 * @param {Function} [options.onProgress] - Callback receiving integer (0-100)
 * @param {Object} [options.cancelRef] - Mutable ref whose .current can store the abort function
 * @returns {Promise<Object>} Clean media metadata reference for Firestore
 */
export const uploadToCloudinary = async ({
  fileUri,
  resourceType = 'image',
  fileName,
  fileSize,
  folder = 'filmroom_uploads',
  onProgress,
  cancelRef,
}) => {
  // Ensure local config override is loaded
  await initCloudinaryConfig();

  // 1. Resolve configuration with strict priority & placeholder detection
  const config = resolveCloudinaryConfig();
  if (!config.configured) {
    throw new Error(
      config.reason ||
      'Cloudinary is not configured. Add your Cloud Name and Unsigned Upload Preset in Settings → Storage & Data → Cloudinary Setup.'
    );
  }

  const cloudName = config.cloudName;
  const uploadPreset = config.uploadPreset;

  // 2. Client-side pre-validation of media size & type
  validateMediaFile({
    uri: fileUri,
    size: fileSize,
    type: resourceType,
    name: fileName,
  });

  return new Promise((resolve, reject) => {
    try {
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.timeout = 120000; // 2 minutes timeout for mobile connectivity

      // Store abort function in cancelRef if provided
      if (cancelRef) {
        cancelRef.current = () => {
          xhr.abort();
        };
      }

      // 3. Track upload progress (0% - 100%)
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
            onProgress(percent);
          }
        };
      }

      // 4. Handle response completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            const mediaReference = {
              secureUrl: res.secure_url,
              publicId: res.public_id,
              deleteToken: res.delete_token || null,
              resourceType: res.resource_type || resourceType,
              format: res.format || '',
              width: res.width || null,
              height: res.height || null,
              bytes: res.bytes || fileSize || 0,
              createdAt: res.created_at || new Date().toISOString(),
              originalFilename: res.original_filename || fileName || 'media',
            };
            if (onProgress) onProgress(100);
            resolve(mediaReference);
          } catch (parseErr) {
            reject(new Error('Failed to parse Cloudinary upload response.'));
          }
        } else {
          let rawError = '';
          try {
            const errorRes = JSON.parse(xhr.responseText);
            rawError = errorRes?.error?.message || '';
          } catch (_) {}

          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.log('[Cloudinary] Upload failed with HTTP', xhr.status, 'Error:', rawError);
          }

          let userFriendlyMessage = "Cloudinary isn't configured. Check Settings → Storage & Data → Cloudinary Setup.";

          if (xhr.status === 401 || xhr.status === 403) {
            userFriendlyMessage = 'Cloudinary rejected the Cloud Name. Check your Cloudinary configuration.';
          } else if (xhr.status === 400) {
            const lower = (rawError || '').toLowerCase();
            if (lower.includes('preset') || lower.includes('unsigned')) {
              userFriendlyMessage = 'Cloudinary rejected the upload preset. Make sure the preset is an unsigned upload preset.';
            } else if (rawError) {
              userFriendlyMessage = `Cloudinary rejected the upload: ${rawError}`;
            }
          } else if (xhr.status >= 500) {
            userFriendlyMessage = 'Cloudinary service is temporarily unavailable. Please try again later.';
          } else if (rawError) {
            userFriendlyMessage = `Cloudinary Notice: ${rawError}`;
          }

          const uploadErr = new Error(userFriendlyMessage);
          uploadErr.statusCode = xhr.status;
          uploadErr.rawMessage = rawError;
          reject(uploadErr);
        }
      };

      // 5. Handle network, timeout, and cancellation errors
      xhr.onerror = () => {
        reject(new Error("Couldn't connect to Cloudinary. Check your internet connection and try again."));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out. Check your internet connection and try again.'));
      };

      xhr.onabort = () => {
        const cancelErr = new Error('Upload cancelled by user.');
        cancelErr.isCancelled = true;
        reject(cancelErr);
      };

      // 6. Prepare FormData payload (Unsigned uploads only - STRICTLY NO api_key or api_secret)
      const formData = new FormData();
      formData.append('upload_preset', uploadPreset);
      if (folder) {
        formData.append('folder', folder);
      }

      // Derive mime type
      const ext = (fileName || fileUri).split('.').pop().toLowerCase().split('?')[0];
      let mimeType = 'image/jpeg';
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'mp4') mimeType = 'video/mp4';
      else if (ext === 'mov') mimeType = 'video/quicktime';
      else if (ext === 'pdf') mimeType = 'application/pdf';

      const finalFileName = fileName || `filmroom_${Date.now()}.${ext || 'jpg'}`;

      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: finalFileName,
      });

      xhr.send(formData);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Performs a real, lightweight live connection test against Cloudinary.
 * Uploads a 43-byte transparent pixel data URI to verify Cloud Name and Unsigned Upload Preset.
 * 
 * @param {Object} [credentials]
 * @param {string} [credentials.cloudName]
 * @param {string} [credentials.uploadPreset]
 * @returns {Promise<{ success: boolean, message: string, statusCode?: number }>}
 */
export const testCloudinaryConnection = async (credentials = {}) => {
  let targetCloud = credentials?.cloudName?.trim();
  let targetPreset = credentials?.uploadPreset?.trim();

  // If credentials not passed directly, resolve from active config
  if (!targetCloud || !targetPreset) {
    await initCloudinaryConfig();
    const config = resolveCloudinaryConfig();
    if (!config.configured) {
      return {
        success: false,
        message: 'Cloudinary is not configured. Please enter your Cloud Name and Unsigned Upload Preset first.',
      };
    }
    targetCloud = config.cloudName;
    targetPreset = config.uploadPreset;
  }

  if (isPlaceholderValue(targetCloud)) {
    return {
      success: false,
      message: 'Please enter a valid Cloud Name (placeholder values like "filmroom_media" are not accepted).',
    };
  }

  if (isPlaceholderValue(targetPreset)) {
    return {
      success: false,
      message: 'Please enter a valid Unsigned Upload Preset (placeholder values like "filmroom_unsigned" are not accepted).',
    };
  }

  return new Promise((resolve) => {
    try {
      const uploadUrl = `https://api.cloudinary.com/v1_1/${targetCloud}/image/upload`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.timeout = 15000; // 15 seconds test timeout

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            message: '✓ Cloudinary connection verified! Cloud Name and Unsigned Upload Preset are valid and accepting uploads.',
            statusCode: xhr.status,
          });
        } else {
          let rawError = '';
          try {
            const errRes = JSON.parse(xhr.responseText);
            rawError = errRes?.error?.message || '';
          } catch (_) {}

          let message = 'Cloudinary rejected this configuration. Check the Cloud Name and Unsigned Upload Preset.';
          if (xhr.status === 401) {
            message = 'Cloudinary Cloud Name is invalid. Check your Cloudinary dashboard.';
          } else if (xhr.status === 400) {
            const lower = (rawError || '').toLowerCase();
            if (lower.includes('preset') || lower.includes('unsigned')) {
              message = 'Cloudinary upload preset is invalid or unavailable. Make sure the preset exists and is configured for unsigned uploads.';
            } else if (rawError) {
              message = `Cloudinary rejected preset: ${rawError}`;
            }
          }

          resolve({
            success: false,
            message,
            statusCode: xhr.status,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          success: false,
          message: "Couldn't connect to Cloudinary. Check your internet connection and try again.",
        });
      };

      xhr.ontimeout = () => {
        resolve({
          success: false,
          message: 'Connection to Cloudinary timed out. Check your internet connection and try again.',
        });
      };

      // Lightweight 1x1 transparent GIF base64 payload (43 bytes)
      const tinyPixelDataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

      const formData = new FormData();
      formData.append('upload_preset', targetPreset);
      formData.append('folder', 'filmroom_connectivity_test');
      formData.append('file', tinyPixelDataUri);

      xhr.send(formData);
    } catch (err) {
      resolve({
        success: false,
        message: err.message || 'Failed to initiate Cloudinary connection test.',
      });
    }
  });
};

/**
 * Generates an optimized Cloudinary thumbnail URL with on-the-fly transformations.
 * 
 * @param {string} url - Original secure Cloudinary URL
 * @param {Object} options - Transformation options
 * @param {number} [options.width=300] - Desired width
 * @param {number} [options.height=300] - Desired height
 * @param {string} [options.crop='fill'] - Crop mode ('fill', 'thumb', 'fit')
 * @param {string} [options.quality='auto'] - Quality setting ('auto', 'eco')
 * @returns {string} Transformed Cloudinary URL, or original url if not Cloudinary
 */
export const getCloudinaryThumbnail = (url, { width = 300, height = 300, crop = 'fill', quality = 'auto' } = {}) => {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return url;

  // Insert transformations after '/upload/'
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const transformString = `w_${width},h_${height},c_${crop},q_${quality},f_auto/`;
  return url.slice(0, uploadIndex + 8) + transformString + url.slice(uploadIndex + 8);
};

/**
 * Extracts the Cloudinary public_id from a full secure URL.
 * Handles paths with folders, version tags (v123...), and transformations.
 * 
 * Example:
 * https://res.cloudinary.com/cloud_name/image/upload/v12345/filmroom_avatars/xyz.jpg -> filmroom_avatars/xyz
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }
  try {
    const splitUpload = url.split('/upload/');
    if (splitUpload.length < 2) return null;
    const pathAfterUpload = splitUpload[1].split('?')[0]; // strip query string
    const segments = pathAfterUpload.split('/');
    
    // Cloudinary transformation segments usually appear before the version tag 'v12345...'
    // If there is a version tag, everything after the version tag is the public_id
    const versionIndex = segments.findIndex((seg) => /^v\d+$/.test(seg));
    let publicIdParts;
    if (versionIndex !== -1) {
      publicIdParts = segments.slice(versionIndex + 1);
    } else {
      // If no version tag, filter out transformation segments
      const transformPrefixes = ['c_', 'w_', 'h_', 'q_', 'f_', 'r_', 'e_', 'b_', 'co_', 'fl_', 'a_', 'dpr_', 'bo_', 'g_'];
      publicIdParts = segments.filter((seg) => !transformPrefixes.some((tp) => seg.startsWith(tp) || seg.includes(',')));
    }

    if (!publicIdParts || publicIdParts.length === 0) return null;
    const fullPath = publicIdParts.join('/');
    // Remove extension
    const dotIdx = fullPath.lastIndexOf('.');
    return dotIdx !== -1 ? fullPath.substring(0, dotIdx) : fullPath;
  } catch (_) {
    return null;
  }
};

/**
 * Deletes an asset from Cloudinary.
 * Tries delete_token first (if upload preset returned it), or the unsigned destroy endpoint.
 * 
 * @param {Object} params
 * @param {string} [params.publicId] - The Cloudinary public_id to destroy
 * @param {string} [params.deleteToken] - Optional delete_token from upload response
 * @param {string} [params.resourceType='image'] - 'image' | 'video' | 'raw'
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export const deleteFromCloudinary = async ({ publicId, deleteToken, resourceType = 'image' } = {}) => {
  await initCloudinaryConfig();
  const config = resolveCloudinaryConfig();
  if (!config.configured) {
    return { success: false, message: 'Cloudinary is not configured.' };
  }

  const cloudName = config.cloudName;
  const uploadPreset = config.uploadPreset;

  // 1. If delete_token exists, use the token deletion endpoint (highest reliability for client-side)
  if (deleteToken) {
    try {
      const formData = new FormData();
      formData.append('token', deleteToken);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (data.result === 'ok') {
        return { success: true, message: 'Photo deleted from Cloudinary.' };
      }
    } catch (tokenErr) {
      console.warn('[Cloudinary] Delete by token notice:', tokenErr.message);
    }
  }

  // 2. Otherwise attempt destroy endpoint with public_id and preset
  if (publicId) {
    try {
      const formData = new FormData();
      formData.append('public_id', publicId);
      if (uploadPreset) {
        formData.append('upload_preset', uploadPreset);
      }
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (data.result === 'ok' || data.result === 'not found') {
        return { success: true, message: 'Asset deleted from Cloudinary.' };
      }
      return { success: true, message: 'Asset unlinked.' };
    } catch (destroyErr) {
      console.warn('[Cloudinary] Destroy notice:', destroyErr.message);
      return { success: false, message: destroyErr.message };
    }
  }

  return { success: false, message: 'No public ID or delete token provided.' };
};

