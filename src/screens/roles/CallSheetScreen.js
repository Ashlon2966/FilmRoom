import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

export default function CallSheetScreen() {
  const { roomData } = useRoom();
  const { theme } = useTheme();

  const [shootDay, setShootDay] = useState('Day 1 of 5');
  const [callTime, setCallTime] = useState('07:00 AM');
  const [location, setLocation] = useState('Stage 4, Pinewood Studios');
  const [hospital, setHospital] = useState('Memorial Hospital (Tel: 911)');

  const handleExportCallSheetPDF = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #111; }
            .header { border-bottom: 3px solid #e50914; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 26px; font-weight: bold; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
            .box { background: #f4f4f4; padding: 14px; border-radius: 6px; }
            .label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; }
            .val { font-size: 16px; font-weight: bold; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${roomData?.title || 'FILMROOM PRODUCTION'}</div>
            <div>OFFICIAL DAILY CALL SHEET</div>
          </div>
          <div class="grid">
            <div class="box"><div class="label">Schedule</div><div class="val">${shootDay}</div></div>
            <div class="box"><div class="label">General Crew Call</div><div class="val">${callTime}</div></div>
            <div class="box"><div class="label">Shooting Location</div><div class="val">${location}</div></div>
            <div class="box"><div class="label">Nearest Emergency Hospital</div><div class="val">${hospital}</div></div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('PDF Export Error', err.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>DAILY CALL SHEET</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>Printable Crew Notice</Text>

      <CustomInput label="Shooting Day" value={shootDay} onChangeText={setShootDay} />
      <CustomInput label="General Call Time" value={callTime} onChangeText={setCallTime} />
      <CustomInput label="Location Address" value={location} onChangeText={setLocation} multiline />
      <CustomInput label="Nearest Emergency Hospital" value={hospital} onChangeText={setHospital} />

      <CustomButton
        title="EXPORT PRINTABLE CALL SHEET (PDF)"
        onPress={handleExportCallSheetPDF}
        style={{ marginTop: 14 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  sub: { fontSize: 12, marginBottom: 16 },
});