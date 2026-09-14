import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../firebaseConfig';
import {
  checkUsernameAvailability,
  reserveUsernameAndCreateUser,
} from '../../services/userService';
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

  // Email State: 'EMPTY' | 'INVALID' | 'VALID' | 'ALREADY_REGISTERED' | 'CHECK_ERROR'
  const [emailState, setEmailState] = useState('EMPTY');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

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
    // Invalidate previous check immediately upon text change
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

      // Race-condition protection: Ignore if a newer check was initiated
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

  // Determine if check button should be enabled
  const isUsernameEmpty = username.trim().length === 0;
  const usernameFormatCheck = validateUsernameFormat(username);
  const isCheckButtonDisabled =
    isUsernameEmpty ||
    !usernameFormatCheck.isValid ||
    usernameState === 'CHECKING' ||
    (usernameState === 'AVAILABLE' && usernameFormatCheck.normalized === checkedUsername);

  // --------------------------------------------------------------------------
  // EMAIL LOGIC
  // --------------------------------------------------------------------------

  const handleEmailChange = (text) => {
    setEmail(text);
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      setEmailState('EMPTY');
      setEmailMessage('');
      return;
    }

    // Live format validation while typing
    const validation = validateEmailFormat(trimmed);
    if (validation.isValid) {
      setEmailState('VALID');
      setEmailMessage('✓ Valid email format');
    } else {
      // If user has already focused/blurred or typed an '@', show formatting guidance
      if (emailTouched || trimmed.includes('@')) {
        setEmailState('INVALID');
        setEmailMessage('✕ Enter a valid email address');
      } else {
        setEmailState('EMPTY');
        setEmailMessage('');
      }
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      setEmailState('EMPTY');
      setEmailMessage('');
      return;
    }

    const validation = validateEmailFormat(trimmed);
    if (validation.isValid) {
      setEmailState('VALID');
      setEmailMessage('✓ Valid email format');
    } else {
      setEmailState('INVALID');
      setEmailMessage('✕ Enter a valid email address');
    }
  };

  // --------------------------------------------------------------------------
  // PASSWORD LOGIC
  // --------------------------------------------------------------------------

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

    // 1. Basic required fields check
    if (!trimmedName || !cleanUsername || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Incomplete Fields', 'Please complete all required fields.');
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

    // 3. Username format validation
    const usernameCheck = validateUsernameFormat(cleanUsername);
    if (!usernameCheck.isValid) {
      setUsernameState('INVALID');
      setUsernameMessage(usernameCheck.error || 'Invalid username format.');
      Alert.alert('Invalid Username', usernameCheck.error || 'Username does not meet requirements.');
      return;
    }

    // 4. Stale / Unchecked Username Verification
    if (usernameState !== 'AVAILABLE' || checkedUsername !== normalizedUsername) {
      Alert.alert(
        'Check Username',
        'Please verify username availability by tapping the "Check" button before creating your account.'
      );
      return;
    }

    // 5. Password checklist verification
    if (!passwordValidation.isValid) {
      Alert.alert('Password Requirement', passwordValidation.error || 'Password must meet all checklist requirements.');
      return;
    }

    // 6. Confirm password match
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // 7. Authoritative final backend check to prevent race condition / client bypass
      const finalAvailability = await checkUsernameAvailability(cleanUsername);
      if (!finalAvailability.available) {
        setUsernameState('TAKEN');
        setUsernameMessage('✕ That username is already taken.');
        setCheckedUsername('');
        Alert.alert('Username Unavailable', 'That username was just claimed by another filmmaker. Please choose a different handle.');
        setIsLoading(false);
        return;
      }

      // 8. Create Firebase Auth credential
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (authErr) {
        handleAuthError(authErr);
        setIsLoading(false);
        return;
      }

      const user = userCredential.user;

      // 9. Atomically reserve username in /usernames and create profile in /users
      try {
        await reserveUsernameAndCreateUser({
          user,
          fullName: trimmedName,
          username: cleanUsername,
          email: trimmedEmail,
        });
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

        {/* EMAIL ADDRESS */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textSecondary }]}>Email Address *</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBg,
                color: textColor,
                borderColor:
                  emailState === 'VALID'
                    ? successColor
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
          />

          {/* Email Feedback Status */}
          {emailMessage.length > 0 && (
            <Text
              style={[
                styles.feedbackText,
                {
                  color:
                    emailState === 'VALID'
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
          style={styles.submitBtn}
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