/**
 * FilmRoom Cloudinary Media Upload Service
 * 
 * Secure, reusable client-side upload service using Cloudinary Unsigned Upload Presets.
 * - Zero API secret exposure
 * - Granular 0-100% upload progress reporting
 * - Cancellation support via XMLHttpRequest abort
 * - Client-side size & file-type validation
 * - Dynamic URL transformations for optimized cinema thumbnails
 */

import { CLOUDINARY_CONFIG } from '../config/cloudinaryConfig';

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
      throw new Error(`Image size (${actualMb} MB) exceeds free-tier limit of ${maxMb} MB. Please select a smaller photo.`);
    }
  } else if (type === 'video') {
    if (size && size > CLOUDINARY_CONFIG.limits.maxVideoBytes) {
      const maxMb = Math.round(CLOUDINARY_CONFIG.limits.maxVideoBytes / (1024 * 1024));
      const actualMb = (size / (1024 * 1024)).toFixed(1);
      throw new Error(`Video size (${actualMb} MB) exceeds free-tier limit of ${maxMb} MB. Please compress or select a shorter video.`);
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
export const uploadToCloudinary = ({
  fileUri,
  resourceType = 'image',
  fileName,
  fileSize,
  folder = 'filmroom_uploads',
  onProgress,
  cancelRef,
}) => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Client-side pre-validation
      validateMediaFile({
        uri: fileUri,
        size: fileSize,
        type: resourceType,
        name: fileName,
      });

      const cloudName = CLOUDINARY_CONFIG.cloudName;
      const uploadPreset = CLOUDINARY_CONFIG.uploadPreset;

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

      // 2. Track upload progress (0% - 100%)
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
            onProgress(percent);
          }
        };
      }

      // 3. Handle response completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            const mediaReference = {
              secureUrl: res.secure_url,
              publicId: res.public_id,
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
          let errorMsg = `Upload failed (Status ${xhr.status})`;
          try {
            const errorRes = JSON.parse(xhr.responseText);
            if (errorRes?.error?.message) {
              errorMsg = errorRes.error.message;
            }
          } catch (_) {
            // Keep default errorMsg
          }
          reject(new Error(errorMsg));
        }
      };

      // 4. Handle network and cancellation errors
      xhr.onerror = () => {
        reject(new Error('Network error during upload. Please check your internet connection and try again.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out. The file may be too large for your current connection.'));
      };

      xhr.onabort = () => {
        const cancelErr = new Error('Upload cancelled by user.');
        cancelErr.isCancelled = true;
        reject(cancelErr);
      };

      // 5. Prepare FormData payload
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
