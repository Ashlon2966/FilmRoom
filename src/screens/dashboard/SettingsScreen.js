import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { exportUserDataToDrive, importUserDataFromFile } from '../../services/backupService';
import BackButton from '../../components/BackButton';

export default function SettingsScreen({ navigation }) {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme } = useTheme();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleVerifyBeforeDelete = async () => {
    if (!confirmUsername.trim() || !confirmPassword) {
      Alert.alert('Required', 'Please enter your username and password.');
      return;
    }

    if (confirmUsername.trim().toLowerCase() !== (userProfile?.username || '').toLowerCase()) {
      Alert.alert('Mismatch', 'The username entered does not match your account.');
      return;
    }

    Alert.alert(
      'Permanent Deletion',
      'Are you sure you want to permanently delete your account and all production records? This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete Everything',
          style: 'destructive',
          onPress: executeFinalAccountDeletion,
        },
      ]
    );
  };

  const executeFinalAccountDeletion = async () => {
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No active user session.');

      const credential = EmailAuthProvider.credential(user.email, confirmPassword);
      await reauthenticateWithCredential(user, credential);

      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);

      setIsDeleteModalVisible(false);
      Alert.alert('Deleted', 'Your account and data have been permanently removed.');
    } catch (error) {
      Alert.alert('Deletion Failed', error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme?.background || '#0c0d0e' }]} contentContainerStyle={styles.content}>
      {/* Top Header Bar with Top-Left Back Button */}
      <View style={styles.topHeader}>
        <BackButton />
        <Text style={[styles.heading, { color: theme?.text || '#ffffff' }]}>STUDIO SETTINGS</Text>
      </View>

      {/* Account Info */}
      <View style={[styles.card, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>LOGGED IN AS</Text>
        <Text style={[styles.cardValue, { color: theme?.primary || '#f5a623' }]}>{userProfile?.fullName || 'Filmmaker'}</Text>
        <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af' }]}>
          @{userProfile?.username} • {currentUser?.email}
        </Text>
      </View>

      {/* Data Backup & Google Drive Sync */}
      <View style={[styles.card, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>DATA BACKUP & RECOVERY</Text>
        <Text style={[styles.cardSub, { color: theme?.textSecondary || '#9ca3af', marginBottom: 12 }]}>
          Sync your credits, gear lists, and profile data to Google Drive or local storage as JSON.
        </Text>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
          onPress={() => exportUserDataToDrive(currentUser?.uid)}
        >
          <Text style={styles.actionBtnText}>☁ Save / Sync to Google Drive (JSON)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: theme?.cardBorder || '#242830', marginTop: 8 }]}
          onPress={() => importUserDataFromFile(currentUser?.uid)}
        >
          <Text style={[styles.outlineBtnText, { color: theme?.text || '#ffffff' }]}>📥 Import / Restore Backup File</Text>
        </TouchableOpacity>
      </View>

      {/* Session & Danger Zone */}
      <View style={[styles.card, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
        <Text style={[styles.cardTitle, { color: theme?.text || '#ffffff' }]}>SESSION</Text>
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme?.surface || '#121417' }]} onPress={logout}>
          <Text style={{ color: theme?.text || '#ffffff', fontWeight: 'bold' }}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.dangerDivider} />

        <Text style={[styles.dangerLabel, { color: '#f87171' }]}>DANGER ZONE</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setIsDeleteModalVisible(true)}
        >
          <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Delete Verification Modal */}
      <Modal visible={isDeleteModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme?.card || '#181b1f', borderColor: '#ef4444' }]}>
            <View style={styles.modalHeaderRow}>
              <BackButton isClose={true} onPress={() => setIsDeleteModalVisible(false)} />
              <Text style={[styles.modalHeading, { color: '#ef4444' }]}>DELETE VERIFICATION</Text>
            </View>

            <Text style={[styles.modalSub, { color: theme?.textSecondary || '#9ca3af' }]}>
              Please verify your username and password before deleting.
            </Text>

            <Text style={[styles.inputLabel, { color: theme?.textSecondary || '#9ca3af' }]}>CONFIRM USERNAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme?.surface || '#121417', color: theme?.text || '#ffffff', borderColor: theme?.cardBorder || '#242830' }]}
              placeholder={`Enter "${userProfile?.username}"`}
              placeholderTextColor={theme?.textMuted || '#64748b'}
              value={confirmUsername}
              onChangeText={setConfirmUsername}
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: theme?.textSecondary || '#9ca3af' }]}>PASSWORD</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme?.surface || '#121417', color: theme?.text || '#ffffff', borderColor: theme?.cardBorder || '#242830' }]}
              placeholder="••••••••"
              placeholderTextColor={theme?.textMuted || '#64748b'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={{ color: theme?.textSecondary || '#9ca3af', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleVerifyBeforeDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Verify & Proceed</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 44, paddingBottom: 60 },
  topHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  heading: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  card: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  cardValue: { fontSize: 18, fontWeight: '900' },
  cardSub: { fontSize: 12, marginTop: 2 },
  actionBtn: { paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  actionBtnText: { color: '#000000', fontWeight: '900', fontSize: 13 },
  outlineBtn: { paddingVertical: 12, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  outlineBtnText: { fontWeight: '700', fontSize: 13 },
  logoutBtn: { paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  dangerDivider: { height: 1, backgroundColor: '#242830', marginVertical: 16 },
  dangerLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  deleteBtn: { backgroundColor: '#2d1515', borderWidth: 1, borderColor: '#7f1d1d', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  deleteBtnText: { color: '#f87171', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 12, borderWidth: 1, padding: 20 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalHeading: { fontSize: 16, fontWeight: '900', letterSpacing: 0.8 },
  modalSub: { fontSize: 12, marginBottom: 14 },
  inputLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  input: { borderRadius: 6, borderWidth: 1, padding: 10, fontSize: 13 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  cancelBtn: { padding: 10 },
  confirmDeleteBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  confirmDeleteText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});