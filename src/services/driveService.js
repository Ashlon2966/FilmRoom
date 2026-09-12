import { Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const isValidDriveLink = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
};

export const formatGoogleDriveUrl = (driveUrl) => {
  if (!driveUrl) return '';
  const trimmed = driveUrl.trim();
  const driveFileRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = trimmed.match(driveFileRegex);

  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }

  return trimmed;
};

export const openExternalDriveLink = async (url) => {
  if (!isValidDriveLink(url)) {
    Alert.alert('Invalid Link', 'Please enter a valid web link (e.g. https://drive.google.com/...)');
    return;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open this drive link on this device.');
    }
  } catch (error) {
    Alert.alert('Error Opening Link', error.message);
  }
};

export const viewLocalBase64File = async (fileName, base64Data) => {
  try {
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: 'base64',
    });
    await Sharing.shareAsync(fileUri);
  } catch (error) {
    Alert.alert('File Viewer Error', error.message);
  }
};