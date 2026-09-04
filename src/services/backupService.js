import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Alert } from 'react-native';

/**
 * Scans the local document directory and computes the next incremental backup filename.
 * Produces: backup1.json, backup2.json, backup3.json, etc.
 */
const getNextBackupFilename = async () => {
  try {
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    let highestIndex = 0;

    const backupRegex = /^backup(\d+)\.json$/i;

    files.forEach((file) => {
      const match = file.match(backupRegex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highestIndex) {
          highestIndex = num;
        }
      }
    });

    const nextIndex = highestIndex + 1;
    return `backup${nextIndex}.json`;
  } catch (error) {
    console.warn('Error reading directory for sequential backup, falling back to backup1.json:', error);
    return 'backup1.json';
  }
};

/**
 * Exports user profile data and writes sequentially as backup1.json, backup2.json...
 */
export const exportUserDataToDrive = async (userId) => {
  if (!userId) {
    Alert.alert('Backup Error', 'User ID is missing. Please make sure you are logged in.');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);

    let userData = {};
    if (snap.exists()) {
      userData = snap.data();
    }

    const nextFileName = await getNextBackupFilename();
    const destinationUri = `${FileSystem.documentDirectory}${nextFileName}`;

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      fileName: nextFileName,
      data: userData,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    await FileSystem.writeAsStringAsync(destinationUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isShareAvailable = await Sharing.isAvailableAsync();
    if (isShareAvailable) {
      await Sharing.shareAsync(destinationUri, {
        mimeType: 'application/json',
        dialogTitle: `Save ${nextFileName} to Google Drive or Files`,
      });
    } else {
      Alert.alert('Backup Created', `Saved locally as ${nextFileName}`);
    }
  } catch (error) {
    console.error('Backup export error:', error);
    Alert.alert('Backup Failed', error.message || 'Unable to complete backup export.');
  }
};

/**
 * Restores data from a selected backup JSON file into Firestore.
 */
export const importUserDataFromFile = async (userId, onSuccess) => {
  if (!userId) {
    Alert.alert('Restore Error', 'User ID is missing. Please log in first.');
    return;
  }

  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return;
    }

    const file = res.assets[0];
    const fileContent = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = JSON.parse(fileContent);

    if (!parsed.data) {
      throw new Error('Unrecognized backup structure. Missing "data" payload.');
    }

    const restorePayload = {
      fullName: parsed.data.fullName || '',
      bio: parsed.data.bio || '',
      dayRate: parsed.data.dayRate || '',
      location: parsed.data.location || '',
      experience: parsed.data.experience || '',
      roles: parsed.data.roles || [],
      equipment: parsed.data.equipment || [],
      credits: parsed.data.credits || [],
      posters: parsed.data.posters || [],
      showreelUrl: parsed.data.showreelUrl || '',
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(doc(db, 'users', userId), restorePayload);
    Alert.alert('Restore Complete', `Restored from ${file.name} successfully.`);
    if (onSuccess) onSuccess();
  } catch (err) {
    console.error('Backup import error:', err);
    Alert.alert('Import Failed', err.message || 'Could not parse or restore backup file.');
  }
};