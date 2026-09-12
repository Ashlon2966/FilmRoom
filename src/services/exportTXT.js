import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const exportToTXT = async (fileName, textContent) => {
  try {
    const fileUri = `${FileSystem.documentDirectory}${fileName}_${Date.now()}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, textContent, {
      encoding: 'utf8',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Export ${fileName}`,
        UTI: 'public.plain-text',
      });
    } else {
      Alert.alert('Error', 'Sharing is unavailable on this device.');
    }
  } catch (error) {
    Alert.alert('Export Error', error.message);
  }
};