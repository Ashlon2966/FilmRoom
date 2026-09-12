import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const exportTakesToXLSX = async (fileName, dataArray) => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(dataArray);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Production_Data');

    const base64Content = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileUri = `${FileSystem.documentDirectory}${fileName}_${Date.now()}.xlsx`;

    await FileSystem.writeAsStringAsync(fileUri, base64Content, {
      encoding: 'base64',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Export ${fileName}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      Alert.alert('Error', 'Native sharing is not available.');
    }
  } catch (error) {
    Alert.alert('Excel Export Error', error.message);
  }
};