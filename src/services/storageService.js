import * as FileSystem from 'expo-file-system/legacy';

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