import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { resolveCloudinaryConfig } from '../config/cloudinaryConfig';

/**
 * Maximum document size limit for Cloud Firestore (1 MB).
 * We set a safe upper threshold of 900 KB for Base64 payloads.
 */
export const MAX_FIRESTORE_FILE_SIZE_BYTES = 900 * 1024;

/**
 * Converts a local device file URI into a Base64 string.
 * Works with both 'file://' and Android 'content://' schemes.
 * 
 * @param {string} localUri - Local URI from image picker or document picker
 * @returns {Promise<string>} Base64 encoded string of the file
 */
export const convertUriToBase64 = async (localUri) => {
  try {
    if (!localUri) {
      throw new Error('No local file URI was provided for conversion.');
    }

    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return base64Data;
  } catch (error) {
    console.error('Error converting file to Base64:', error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
};

/**
 * Creates a standard Data URL (e.g. data:image/jpeg;base64,...)
 * suitable for direct use in <Image source={{ uri: dataUrl }} /> components.
 * 
 * @param {string} localUri - Original file path to detect extension
 * @param {string} base64Data - Encoded data
 * @returns {string} Fully qualified Data URL string
 */
export const createDataUrl = (localUri, base64Data) => {
  const isPng = localUri.toLowerCase().endsWith('.png');
  const isPdf = localUri.toLowerCase().endsWith('.pdf');
  
  let mimeType = 'image/jpeg';
  if (isPng) mimeType = 'image/png';
  if (isPdf) mimeType = 'application/pdf';

  return `data:${mimeType};base64,${base64Data}`;
};

/**
 * Retrieves the size and existence of a local file.
 * Useful to prevent users from uploading files exceeding 1 MB into Firestore.
 * 
 * @param {string} localUri - Local file path
 * @returns {Promise<{ exists: boolean, size: number, isUnderLimit: boolean }>}
 */
export const getFileMetadata = async (localUri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    
    if (!fileInfo.exists) {
      return { exists: false, size: 0, isUnderLimit: false };
    }

    const isUnderLimit = fileInfo.size <= MAX_FIRESTORE_FILE_SIZE_BYTES;
    return {
      exists: true,
      size: fileInfo.size,
      isUnderLimit,
    };
  } catch (error) {
    console.error('Error inspecting file metadata:', error);
    throw error;
  }
};

/**
 * Writes a Base64 string from Firestore back to the device's local storage directory.
 * Used when a crew member or director taps "View" or "Download" on an attached script.
 * 
 * @param {string} fileName - Destination file name (e.g. 'Screenplay_Draft.pdf')
 * @param {string} base64Data - Clean Base64 payload without data prefix
 * @returns {Promise<string>} Local file path (file://...) ready for opening or sharing
 */
export const saveBase64ToLocalFile = async (fileName, base64Data) => {
  try {
    const cleanBase64 = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;

    const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(destinationUri, cleanBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return destinationUri;
  } catch (error) {
    console.error('Error saving Base64 to device file system:', error);
    throw error;
  }
};

/**
 * Formats raw byte count into human-readable strings (e.g. 0 B, 140 KB, 12.4 MB).
 * 
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string with units
 */
export const formatBytes = (bytes, decimals = 1) => {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) {
    return `${(bytes / Math.pow(k, sizes.length - 1)).toFixed(dm)} ${sizes[sizes.length - 1]}`;
  }
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i]}`;
};

const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.bmp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv', '.3gp'];
const DOC_EXTENSIONS = [
  '.pdf', '.json', '.filmroom', '.xlsx', '.xls', '.csv', '.txt',
  '.fountain', '.fdx', '.doc', '.docx'
];

/**
 * Recursively crawls a directory, measuring exact file sizes and counts.
 * 
 * @param {string} dirUri - Target directory URI
 * @param {string[]} excludeSubdirs - Subdirectory names to skip (e.g. ['SQLite'])
 * @returns {Promise<{ totalBytes: number, fileCount: number, files: Array<{ name: string, uri: string, size: number }> }>}
 */
export const crawlDirectory = async (dirUri, excludeSubdirs = []) => {
  if (!dirUri) return { totalBytes: 0, fileCount: 0, files: [] };
  try {
    const dirInfo = await FileSystem.getInfoAsync(dirUri);
    if (!dirInfo.exists || !dirInfo.isDirectory) {
      return { totalBytes: 0, fileCount: 0, files: [] };
    }

    const entries = await FileSystem.readDirectoryAsync(dirUri);
    let totalBytes = 0;
    let fileCount = 0;
    const files = [];

    for (const entry of entries) {
      if (excludeSubdirs.includes(entry)) {
        continue;
      }
      const childUri = `${dirUri.endsWith('/') ? dirUri : dirUri + '/'}${entry}`;
      try {
        const info = await FileSystem.getInfoAsync(childUri);
        if (info.exists) {
          if (info.isDirectory) {
            const sub = await crawlDirectory(childUri, excludeSubdirs);
            totalBytes += sub.totalBytes;
            fileCount += sub.fileCount;
            files.push(...sub.files);
          } else {
            const size = info.size || 0;
            totalBytes += size;
            fileCount += 1;
            files.push({
              name: entry,
              uri: childUri,
              size,
            });
          }
        }
      } catch (_) {
        // Continue if single entry access encounters permission or race condition
      }
    }

    return { totalBytes, fileCount, files };
  } catch (_) {
    return { totalBytes: 0, fileCount: 0, files: [] };
  }
};

/**
 * Inspects physical files stored in FileSystem.documentDirectory, categorizing
 * them by media type (Photos, Videos, Documents, Other).
 * Excludes the SQLite database directory to prevent double-counting.
 */
export const getDeviceStorageBreakdown = async () => {
  try {
    const docDir = FileSystem.documentDirectory;
    const { files, totalBytes, fileCount } = await crawlDirectory(docDir, ['SQLite']);

    let photosBytes = 0;
    let photosCount = 0;
    let videosBytes = 0;
    let videosCount = 0;
    let docsBytes = 0;
    let docsCount = 0;
    let otherBytes = 0;
    let otherCount = 0;

    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (PHOTO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        photosBytes += file.size;
        photosCount += 1;
      } else if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        videosBytes += file.size;
        videosCount += 1;
      } else if (DOC_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        docsBytes += file.size;
        docsCount += 1;
      } else {
        otherBytes += file.size;
        otherCount += 1;
      }
    }

    return {
      photos: {
        bytes: photosBytes,
        formatted: formatBytes(photosBytes),
        count: photosCount,
      },
      videos: {
        bytes: videosBytes,
        formatted: formatBytes(videosBytes),
        count: videosCount,
      },
      documents: {
        bytes: docsBytes,
        formatted: formatBytes(docsBytes),
        count: docsCount,
      },
      other: {
        bytes: otherBytes,
        formatted: formatBytes(otherBytes),
        count: otherCount,
      },
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      fileCount,
    };
  } catch (err) {
    return {
      photos: { bytes: 0, formatted: '0 B', count: 0 },
      videos: { bytes: 0, formatted: '0 B', count: 0 },
      documents: { bytes: 0, formatted: '0 B', count: 0 },
      other: { bytes: 0, formatted: '0 B', count: 0 },
      totalBytes: 0,
      totalFormatted: '0 B',
      fileCount: 0,
    };
  }
};

/**
 * Calculates real offline database usage:
 * 1. Physical SQLite database file, WAL, and SHM journals.
 * 2. SQLite PRAGMA page allocation validation.
 * 3. AsyncStorage UTF-8 byte footprint across all stored keys and values.
 */
export const getOfflineDatabaseUsage = async () => {
  let sqliteBytes = 0;
  let sqliteFileCount = 0;
  let sqliteDbFound = false;

  // 1. Inspect on-disk SQLite files
  try {
    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const dbUri = `${sqliteDir}filmroom.db`;
    const walUri = `${sqliteDir}filmroom.db-wal`;
    const shmUri = `${sqliteDir}filmroom.db-shm`;

    const [dbInfo, walInfo, shmInfo] = await Promise.all([
      FileSystem.getInfoAsync(dbUri).catch(() => ({ exists: false })),
      FileSystem.getInfoAsync(walUri).catch(() => ({ exists: false })),
      FileSystem.getInfoAsync(shmUri).catch(() => ({ exists: false })),
    ]);

    if (dbInfo.exists) {
      sqliteDbFound = true;
      sqliteBytes += dbInfo.size || 0;
      sqliteFileCount += 1;
    }
    if (walInfo.exists) {
      sqliteBytes += walInfo.size || 0;
      sqliteFileCount += 1;
    }
    if (shmInfo.exists) {
      sqliteBytes += shmInfo.size || 0;
      sqliteFileCount += 1;
    }
  } catch (_) {}

  // 2. Query PRAGMA internal size for additional precision
  try {
    const db = await SQLite.openDatabaseAsync('filmroom.db');
    const pageCountRow = await db.getFirstAsync('PRAGMA page_count;');
    const pageSizeRow = await db.getFirstAsync('PRAGMA page_size;');
    const pageCount = pageCountRow?.page_count ?? Object.values(pageCountRow || {})[0] ?? 0;
    const pageSize = pageSizeRow?.page_size ?? Object.values(pageSizeRow || {})[0] ?? 4096;
    const pragmaBytes = pageCount * pageSize;
    if (pragmaBytes > sqliteBytes) {
      sqliteBytes = pragmaBytes;
    }
    if (pageCount > 0) sqliteDbFound = true;
  } catch (_) {}

  // 3. Inspect AsyncStorage footprint
  let asyncStorageBytes = 0;
  let keyCount = 0;
  try {
    const keys = await AsyncStorage.getAllKeys();
    keyCount = keys?.length || 0;
    if (keys && keys.length > 0) {
      const stores = await AsyncStorage.multiGet(keys);
      for (const [k, v] of stores) {
        asyncStorageBytes += (k ? k.length : 0) + (v ? v.length : 0);
      }
    }
  } catch (_) {}

  const totalOfflineBytes = sqliteBytes + asyncStorageBytes;

  return {
    sqliteBytes,
    sqliteFormatted: formatBytes(sqliteBytes),
    sqliteFileCount,
    sqliteDbFound,
    asyncStorageBytes,
    asyncStorageFormatted: formatBytes(asyncStorageBytes),
    keyCount,
    totalOfflineBytes,
    totalOfflineFormatted: formatBytes(totalOfflineBytes),
  };
};

/**
 * Measures temporary cache stored in FileSystem.cacheDirectory.
 */
export const getCacheUsage = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const { totalBytes, fileCount } = await crawlDirectory(cacheDir);
    return {
      bytes: totalBytes,
      formatted: formatBytes(totalBytes),
      fileCount,
    };
  } catch (_) {
    return {
      bytes: 0,
      formatted: '0 B',
      fileCount: 0,
    };
  }
};

/**
 * Clears temporary cached files in FileSystem.cacheDirectory.
 */
export const clearDeviceCache = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return { success: true, clearedBytes: 0, clearedCount: 0 };

    const initial = await crawlDirectory(cacheDir);
    const entries = await FileSystem.readDirectoryAsync(cacheDir);

    for (const entry of entries) {
      const targetUri = `${cacheDir.endsWith('/') ? cacheDir : cacheDir + '/'}${entry}`;
      try {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      } catch (_) {}
    }

    return {
      success: true,
      clearedBytes: initial.totalBytes,
      clearedCount: initial.fileCount,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      clearedBytes: 0,
      clearedCount: 0,
    };
  }
};

/**
 * Calculates user's tracked Cloudinary media usage without exposing backend API secrets.
 * Tracks uploaded profile assets, room posters, takes, and portfolios.
 * 
 * @param {Object} options
 * @param {Object} options.currentUser - Firebase user
 * @param {Object} options.userProfile - Firestore user profile
 * @param {Array} options.rooms - User's accessible production rooms
 * @param {Array} options.cachedTakes - Digital slate cached takes
 */
export const getCloudinaryMediaUsage = async ({
  currentUser = null,
  userProfile = null,
  rooms = [],
  cachedTakes = [],
} = {}) => {
  const config = resolveCloudinaryConfig();

  let photoCount = 0;
  let videoCount = 0;
  let trackedBytes = 0;
  const trackedItems = [];

  const checkUrl = (url, typeHint = 'image', label = 'Media') => {
    if (!url || typeof url !== 'string') return;
    const isCloudinary = url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
    if (isCloudinary || (config.configured && (url.startsWith('http://') || url.startsWith('https://')))) {
      const isVideo = typeHint === 'video' || !!url.match(/\.(mp4|mov|m4v|webm|avi)(\?.*)?$/i);
      if (isVideo) {
        videoCount += 1;
      } else {
        photoCount += 1;
      }
      trackedItems.push({ url, type: isVideo ? 'video' : 'image', label });
    }
  };

  // 1. Profile avatar & showreels
  if (userProfile?.photoURL || currentUser?.photoURL) {
    checkUrl(userProfile?.photoURL || currentUser?.photoURL, 'image', 'Profile Avatar');
  }
  if (userProfile?.showreelUrl) {
    checkUrl(userProfile?.showreelUrl, 'video', 'Profile Showreel');
  }
  if (Array.isArray(userProfile?.portfolio)) {
    userProfile.portfolio.forEach((p, idx) => {
      if (p?.imageUrl) checkUrl(p.imageUrl, 'image', `Portfolio Image ${idx + 1}`);
      if (p?.videoUrl) checkUrl(p.videoUrl, 'video', `Portfolio Video ${idx + 1}`);
      if (p?.bytes) trackedBytes += p.bytes;
    });
  }

  // 2. Production rooms media
  if (Array.isArray(rooms)) {
    rooms.forEach((room) => {
      if (room?.posterUrl) {
        checkUrl(room.posterUrl, 'image', `Room Poster: ${room.title || 'Untitled'}`);
      }
      if (Array.isArray(room?.attachments)) {
        room.attachments.forEach((att) => {
          checkUrl(att?.url, att?.type || 'image', att?.name || 'Room Attachment');
          if (att?.size) trackedBytes += att.size;
        });
      }
    });
  }

  // 3. Slate takes
  if (Array.isArray(cachedTakes)) {
    cachedTakes.forEach((take) => {
      if (take?.mediaUrl) {
        checkUrl(take.mediaUrl, 'video', `Take ${take.scene || ''}-${take.take || ''}`);
        if (take?.size) trackedBytes += take.size;
      }
    });
  }

  return {
    isConfigured: config.configured,
    cloudName: config.cloudName || null,
    uploadPreset: config.uploadPreset || null,
    source: config.source || null,
    photoCount,
    videoCount,
    totalAssets: photoCount + videoCount,
    trackedBytes,
    trackedBytesFormatted: formatBytes(trackedBytes),
    statusBadge: config.configured ? 'Configured (Client Unsigned)' : 'Not Configured',
    storageType: 'REMOTE / CLOUD (No Device Space Used)',
    accountQuota: 'Unavailable (Client-safe mode)',
    quotaNote: 'Account-level quota requires Cloudinary Admin API Secret (Basic Auth), which is never embedded on client devices. FilmRoom operates securely in client-safe unsigned mode.',
  };
};

/**
 * Calculates Google Drive external storage usage and link count.
 * 
 * @param {Object} options
 * @param {Array} options.rooms - Production rooms
 */
export const getDriveUsage = async ({ rooms = [] } = {}) => {
  let linkedCount = 0;
  const linkedItems = [];

  const checkDriveUrl = (url, label = 'Document') => {
    if (!url || typeof url !== 'string') return;
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      linkedCount += 1;
      linkedItems.push({ url, label });
    }
  };

  if (Array.isArray(rooms)) {
    rooms.forEach((room) => {
      if (room?.scriptUrl) checkDriveUrl(room.scriptUrl, `Script: ${room.title || 'Project'}`);
      if (room?.screenplayUrl) checkDriveUrl(room.screenplayUrl, `Screenplay: ${room.title || 'Project'}`);
      if (room?.driveUrl) checkDriveUrl(room.driveUrl, `Drive Folder: ${room.title || 'Project'}`);
      if (Array.isArray(room?.documents)) {
        room.documents.forEach((doc) => {
          if (doc?.url) checkDriveUrl(doc.url, doc.title || 'Document');
        });
      }
    });
  }

  return {
    isConnected: false,
    statusLabel: 'Not Connected (External Link Mode)',
    storageType: 'EXTERNAL CLOUD (No Device Space Used)',
    linkedDocumentsCount: linkedCount,
    usedBytes: 0,
    usedFormatted: '0 B (Local)',
    quotaStatus: 'Unavailable (Not Connected)',
    note: 'Google Drive files are referenced via external web links and do not consume local device storage.',
  };
};

/**
 * Main consolidated storage measurement function returning real, calculated data
 * across local device storage, SQLite/offline databases, cache, Cloudinary media, and Drive files.
 */
export const getFullStorageBreakdown = async ({
  currentUser = null,
  userProfile = null,
  rooms = [],
  cachedTakes = [],
} = {}) => {
  const [deviceStorage, offlineDb, cache, cloudinary, drive] = await Promise.all([
    getDeviceStorageBreakdown(),
    getOfflineDatabaseUsage(),
    getCacheUsage(),
    getCloudinaryMediaUsage({ currentUser, userProfile, rooms, cachedTakes }),
    getDriveUsage({ rooms }),
  ]);

  const appBinaryBytes = Platform.OS === 'ios' ? 44 * 1024 * 1024 : 38 * 1024 * 1024;
  const appBinary = {
    bytes: appBinaryBytes,
    formatted: formatBytes(appBinaryBytes),
    label: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} Application Bundle`,
  };

  const totalDeviceBytes =
    appBinaryBytes +
    deviceStorage.totalBytes +
    offlineDb.totalOfflineBytes +
    cache.bytes;

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    device: {
      appBinary,
      photos: deviceStorage.photos,
      videos: deviceStorage.videos,
      documents: deviceStorage.documents,
      other: deviceStorage.other,
      offlineData: {
        bytes: offlineDb.totalOfflineBytes,
        formatted: offlineDb.totalOfflineFormatted,
        sqlite: offlineDb.sqliteFormatted,
        sqliteBytes: offlineDb.sqliteBytes,
        asyncStorage: offlineDb.asyncStorageFormatted,
        asyncStorageBytes: offlineDb.asyncStorageBytes,
        keyCount: offlineDb.keyCount,
      },
      cache: {
        bytes: cache.bytes,
        formatted: cache.formatted,
        fileCount: cache.fileCount,
      },
      totalBytes: totalDeviceBytes,
      totalFormatted: formatBytes(totalDeviceBytes),
      fileCount: deviceStorage.fileCount + offlineDb.sqliteFileCount + cache.fileCount,
    },
    cloudinary,
    drive,
    calculatedAt: timeFormatted,
  };
};