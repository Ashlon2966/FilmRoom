import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { isValidDriveLink, formatGoogleDriveUrl } from '../services/driveService';

export default function DriveLinkModal({ visible, title = 'Attach Cloud Drive Link', onClose, onSaveLink }) {
  const { theme } = useTheme();
  const [driveUrl, setDriveUrl] = useState('');
  const [label, setLabel] = useState('');

  const handleSave = () => {
    if (!isValidDriveLink(driveUrl)) {
      Alert.alert('Invalid URL', 'Please enter a complete URL starting with https://');
      return;
    }

    const formattedUrl = formatGoogleDriveUrl(driveUrl);
    onSaveLink({
      url: formattedUrl,
      label: label.trim() || 'Google Drive / Cloud Asset',
      attachedAt: new Date().toISOString(),
    });

    setDriveUrl('');
    setLabel('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.heading, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>
            Link files hosted on your personal Google Drive, Dropbox, or Frame.io.
          </Text>

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>LINK LABEL / DESCRIPTION</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="e.g. Master Script PDF (Google Drive)"
            placeholderTextColor={theme.textMuted}
            value={label}
            onChangeText={setLabel}
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SHAREABLE DRIVE URL</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
            placeholder="https://drive.google.com/file/d/..."
            placeholderTextColor={theme.textMuted}
            value={driveUrl}
            onChangeText={setDriveUrl}
            autoCapitalize="none"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Attach Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  heading: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  subheading: { fontSize: 12, marginTop: 4, marginBottom: 16 },
  inputLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginTop: 10 },
  input: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6 },
  saveBtnText: { color: '#000000', fontWeight: '900', fontSize: 13 },
});