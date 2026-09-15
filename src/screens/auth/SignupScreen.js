import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../firebaseConfig';
import {
  checkUsernameAvailability,
  reserveUsernameAndCreateUser,
} from '../../services/userService';
import {
  checkEmailAvailability,
  sendSignupVerificationEmail,
  checkSignupVerificationStatus,
  finalizeStagingUser,
  cleanupStagingUser,
  registerEmailReservation,
} from '../../services/authVerificationService';
import {
  validateUsernameFormat,
  validateEmailFormat,
  validatePassword,
} from '../../utils/validation';
import CustomButton from '../../components/CustomButton';
import { useTheme } from '../../context/ThemeContext';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Username State: 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'TAKEN' | 'INVALID' | 'ERROR'
  const [usernameState, setUsernameState] = useState('IDLE');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [checkedUsername, setCheckedUsername] = useState(''); // Stores normalized username that was verified
  const checkRequestIdRef = useRef(0);

  // Password Checklist State
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Submission loading
  const [isLoading, setIsLoading] = useState(false);

  // Colors
  const textColor = theme?.text || '#ffffff';
  const textSecondary = theme?.textSecondary || '#9ca3af';
  const textMuted = theme?.textMuted || '#64748b';
  const cardBg = theme?.surface || theme?.card || '#181b1f';
  const cardBorder = theme?.cardBorder || '#242830';
  const primaryColor = theme?.primary || '#f5a623';
  const successColor = '#22c55e';
  const dangerColor = '#ef4444';

  // --------------------------------------------------------------------------
  // USERNAME LOGIC
  // --------------------------------------------------------------------------

  const handleUsernameChange = (text) => {
    setUsername(text);
    setUsernameState('IDLE');
    setUsernameMessage('');
    setCheckedUsername('');
  };

  const handleCheckUsername = async () => {
    const trimmed = username.trim().replace(/^@+/, '');
    const validation = validateUsernameFormat(trimmed);

    if (!validation.isValid) {
      setUsernameState('INVALID');
      setUsernameMessage(validation.error || 'Invalid username format.');
      return;
    }

    const normalized = validation.normalized;
    const currentReqId = ++checkRequestIdRef.current;

    setUsernameState('CHECKING');
    setUsernameMessage('Checking availability...');

    try {
      const res = await checkUsernameAvailability(trimmed);

      if (currentReqId !== checkRequestIdRef.current) return;

      if (res.available) {
        setUsernameState('AVAILABLE');
        setUsernameMessage('✓ Username available');
        setCheckedUsername(normalized);
      } else if (res.status === 'taken') {
        setUsernameState('TAKEN');
        setUsernameMessage('✕ Username already taken');
        setCheckedUsername('');
      } else if (res.status === 'invalid') {
        setUsernameState('INVALID');
        setUsernameMessage(res.message);
        setCheckedUsername('');
      } else {
        setUsernameState('ERROR');
        setUsernameMessage("⚠ Couldn't check username availability. Please try again.");
        setCheckedUsername('');
      }
    } catch (err) {
      if (currentReqId !== checkRequestIdRef.current) return;
      setUsernameState('ERROR');
      setUsernameMessage("⚠ Couldn't check username availability. Please try again.");
      setCheckedUsername('');
    }
  };

  const isUsernameEmpty = username.trim().length === 0;
  const usernameFormatCheck = validateUsernameFormat(username);
  const isCheckButtonDisabled =
    isUsernameEmpty ||
    !usernameFormatCheck.isValid ||
    usernameState === 'CHECKING' ||
    (usernameState === 'AVAILABLE' && usernameFormatCheck.normalized === checkedUsername);

  // Email State: 'EMPTY' | 'INVALID' | 'CHECKING' | 'ALREADY_REGISTERED' | 'AVAILABLE' | 'SENDING' | 'SENT' | 'VERIFIED'
  const [emailState, setEmailState] = useState('EMPTY');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmailAddress, setVerifiedEmailAddress] = useState('');
  const [stagingUser, setStagingUser] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const emailCheckRequestIdRef = useRef(0);
  const emailCheckTimeoutRef = useRef(null);

  // Auto-check verification status when returning from email link
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && emailState === 'SENT' && stagingUser && !isEmailVerified) {
        handleCheckVerificationStatus();
      }
    });
    return () => subscription.remove();
  }, [emailState, stagingUser, isEmailVerified]);

  // --------------------------------------------------------------------------
  // EMAIL STAGED LOGIC (Format -> Existence Check -> Verify -> Confirmation)
  // --------------------------------------------------------------------------

  const handleEmailChange = (text) => {
    setEmail(text);
    setIsEmailVerified(false);
    setVerifiedEmailAddress('');
    setStagingUser(null);
    if (emailCheckTimeoutRef.current) clearTimeout(emailCheckTimeoutRef.current);
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      setEmailState('EMPTY');
      setEmailMessage('');
      return;
    }

    // STEP 1 — Validate email format first
    const formatValidation = validateEmailFormat(trimmed);
    if (!formatValidation.isValid) {
      // Do not perform account-existence check until email format passes
      setEmailState('INVALID');
      setEmailMessage(emailTouched || trimmed.includes('@') ? '✕ Enter a valid email address' : '');
      return;
    }

    // STEP 2 — Check whether the email already has an account (debounced)
    const currentReqId = ++emailCheckRequestIdRef.current;
    setEmailState('CHECKING');
    setEmailMessage('Checking email availability...');

    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await checkEmailAvailability(trimmed);
        if (currentReqId !== emailCheckRequestIdRef.current) return;

        if (res.available) {
          setEmailState('AVAILABLE');
          setEmailMessage('✓ Email available for registration. Tap Verify.');
        } else if (res.status === 'taken') {
          setEmailState('ALREADY_REGISTERED');
          setEmailMessage('✕ This email is already registered. Please log in.');
        } else if (res.status === 'invalid') {
          setEmailState('INVALID');
          setEmailMessage(res.message);
        } else {
          setEmailState('AVAILABLE');
          setEmailMessage('✓ Ready to verify email.');
        }
      } catch (err) {
        if (currentReqId !== emailCheckRequestIdRef.current) return;
        setEmailState('AVAILABLE');
        setEmailMessage('');
      }
    }, 250);
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      setEmailState('EMPTY');
      setEmailMessage('');
      return;
    }

    const formatValidation = validateEmailFormat(trimmed);
    if (!formatValidation.isValid) {
      setEmailState('INVALID');
      setEmailMessage('✕ Enter a valid email address');
    }
  };

  const handleSendVerificationEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    const formatCheck = validateEmailFormat(trimmed);
    if (!formatCheck.isValid) {
      Alert.alert('Invalid Email', 'Please enter a valid email format before verifying.');
      return;
    }

    if (emailState === 'ALREADY_REGISTERED') {
      Alert.alert(
        'Email Already Registered',
        'This email is already associated with an account. Please log in instead.',
        [
          { text: 'Log In', onPress: () => navigation.navigate('Login') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setEmailState('SENDING');
    try {
      const res = await sendSignupVerificationEmail(trimmed);

      if (res.success) {
        setStagingUser(res.stagingUser);
        setEmailState('SENT');
        setEmailMessage('✓ Verification email sent! Open the link in your email, then tap Check Status.');
        Alert.alert(
          'Verification Email Sent',
          `A verification link has been sent to ${trimmed}. Please click the link in your inbox, then return here and tap "Check Status".`
        );
      } else if (res.code === 'ALREADY_REGISTERED') {
        setEmailState('ALREADY_REGISTERED');
        setEmailMessage('✕ This email is already associated with an account.');
        Alert.alert('Email Already Registered', 'This email already has an account. Please log in.', [
          { text: 'Log In', onPress: () => navigation.navigate('Login') },
          { text: 'Dismiss', style: 'cancel' },
        ]);
      } else {
        setEmailState('AVAILABLE');
        setEmailMessage(`⚠ ${res.message || 'Unable to send verification email.'}`);
        Alert.alert('Notice', res.message || 'Unable to send verification email. Please check your connection.');
      }
    } catch (err) {
      setEmailState('AVAILABLE');
      setEmailMessage('⚠ Failed to send verification email.');
      Alert.alert('Verification Error', err.message || 'Could not send verification email.');
    }
  };

  const handleCheckVerificationStatus = async () => {
    if (!stagingUser) {
      Alert.alert('Notice', 'Please tap "Verify" to send a verification email first.');
      return;
    }

    setIsCheckingStatus(true);
    try {
      const res = await checkSignupVerificationStatus(stagingUser);

      if (res.verified) {
        setIsEmailVerified(true);
        setVerifiedEmailAddress(email.trim().toLowerCase());
        setEmailState('VERIFIED');
        setEmailMessage('✓ Email address verified successfully');
        Alert.alert('Email Verified', 'Your email address has been confirmed!');
      } else {
        Alert.alert(
          'Not Verified Yet',
          'We have not detected the verification confirmation yet. Please make sure you clicked the verification link in your inbox, then try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert('Notice', 'Could not check status: ' + (err.message || 'Please try again.'));
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Determine if email verify button should be disabled
  const isEmailFormatValid = validateEmailFormat(email.trim()).isValid;
  const isVerifyButtonDisabled =
    !isEmailFormatValid ||
    emailState === 'ALREADY_REGISTERED' ||
    emailState === 'CHECKING' ||
    emailState === 'SENDING' ||
    isEmailVerified;

  const passwordValidation = validatePassword(password);
  const isPasswordMismatch =
    confirmPassword.length > 0 && confirmPassword !== password;
  const isPasswordMatch =
    confirmPassword.length > 0 && confirmPassword === password && password.length >= 6;

  // --------------------------------------------------------------------------
  // AUTH ERROR MAPPING
  // --------------------------------------------------------------------------

  const handleAuthError = (error) => {
    const code = error?.code || '';
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[SignupScreen] Firebase Auth error code:', code, error?.message);
    }

    switch (code) {
      case 'auth/email-already-in-use':
        setEmailState('ALREADY_REGISTERED');
        setEmailMessage('✕ This email is already registered. Try signing in instead.');
        Alert.alert(
          'Email Already Registered',
          'This email is already registered with FilmRoom. Try signing in instead.',
          [
            { text: 'Log In', onPress: () => navigation.navigate('Login') },
            { text: 'Dismiss', style: 'cancel' },
          ]
        );
        break;

      case 'auth/invalid-email':
        setEmailState('INVALID');
        setEmailMessage('✕ Enter a valid email address.');
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        break;

      case 'auth/weak-password':
        Alert.alert(
          'Weak Password',
          'Password is too weak. Please ensure it is at least 6 characters and includes letters and numbers.'
        );
        break;

      case 'auth/network-request-failed':
        Alert.alert(
          'Network Error',
          'Could not reach FilmRoom servers. Please check your internet connection and try again.'
        );
        break;

      case 'auth/too-many-requests':
        Alert.alert(
          'Too Many Attempts',
          'Access to this account has been temporarily disabled due to many failed attempts. Please try again later.'
        );
        break;

      default:
        Alert.alert(
          'Account Creation Notice',
          error?.message || 'Unable to create account. Please verify your details and try again.'
        );
        break;
    }
  };

  // --------------------------------------------------------------------------
  // SIGNUP SUBMISSION
  // --------------------------------------------------------------------------

  const handleSignup = async () => {
    const trimmedName = fullName.trim();
    const cleanUsername = username.trim().replace(/^@+/, '');
    const normalizedUsername = cleanUsername.toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Specific required fields check
    if (!trimmedName) {
      Alert.alert('Full Name Required', 'Please enter your full name.');
      return;
    }

    if (!cleanUsername) {
      Alert.alert('Username Required', 'Please choose a username handle.');
      return;
    }

    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please create a password for your account.');
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Confirm Password Required', 'Please confirm your password.');
      return;
    }

    // 2. Email format validation
    const emailCheck = validateEmailFormat(trimmedEmail);
    if (!emailCheck.isValid) {
      setEmailState('INVALID');
      setEmailMessage(emailCheck.error || '✕ Enter a valid email address');
      Alert.alert('Invalid Email', emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    // 3. Email verification requirement (Requirement 1.D)
    if (!isEmailVerified || verifiedEmailAddress !== trimmedEmail) {
      Alert.alert(
        'Email Verification Required',
        'Please verify your email address before creating your account. Tap "Verify" next to the email field, click the confirmation link sent to your inbox, then tap "Check Status".'
      );
      return;
    }

    // 4. Username format validation
    const usernameCheck = validateUsernameFormat(cleanUsername);
    if (!usernameCheck.isValid) {
      setUsernameState('INVALID');
      setUsernameMessage(usernameCheck.error || 'Invalid username format.');
      Alert.alert('Invalid Username', usernameCheck.error || 'Username does not meet requirements.');
      return;
    }

    // 5. Stale / Unchecked Username Verification
    if (usernameState !== 'AVAILABLE' || checkedUsername !== normalizedUsername) {
      Alert.alert(
        'Check Username',
        'Please verify username availability by tapping the "Check" button before creating your account.'
      );
      return;
    }

    // 6. Password checklist verification
    if (!passwordValidation.isValid) {
      Alert.alert('Password Requirement', passwordValidation.error || 'Password must meet all checklist requirements.');
      return;
    }

    // 7. Confirm password match
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // 8. Authoritative final backend check to prevent race condition / client bypass
      const finalAvailability = await checkUsernameAvailability(cleanUsername);
      if (!finalAvailability.available) {
        setUsernameState('TAKEN');
        setUsernameMessage('✕ That username is already taken.');
        setCheckedUsername('');
        Alert.alert('Username Unavailable', 'That username was just claimed by another filmmaker. Please choose a different handle.');
        setIsLoading(false);
        return;
      }

      // 9. Finalize verified staging user into primary session or create credential
      let userCredential;
      if (stagingUser && isEmailVerified) {
        try {
          await finalizeStagingUser(stagingUser, password);
          userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (finalizeErr) {
          console.warn('[SignupScreen] Finalize staging error, creating user directly:', finalizeErr.message);
          try {
            await cleanupStagingUser(stagingUser);
          } catch (_) {}
          try {
            userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          } catch (authErr) {
            handleAuthError(authErr);
            setIsLoading(false);
            return;
          }
        }
      } else {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (authErr) {
          handleAuthError(authErr);
          setIsLoading(false);
          return;
        }
      }

      const user = userCredential.user;

      // 10. Atomically reserve username in /usernames and create profile in /users
      try {
        await reserveUsernameAndCreateUser({
          user,
          fullName: trimmedName,
          username: cleanUsername,
          email: trimmedEmail,
        });
        await registerEmailReservation(trimmedEmail, user.uid);
      } catch (firestoreErr) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[SignupScreen] Firestore reservation error:', firestoreErr);
        }
        Alert.alert(
          'Profile Setup Notice',
          'Your account was created, but initializing your database record encountered an issue. Please sign in to finalize your dossier.'
        );
        setIsLoading(false);
        return;
      }

      // Reactive auth state listener in RootNavigator handles transition to ProfileSetupScreen
    } catch (unexpectedError) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[SignupScreen] Unexpected error during signup:', unexpectedError);
      }
      Alert.alert('Registration Notice', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background || '#0c0d0e' }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: textColor }]}>JOIN FILMROOM</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Create your professional filmmaker identity.
        </Text>

        {/* FULL NAME */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Full Name *</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBg,
                color: textColor,
                borderColor: cardBorder,
              },
            ]}
            placeholder="e.g. Christopher Nolan"
            placeholderTextColor={textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* USERNAME WITH CHECK BUTTON */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Username *</Text>
          <View style={styles.usernameRow}>
            <TextInput
              style={[
                styles.textInput,
                styles.usernameInput,
                {
                  backgroundColor: cardBg,
                  color: textColor,
                  borderColor:
                    usernameState === 'AVAILABLE'
                      ? successColor
                      : usernameState === 'TAKEN' || usernameState === 'INVALID'
                      ? dangerColor
                      : cardBorder,
                },
              ]}
              placeholder="e.g. chris_nolan"
              placeholderTextColor={textMuted}
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Username handle input"
            />

            <TouchableOpacity
              style={[
                styles.checkButton,
                {
                  backgroundColor: isCheckButtonDisabled ? '#242830' : primaryColor,
                  borderColor: cardBorder,
                },
              ]}
              onPress={handleCheckUsername}
              disabled={isCheckButtonDisabled}
              accessibilityLabel="Check username availability"
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              {usernameState === 'CHECKING' ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text
                  style={[
                    styles.checkButtonText,
                    {
                      color: isCheckButtonDisabled ? textMuted : '#000000',
                    },
                  ]}
                >
                  {usernameState === 'AVAILABLE' && usernameFormatCheck.normalized === checkedUsername
                    ? '✓ Verified'
                    : 'Check'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Username Feedback Status */}
          {usernameMessage.length > 0 && (
            <Text
              style={[
                styles.feedbackText,
                {
                  color:
                    usernameState === 'AVAILABLE'
                      ? successColor
                      : usernameState === 'TAKEN' || usernameState === 'INVALID'
                      ? dangerColor
                      : usernameState === 'ERROR'
                      ? '#f59e0b'
                      : textMuted,
                },
              ]}
              accessibilityLiveRegion="polite"
            >
              {usernameMessage}
            </Text>
          )}
        </View>

        {/* EMAIL ADDRESS WITH STAGED VERIFY BUTTON */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Email Address *</Text>
          <View style={styles.usernameRow}>
            <TextInput
              style={[
                styles.textInput,
                styles.usernameInput,
                {
                  backgroundColor: cardBg,
                  color: textColor,
                  borderColor:
                    isEmailVerified
                      ? successColor
                      : emailState === 'AVAILABLE'
                      ? '#3b82f6'
                      : emailState === 'INVALID' || emailState === 'ALREADY_REGISTERED'
                      ? dangerColor
                      : cardBorder,
                },
              ]}
              placeholder="name@studio.com"
              placeholderTextColor={textMuted}
              value={email}
              onChangeText={handleEmailChange}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email address input"
              editable={!isEmailVerified}
            />

            <TouchableOpacity
              style={[
                styles.checkButton,
                {
                  backgroundColor:
                    isEmailVerified
                      ? '#14532d'
                      : isVerifyButtonDisabled && emailState !== 'SENT'
                      ? '#242830'
                      : primaryColor,
                  borderColor: isEmailVerified ? successColor : cardBorder,
                },
              ]}
              onPress={
                isEmailVerified
                  ? undefined
                  : emailState === 'SENT'
                  ? handleCheckVerificationStatus
                  : handleSendVerificationEmail
              }
              disabled={isVerifyButtonDisabled && !isEmailVerified && emailState !== 'SENT'}
              accessibilityLabel="Verify email address"
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              {emailState === 'SENDING' || isCheckingStatus ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text
                  style={[
                    styles.checkButtonText,
                    {
                      color:
                        isEmailVerified
                          ? successColor
                          : isVerifyButtonDisabled && emailState !== 'SENT'
                          ? textMuted
                          : '#000000',
                    },
                  ]}
                >
                  {isEmailVerified
                    ? '✓ Verified'
                    : emailState === 'SENT'
                    ? 'Check Status'
                    : 'Verify'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Email Feedback Status */}
          {emailMessage.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
              <Text
                style={[
                  styles.feedbackText,
                  {
                    marginTop: 0,
                    color:
                      isEmailVerified || emailState === 'AVAILABLE' || emailState === 'SENT'
                        ? successColor
                        : emailState === 'INVALID' || emailState === 'ALREADY_REGISTERED'
                        ? dangerColor
                        : '#f59e0b',
                  },
                ]}
                accessibilityLiveRegion="polite"
              >
                {emailMessage}
              </Text>
              {emailState === 'ALREADY_REGISTERED' && (
                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginLeft: 8 }}>
                  <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 12 }}>
                    Log in
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {emailState === 'SENT' && !isEmailVerified && (
            <TouchableOpacity
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
              onPress={handleSendVerificationEmail}
            >
              <Text style={{ color: primaryColor, fontSize: 11, textDecorationLine: 'underline' }}>
                Resend verification email
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* PASSWORD */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Password *</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBg,
                color: textColor,
                borderColor:
                  password.length > 0
                    ? passwordValidation.isValid
                      ? successColor
                      : cardBorder
                    : cardBorder,
              },
            ]}
            placeholder="Create password"
            placeholderTextColor={textMuted}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="Password input"
          />

          {/* PASSWORD CHECKLIST (appears when characters are inputted) */}
          {password.length > 0 && (
            <View style={[styles.checklistContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.checklistTitle, { color: textSecondary }]}>
                PASSWORD REQUIREMENTS:
              </Text>
              <View style={styles.checklistItem}>
                <Text style={{ color: passwordValidation.hasMinLength ? successColor : textMuted, fontSize: 13, marginRight: 6 }}>
                  {passwordValidation.hasMinLength ? '✓' : '○'}
                </Text>
                <Text style={[styles.checklistText, { color: passwordValidation.hasMinLength ? textColor : textMuted }]}>
                  At least 6 characters
                </Text>
              </View>

              <View style={styles.checklistItem}>
                <Text style={{ color: passwordValidation.hasLetter ? successColor : textMuted, fontSize: 13, marginRight: 6 }}>
                  {passwordValidation.hasLetter ? '✓' : '○'}
                </Text>
                <Text style={[styles.checklistText, { color: passwordValidation.hasLetter ? textColor : textMuted }]}>
                  Contains at least one letter
                </Text>
              </View>

              <View style={styles.checklistItem}>
                <Text style={{ color: passwordValidation.hasNumber ? successColor : textMuted, fontSize: 13, marginRight: 6 }}>
                  {passwordValidation.hasNumber ? '✓' : '○'}
                </Text>
                <Text style={[styles.checklistText, { color: passwordValidation.hasNumber ? textColor : textMuted }]}>
                  Contains at least one number
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* CONFIRM PASSWORD */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Confirm Password *</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBg,
                color: textColor,
                // Turns border red if mismatch, green if matching
                borderColor: isPasswordMismatch
                  ? dangerColor
                  : isPasswordMatch
                  ? successColor
                  : cardBorder,
              },
            ]}
            placeholder="Re-enter password"
            placeholderTextColor={textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            accessibilityLabel="Confirm password input"
          />

          {/* Confirm Password Feedback */}
          {isPasswordMismatch && (
            <Text style={[styles.feedbackText, { color: dangerColor }]}>
              ✕ Passwords do not match
            </Text>
          )}
          {isPasswordMatch && (
            <Text style={[styles.feedbackText, { color: successColor }]}>
              ✓ Passwords match
            </Text>
          )}
        </View>

        <CustomButton
          title="CREATE ACCOUNT"
          onPress={handleSignup}
          loading={isLoading}
          disabled={!isEmailVerified || usernameState !== 'AVAILABLE' || !fullName.trim() || !passwordValidation.isValid || password !== confirmPassword}
          style={[
            styles.submitBtn,
            (!isEmailVerified || usernameState !== 'AVAILABLE' || !fullName.trim() || !passwordValidation.isValid || password !== confirmPassword) && {
              opacity: 0.5,
            },
          ]}
        />

        <CustomButton
          title="Already have an account? Log In"
          variant="outline"
          onPress={() => navigation.navigate('Login')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInput: {
    flex: 1,
  },
  checkButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  checkButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  feedbackText: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
  checklistContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  checklistTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  checklistText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: 16,
    marginBottom: 12,
  },
});