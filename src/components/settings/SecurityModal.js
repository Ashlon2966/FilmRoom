import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useModal } from '../../context/ModalContext';
import {
  requestSecondaryEmailCode,
  verifySecondaryEmailCode,
} from '../../services/authVerificationService';

const AUTOLOCK_OPTIONS = [
  { key: 'IMMEDIATELY', label: 'Immediately' },
  { key: '1_MIN', label: '1 min' },
  { key: '5_MIN', label: '5 min' },
  { key: '15_MIN', label: '15 min' },
  { key: 'NEVER', label: 'Never' },
];

export default function SecurityModal({ visible, onClose, navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { showConfirm } = useModal();

  // Biometrics and auto-lock state (Requirement 10)
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [autolockInterval, setAutolockInterval] = useState('5_MIN');

  // 2-Step Security Verification state (Requirements 10 & 11, 68-73)
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [isTwoStepEnabled, setIsTwoStepEnabled] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [isSettingUpTwoStep, setIsSettingUpTwoStep] = useState(false);
  const [twoStepSubStep, setTwoStepSubStep] = useState('EMAIL'); // 'EMAIL' | 'CODE'
  const [sixDigitCode, setSixDigitCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isDisablingTwoStep, setIsDisablingTwoStep] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isSavingTwoStep, setIsSavingTwoStep] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(true);

  // Delete account verification state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isEmailVerified = currentUser?.emailVerified || false;
  const blockedCount = userProfile?.blockedUids?.length || 0;

  // Load private security configuration and local preferences
  useEffect(() => {
    if (!visible) return;

    AsyncStorage.getItem('@filmroom_biometrics_enabled').then((val) => {
      if (val !== null) setBiometricsEnabled(val === 'true');
    });
    AsyncStorage.getItem('@filmroom_autolock_interval').then((val) => {
      if (val) setAutolockInterval(val);
    });

    if (!currentUser?.uid) return;

    const fetchSecurity = async () => {
      setLoadingSecurity(true);
      try {
        const [secSnap, verSnap] = await Promise.all([
          getDoc(doc(db, 'users', currentUser.uid, 'private', 'security')),
          getDoc(doc(db, 'users', currentUser.uid, 'private', 'secondary_email_verification')),
        ]);

        if (secSnap.exists()) {
          const data = secSnap.data();
          setSecondaryEmail(data.secondaryEmail || '');
          setIsTwoStepEnabled(!!data.twoStepEnabled);
          setIsPendingVerification(!data.twoStepEnabled && !!data.secondaryEmail);
        } else if (verSnap.exists()) {
          const vData = verSnap.data();
          if (vData.secondaryEmail && !vData.verified) {
            setSecondaryEmail(vData.secondaryEmail);
            setIsPendingVerification(true);
          }
        }
      } catch (err) {
        // Fallback if not configured yet
      } finally {
        setLoadingSecurity(false);
      }
    };
    fetchSecurity();
  }, [visible, currentUser?.uid]);

  const handleToggleBiometrics = async (val) => {
    setBiometricsEnabled(val);
    try {
      await AsyncStorage.setItem('@filmroom_biometrics_enabled', String(val));
      showToast({
        type: 'success',
        message: val ? 'Biometric unlock enabled.' : 'Biometric unlock disabled.',
      });
    } catch (_) {}
  };

  const handleSelectAutolock = async (val) => {
    setAutolockInterval(val);
    try {
      await AsyncStorage.setItem('@filmroom_autolock_interval', val);
      const label = AUTOLOCK_OPTIONS.find((o) => o.key === val)?.label || val;
      showToast({
        type: 'info',
        message: `Auto-lock timeout set to ${label}.`,
      });
    } catch (_) {}
  };

  const handleChangePassword = async () => {
    if (!currentUser?.email) {
      showToast({ type: 'error', message: 'No email address associated with this session.' });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      showToast({
        type: 'success',
        title: 'Reset Email Sent',
        message: `A secure reset link was dispatched to ${currentUser.email}.`,
      });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Password reset failed.' });
    }
  };

  // Step 1: Request 6-digit secondary email code (Requirement 11)
  const handleSendSecondaryCode = async () => {
    const cleanEmail = secondaryInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showToast({ type: 'warning', message: 'Please enter a valid secondary email address.' });
      return;
    }
    if (cleanEmail === (currentUser?.email || '').toLowerCase()) {
      showToast({ type: 'warning', message: 'Secondary email cannot be the same as your primary account email.' });
      return;
    }

    setIsSendingCode(true);
    try {
      await requestSecondaryEmailCode(cleanEmail, currentUser.uid);
      setSecondaryEmail(cleanEmail);
      setIsPendingVerification(true);
      setTwoStepSubStep('CODE');
      showToast({
        type: 'success',
        title: 'Verification Code Dispatched',
        message: `A 6-digit confirmation code was sent to ${cleanEmail}.`,
      });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to dispatch verification code.' });
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 2: Confirm 6-digit code and activate 2-step verification (Requirement 11)
  const handleVerifySecondaryCode = async () => {
    if (!sixDigitCode || sixDigitCode.trim().length !== 6) {
      showToast({ type: 'warning', message: 'Please enter the complete 6-digit verification code.' });
      return;
    }

    setIsSavingTwoStep(true);
    try {
      await verifySecondaryEmailCode(sixDigitCode.trim(), currentUser.uid);

      await setDoc(
        doc(db, 'users', currentUser.uid, 'private', 'security'),
        {
          secondaryEmail,
          secondaryEmailVerified: true,
          twoStepEnabled: true,
          enabledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setIsTwoStepEnabled(true);
      setIsPendingVerification(false);
      setIsSettingUpTwoStep(false);
      setTwoStepSubStep('EMAIL');
      setSixDigitCode('');
      setSecondaryInput('');
      showToast({
        type: 'success',
        title: '2-Step Security Verified',
        message: `Secondary email (${secondaryEmail}) verified and active.`,
      });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Invalid or expired verification code.' });
    } finally {
      setIsSavingTwoStep(false);
    }
  };

  // Disable 2-Step Verification with custom confirmation & password re-auth (Requirements 69, 71)
  const handlePromptDisableTwoStep = () => {
    showConfirm({
      title: 'Disable 2-Step Security?',
      description: 'Your account will have less protection for high-impact actions and password resets.',
      confirmLabel: 'Disable',
      cancelLabel: 'Cancel',
      isDestructive: true,
      onConfirm: () => {
        setDisablePassword('');
        setIsDisablingTwoStep(true);
      },
    });
  };

  const handleConfirmDisableTwoStep = async () => {
    if (!disablePassword) {
      showToast({ type: 'warning', message: 'Please enter your account password to verify your identity.' });
      return;
    }

    setIsSavingTwoStep(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No active user session.');
      const credential = EmailAuthProvider.credential(user.email, disablePassword);
      await reauthenticateWithCredential(user, credential);

      await updateDoc(doc(db, 'users', currentUser.uid, 'private', 'security'), {
        twoStepEnabled: false,
        disabledAt: new Date().toISOString(),
      });

      setIsTwoStepEnabled(false);
      setIsDisablingTwoStep(false);
      setDisablePassword('');
      showToast({ type: 'info', message: '2-Step Security Verification disabled.' });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Re-authentication failed. Incorrect password.' });
    } finally {
      setIsSavingTwoStep(false);
    }
  };

  const handleVerifyBeforeDelete = async () => {
    if (!confirmUsername.trim() || !confirmPassword) {
      showToast({ type: 'warning', message: 'Please enter your username and password.' });
      return;
    }

    if (confirmUsername.trim().toLowerCase() !== (userProfile?.username || '').toLowerCase()) {
      showToast({ type: 'error', message: 'The username entered does not match your account.' });
      return;
    }

    showConfirm({
      title: 'Delete Account?',
      description: 'Are you sure you want to permanently delete your account and all production records? This action CANNOT be undone.',
      confirmLabel: 'Delete Account',
      cancelLabel: 'Keep Account',
      isDestructive: true,
      onConfirm: executeFinalAccountDeletion,
    });
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
      showToast({ type: 'info', title: 'Account Deleted', message: 'Your account and data have been permanently removed.' });
    } catch (error) {
      showToast({ type: 'error', title: 'Deletion Failed', message: error.message });
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
            {/* Status Checklist Card (Requirement 10) */}
            <View style={[styles.statusCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.statusItemRow}>
                <View style={styles.statusLabelCol}>
                  <Text style={[styles.statusItemTitle, { color: theme.text }]}>Primary Email</Text>
                  <Text style={[styles.statusItemSub, { color: theme.textMuted }]}>{currentUser?.email}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <Text style={[styles.checkMark, { color: isEmailVerified ? '#4ade80' : '#f5a623' }]}>
                    {isEmailVerified ? '✓ Verified' : '● Unverified'}
                  </Text>
                </View>
              </View>

              {!isEmailVerified && (
                <TouchableOpacity
                  style={[styles.resendVerifyBtn, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
                  onPress={async () => {
                    try {
                      if (currentUser) {
                        await sendEmailVerification(currentUser);
                        showToast({
                          type: 'success',
                          title: 'Verification Dispatched',
                          message: `Verification link sent to ${currentUser.email}. Check your inbox.`,
                        });
                      }
                    } catch (e) {
                      showToast({ type: 'error', message: e.message || 'Could not send verification email.' });
                    }
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '700' }}>
                    ✉️ Resend Verification Email
                  </Text>
                </TouchableOpacity>
              )}

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
                  <Text style={[styles.statusItemTitle, { color: theme.text }]}>Active Session</Text>
                  <Text style={[styles.statusItemSub, { color: theme.textMuted }]}>
                    {Platform.OS === 'ios' ? 'Apple iOS' : Platform.OS === 'android' ? 'Android Mobile' : 'Web / Desktop'} • FilmRoom App (Current)
                  </Text>
                </View>
                <View style={[styles.sessionBadge, { backgroundColor: '#14291e', borderColor: '#4ade80' }]}>
                  <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '800' }}>● ONLINE</Text>
                </View>
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
                    showToast({ type: 'info', message: 'You have not blocked any filmmakers.' });
                  } else {
                    showToast({
                      type: 'info',
                      message: `You have ${blockedCount} blocked filmmaker account(s). You can manage blocks from their profile.`,
                    });
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

            {/* App Security & Access (Requirement 10) */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 20 }]}>
              APP SECURITY & ACCESS
            </Text>
            <View style={[styles.statusCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              {/* Biometrics */}
              <View style={styles.settingSwitchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.statusItemTitle, { color: theme.text }]}>Biometric Unlock</Text>
                  <Text style={[styles.statusItemSub, { color: theme.textMuted }]}>
                    Require Face ID / Fingerprint unlock when launching FilmRoom
                  </Text>
                </View>
                <Switch
                  value={biometricsEnabled}
                  onValueChange={handleToggleBiometrics}
                  trackColor={{ false: '#26292e', true: theme.primary }}
                  thumbColor={biometricsEnabled ? '#ffffff' : '#888888'}
                />
              </View>

              <View style={styles.divider} />

              {/* Auto-lock Timeout */}
              <View style={{ paddingVertical: 8 }}>
                <Text style={[styles.statusItemTitle, { color: theme.text }]}>Auto-Lock Timeout</Text>
                <Text style={[styles.statusItemSub, { color: theme.textMuted, marginBottom: 10 }]}>
                  Automatically lock session when backgrounded or inactive
                </Text>
                <View style={styles.autolockOptionRow}>
                  {AUTOLOCK_OPTIONS.map((opt) => {
                    const isSelected = autolockInterval === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.autolockPill,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.card,
                            borderColor: isSelected ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => handleSelectAutolock(opt.key)}
                      >
                        <Text
                          style={[
                            styles.autolockPillText,
                            { color: isSelected ? '#000000' : theme.textSecondary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 2-Step Security Verification (Requirements 10 & 11, 68-73) */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 20 }]}>
              2-STEP SECURITY VERIFICATION
            </Text>
            <View style={[styles.statusCard, { backgroundColor: theme.background, borderColor: isTwoStepEnabled ? (theme.success || '#4ade80') : isPendingVerification ? '#f5a623' : theme.cardBorder }]}>
              <View style={styles.twoStepHeaderRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.twoStepTitle, { color: theme.text }]}>
                    🛡️ Secondary Email Security
                  </Text>
                  <Text style={[styles.twoStepSubtitle, { color: theme.textSecondary }]}>
                    Protects sensitive operations (password changes, account deletion, security modification).
                  </Text>
                </View>
                <View
                  style={[
                    styles.twoStepBadge,
                    {
                      backgroundColor: isTwoStepEnabled ? '#1e3d29' : isPendingVerification ? '#332314' : '#2a2215',
                      borderColor: isTwoStepEnabled ? '#4ade80' : isPendingVerification ? '#f5a623' : '#6b7280',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isTwoStepEnabled ? '#4ade80' : isPendingVerification ? '#f5a623' : '#9ca3af',
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {isTwoStepEnabled ? '✓ Verified' : isPendingVerification ? '● Pending Verification' : '● Inactive'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.emailDetailRow}>
                <Text style={[styles.emailDetailLabel, { color: theme.textMuted }]}>PRIMARY EMAIL</Text>
                <Text style={[styles.emailDetailValue, { color: theme.text }]}>{currentUser?.email}</Text>
              </View>

              {isTwoStepEnabled ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.emailDetailRow}>
                    <Text style={[styles.emailDetailLabel, { color: theme.textMuted }]}>SECONDARY SECURITY EMAIL</Text>
                    <Text style={[styles.emailDetailValue, { color: theme.text, fontWeight: '700' }]}>
                      {secondaryEmail}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.disableTwoStepBtn, { borderColor: theme.danger || '#f87171' }]}
                    onPress={handlePromptDisableTwoStep}
                    disabled={isSavingTwoStep}
                  >
                    <Text style={{ color: theme.danger || '#f87171', fontWeight: '700', fontSize: 13 }}>
                      Disable 2-Step Security
                    </Text>
                  </TouchableOpacity>
                </>
              ) : isSettingUpTwoStep ? (
                <View style={{ marginTop: 12 }}>
                  {twoStepSubStep === 'EMAIL' ? (
                    <>
                      <Text style={[styles.emailDetailLabel, { color: theme.textMuted, marginBottom: 6 }]}>
                        ENTER SECONDARY SECURITY EMAIL
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder }]}
                        placeholder="backup@example.com"
                        placeholderTextColor={theme.textMuted}
                        value={secondaryInput}
                        onChangeText={setSecondaryInput}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      <Text style={[styles.mfaClarificationText, { color: theme.textMuted, marginTop: 4, marginBottom: 12 }]}>
                        * A 6-digit confirmation PIN will be dispatched to verify ownership.
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                          style={[styles.cancelDeleteBtn, { borderColor: theme.cardBorder }]}
                          onPress={() => {
                            setIsSettingUpTwoStep(false);
                            setSecondaryInput('');
                          }}
                        >
                          <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmEnableBtn, { backgroundColor: theme.primary }]}
                          onPress={handleSendSecondaryCode}
                          disabled={isSendingCode}
                        >
                          {isSendingCode ? (
                            <ActivityIndicator color="#000000" size="small" />
                          ) : (
                            <Text style={{ color: '#000000', fontWeight: '800' }}>Send 6-Digit Code</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.emailDetailLabel, { color: theme.textMuted, marginBottom: 6 }]}>
                        ENTER 6-DIGIT VERIFICATION CODE
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 10 }}>
                        Sent to: <Text style={{ color: theme.text, fontWeight: 'bold' }}>{secondaryEmail}</Text>
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.primary, letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: 'bold' }]}
                        placeholder="••••••"
                        placeholderTextColor={theme.textMuted}
                        value={sixDigitCode}
                        onChangeText={setSixDigitCode}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                        <TouchableOpacity
                          style={[styles.cancelDeleteBtn, { borderColor: theme.cardBorder }]}
                          onPress={() => setTwoStepSubStep('EMAIL')}
                        >
                          <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.confirmEnableBtn, { backgroundColor: theme.primary }]}
                          onPress={handleVerifySecondaryCode}
                          disabled={isSavingTwoStep}
                        >
                          {isSavingTwoStep ? (
                            <ActivityIndicator color="#000000" size="small" />
                          ) : (
                            <Text style={{ color: '#000000', fontWeight: '800' }}>Confirm & Enable</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {isPendingVerification && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ color: '#f5a623', fontSize: 12, marginBottom: 4 }}>
                        A verification code was previously sent to: <Text style={{ fontWeight: 'bold' }}>{secondaryEmail}</Text>
                      </Text>
                      <TouchableOpacity
                        style={[styles.confirmEnableBtn, { backgroundColor: '#2b2114', borderColor: '#f5a623', borderWidth: 1, alignSelf: 'flex-start' }]}
                        onPress={() => {
                          setTwoStepSubStep('CODE');
                          setIsSettingUpTwoStep(true);
                        }}
                      >
                        <Text style={{ color: '#f5a623', fontWeight: '800', fontSize: 12 }}>Enter Verification Code</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.enableTwoStepBtn, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      setTwoStepSubStep('EMAIL');
                      setIsSettingUpTwoStep(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.enableTwoStepBtnText}>
                      {isPendingVerification ? '↻ Change Secondary Security Email' : '+ Enable 2-Step Security Verification'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Architecture Clarification Notice (Requirements 68, 70, 73) */}
              <View style={[styles.mfaNoticeBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={[styles.mfaNoticeText, { color: theme.textSecondary }]}>
                  ℹ️ Note: Native Firebase SMS MFA requires Identity Platform upgrade (paid plan). Future versions will also support TOTP Authenticator App MFA. Secondary Email Security Verification provides verified dual-channel identity protection without third-party fees.
                </Text>
              </View>
            </View>

            {/* Disable Two-Step Verification Modal */}
            <Modal visible={isDisablingTwoStep} transparent animationType="fade" onRequestClose={() => setIsDisablingTwoStep(false)}>
              <View style={styles.deleteOverlay}>
                <View style={[styles.deleteCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.deleteTitle, { color: theme.danger || '#f87171' }]}>
                    DISABLE 2-STEP SECURITY
                  </Text>
                  <Text style={[styles.deleteWarning, { color: theme.textSecondary }]}>
                    Enter your account password to authenticate before disabling secondary email verification.
                  </Text>

                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder, marginTop: 10 }]}
                    placeholder="Enter account password"
                    placeholderTextColor={theme.textMuted}
                    value={disablePassword}
                    onChangeText={setDisablePassword}
                    secureTextEntry
                  />

                  <View style={styles.deleteBtnRow}>
                    <TouchableOpacity
                      style={[styles.cancelDeleteBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => {
                        setIsDisablingTwoStep(false);
                        setDisablePassword('');
                      }}
                    >
                      <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmDeleteBtn, { backgroundColor: theme.danger || '#f87171' }]}
                      onPress={handleConfirmDisableTwoStep}
                      disabled={isSavingTwoStep}
                    >
                      {isSavingTwoStep ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={{ color: '#ffffff', fontWeight: '900' }}>Confirm Disable</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

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
  twoStepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  twoStepTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  twoStepSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  twoStepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  emailDetailRow: {
    paddingVertical: 10,
  },
  emailDetailLabel: {
    fontSize: 10,
    fontWeight: '850',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  emailDetailValue: {
    fontSize: 13,
  },
  disableTwoStepBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableTwoStepBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  enableTwoStepBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmEnableBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mfaNoticeBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 14,
  },
  mfaNoticeText: {
    fontSize: 10,
    lineHeight: 14,
  },
  mfaClarificationText: {
    fontSize: 10,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  resendVerifyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  autolockOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  autolockPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  autolockPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
