import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function PostProductionCallModal({ visible, onClose, onPublished }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Sci-Fi / Neo-Noir');
  const [stage, setStage] = useState('Pre-production');
  const [logline, setLogline] = useState('');
  const [dates, setDates] = useState('Dec 1 - Dec 18, 2026');
  const [location, setLocation] = useState('Los Angeles, CA & Location');
  const [compTier, setCompTier] = useState('Paid Union / Scale');
  const [acceptRemote, setAcceptRemote] = useState(false);

  // Dynamic open crew positions
  const [crewPositions, setCrewPositions] = useState([
    {
      role: 'Cinematographer',
      quantity: 1,
      requirement: 'DP skilled in anamorphic lenses and dramatic low-key night exterior lighting.',
    },
    {
      role: 'Sound Designer',
      quantity: 1,
      requirement: 'Audio post specialist for bespoke atmospheric Foley and spatial audio.',
    },
  ]);

  const handleAddRole = () => {
    setCrewPositions((prev) => [
      ...prev,
      { role: 'Editor', quantity: 1, requirement: 'Pacing expert experienced in narrative thrillers.' },
    ]);
  };

  const handleRemoveRole = (index) => {
    setCrewPositions((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!title.trim() || !logline.trim()) {
      Alert.alert('Required Fields', 'Please fill in the project title and story pitch logline.');
      return;
    }

    try {
      await addDoc(collection(db, 'production_calls'), {
        title: title.trim(),
        genre: genre.trim(),
        stage: stage.trim(),
        logline: logline.trim(),
        dates: dates.trim(),
        location: location.trim(),
        compensationTier: compTier.trim(),
        acceptRemote,
        neededRoles: crewPositions.map((p) => p.role),
        crewPositions,
        director: userProfile?.fullName || 'Production Lead',
        createdBy: currentUser?.uid || 'guest',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Published', 'Your production call is now live on The Board!');
      onClose();
      if (onPublished) onPublished();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.modalHeading, { color: theme.text }]}>Post Film Production Call</Text>
              <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                Cast crew members and department heads for your shoot
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Project Title */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>PROJECT TITLE *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="e.g. Apex Drift, The Last Horizon"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Genre & Stage Row */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>GENRE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                  value={genre}
                  onChangeText={setGenre}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>PRODUCTION STAGE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                  value={stage}
                  onChangeText={setStage}
                />
              </View>
            </View>

            {/* Logline Pitch */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>LOGLINE (STORY PITCH) *</Text>
            <TextInput
              style={[styles.inputArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="A one-sentence hook stating the protagonist, conflict, and thematic stakes..."
              placeholderTextColor={theme.textMuted}
              value={logline}
              onChangeText={setLogline}
              multiline
            />

            {/* Dates & Location */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>SHOOT DATES / WINDOW</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                  value={dates}
                  onChangeText={setDates}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>LOCATION</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            {/* Remote Applications Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAcceptRemote(!acceptRemote)}
            >
              <View style={[styles.checkbox, acceptRemote && { backgroundColor: theme.primary }]}>
                {acceptRemote && <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.textSecondary }]}>
                Remote applications accepted (for post-production, composers, colorists)
              </Text>
            </TouchableOpacity>

            {/* Open Crew Positions Section */}
            <View style={styles.crewHeaderRow}>
              <Text style={[styles.crewTitle, { color: theme.text }]}>
                OPEN CREW POSITIONS ({crewPositions.length})
              </Text>
              <TouchableOpacity style={styles.addRoleBtn} onPress={handleAddRole}>
                <Text style={[styles.addRoleText, { color: theme.text }]}>+ Add Role</Text>
              </TouchableOpacity>
            </View>

            {crewPositions.map((pos, idx) => (
              <View key={idx} style={[styles.roleCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <View style={styles.roleCardTop}>
                  <Text style={[styles.roleNameText, { color: theme.primary }]}>{pos.role}</Text>
                  <Text style={[styles.qtyText, { color: theme.textSecondary }]}>Qty: {pos.quantity}</Text>
                  <TouchableOpacity onPress={() => handleRemoveRole(idx)}>
                    <Text style={{ color: theme.textMuted }}>🗑</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.reqText, { color: theme.textSecondary }]}>{pos.requirement}</Text>
              </View>
            ))}

            {/* Modal Bottom Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.publishBtn, { backgroundColor: theme.primary }]} onPress={handlePublish}>
                <Text style={styles.publishBtnText}>✔ Publish Crew Call to Board</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { height: '94%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 18 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  modalHeading: { fontSize: 18, fontWeight: '900' },
  modalSub: { fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 4 },
  label: { fontSize: 10, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: { borderRadius: 6, borderWidth: 1, padding: 10, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  inputArea: { borderRadius: 6, borderWidth: 1, padding: 10, fontSize: 13, height: 70, textAlignVertical: 'top' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#555', justifyContent: 'center', alignItems: 'center' },
  checkboxLabel: { fontSize: 11, flex: 1 },
  crewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  crewTitle: { fontSize: 12, fontWeight: '800' },
  addRoleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#444' },
  addRoleText: { fontSize: 11, fontWeight: '700' },
  roleCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  roleCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roleNameText: { fontSize: 13, fontWeight: '800' },
  qtyText: { fontSize: 11 },
  reqText: { fontSize: 12, fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 24 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  publishBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 6 },
  publishBtnText: { color: '#000000', fontSize: 13, fontWeight: '900' },
});