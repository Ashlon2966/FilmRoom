import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

/**
 * Converts a local URI to a Blob reliably on React Native / Expo.
 */
const uriToBlob = (uri) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new TypeError('Network request failed for local file conversion'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

/**
 * Uploads a local file URI to Firebase Storage.
 * @param {string} localUri - The file URI from expo-image-picker or expo-document-picker.
 * @param {string} destinationPath - Path in cloud storage.
 * @returns {Promise<string>} Download URL of the uploaded asset.
 */
export const uploadFileToStorage = async (localUri, destinationPath) => {
  let blob = null;
  try {
    blob = await uriToBlob(localUri);
    const storageRef = ref(storage, destinationPath);

    // Upload to Firebase Storage
    await uploadBytesResumable(storageRef, blob);

    // Get public download URL
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error('Storage upload error:', error);
    throw error;
  } finally {
    // Free up memory allocated by the blob
    if (blob && typeof blob.close === 'function') {
      blob.close();
    }
  }
};