import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function SecurityModal({ visible, onClose, navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  // Delete account verification state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isEmailVerified = currentUser?.emailVerified || false;
  const blockedCount = userProfile?.blockedUids?.length || 0;

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
      Alert.alert('Error', 'No email address associated with this session.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      Alert.alert(
        'Password Reset Email Sent',
        `A secure reset link was dispatched to ${currentUser.email}. Please follow the instructions in the email.`
      );
    } catch (err) {
      Alert.alert('Reset Failed', err.message);
    }
  };

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

      setIsDeleteOpen(false);
      onClose();
      Alert.alert('Deleted', 'Your account and data have been permanently removed.');
    } catch (error) {
      Alert.alert('Deletion Failed', error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>SECURITY CENTER</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Account authentication & credential protection
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Status Checklist Card */}
            <View style={[styles.statusCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.statusItemRow}>
                <View style={styles.statusLabelCol}>
                  <Text style={[styles.statusItemTitle, { color: theme.text }]}>Email Address</Text>
                  <Text style={[styles.statusItemSub, { color: theme.textMuted }]}>{currentUser?.email}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <Text style={[styles.checkMark, { color: isEmailVerified ? theme.success || '#4ade80' : theme.primary }]}>
                    {isEmailVerified ? '✓ Verified' : '● Registered'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statusItemRow}>
                <View style={styles.statusLabelCol}>
                  <Text style={[styles.statusItemTitle, { color: theme.text }]}>Password</Text>
                  <Text style={[styles.statusItemSub, { color: theme.textMuted }]}>Firebase Auth Protected</Text>
                </View>
                <View style={styles.badgeRow}>
                  <Text style={[styles.checkMark, { color: theme.success || '#4ade80' }]}>✓ Protected</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statusItemRow}>
                <View style={styles.statusLabelCol}>
                  <Text style={[styles.statusItemTitle, { color: theme.text }]}>Active Sessions</Text>
                  <Text style={[styles.statusItemSub, { color: theme.textMuted }]}>Current mobile device session</Text>
                </View>
                <Text style={[styles.statusCount, { color: theme.text }]}>1</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statusItemRow}>
                <View style={styles.statusLabelCol}>
                  <Text style={[styles.statusItemTitle, { color: theme.text }]}>Blocked Users</Text>
                  <Text style={[styles.statusItemSub, { color: theme.textMuted }]}>Restricted from contact & calls</Text>
                </View>
                <Text style={[styles.statusCount, { color: theme.text }]}>{blockedCount}</Text>
              </View>
            </View>

            {/* Actions */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>CREDENTIAL ACTIONS</Text>
            <View style={[styles.actionGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <TouchableOpacity style={styles.actionRow} onPress={handleChangePassword} activeOpacity={0.7}>
                <Text style={styles.actionIcon}>🔑</Text>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Change Password</Text>
                  <Text style={[styles.actionSub, { color: theme.textMuted }]}>
                    Send password reset instructions to your email
                  </Text>
                </View>
                <Text style={[styles.actionArrow, { color: theme.primary }]}>→</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  if (blockedCount === 0) {
                    Alert.alert('Blocked Users', 'You have not blocked any filmmakers. You can block any filmmaker from their direct message or profile.');
                  } else {
                    Alert.alert(
                      'Blocked Users',
                      `You currently have ${blockedCount} blocked filmmaker account(s). You can unblock filmmakers directly from their profiles or direct messages.`
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>🚫</Text>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>Blocked Users ({blockedCount})</Text>
                  <Text style={[styles.actionSub, { color: theme.textMuted }]}>
                    Review and unblock filmmaker accounts
                  </Text>
                </View>
                <Text style={[styles.actionArrow, { color: theme.primary }]}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Danger Zone */}
            <Text style={[styles.sectionHeading, { color: theme.danger || '#f87171', marginTop: 20 }]}>
              DANGER ZONE
            </Text>
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: theme.danger || '#f87171' }]}
              onPress={() => setIsDeleteOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.deleteBtnText, { color: theme.danger || '#f87171' }]}>
                Permanently Delete Studio Account
              </Text>
            </TouchableOpacity>

            {/* Delete Account In-Place Verification Modal */}
            <Modal visible={isDeleteOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteOpen(false)}>
              <View style={styles.deleteOverlay}>
                <View style={[styles.deleteCard, { backgroundColor: theme.surface, borderColor: theme.danger || '#f87171' }]}>
                  <Text style={[styles.deleteTitle, { color: theme.danger || '#f87171' }]}>
                    CONFIRM ACCOUNT DELETION
                  </Text>
                  <Text style={[styles.deleteWarning, { color: theme.textSecondary }]}>
                    This permanently removes all productions, slates, and profile data from Firebase.
                  </Text>

                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
                    placeholder={`Type your username: @${userProfile?.username || ''}`}
                    placeholderTextColor={theme.textMuted}
                    value={confirmUsername}
                    onChangeText={setConfirmUsername}
                    autoCapitalize="none"
                  />

                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder, marginTop: 10 }]}
                    placeholder="Enter account password"
                    placeholderTextColor={theme.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />

                  <View style={styles.deleteBtnRow}>
                    <TouchableOpacity
                      style={[styles.cancelDeleteBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => setIsDeleteOpen(false)}
                    >
                      <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmDeleteBtn, { backgroundColor: theme.danger || '#f87171' }]}
                      onPress={handleVerifyBeforeDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={{ color: '#ffffff', fontWeight: '900' }}>Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    paddingBottom: 32,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statusItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  statusLabelCol: {
    flex: 1,
  },
  statusItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeRow: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  actionGroup: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 20,
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  deleteWarning: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  deleteBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelDeleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmDeleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
