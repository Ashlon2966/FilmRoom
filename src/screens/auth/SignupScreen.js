import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { useTheme } from '../../context/ThemeContext';

export default function SignupScreen({ navigation }) {
  const { theme } = useTheme();
  
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Verifies if the requested username is already taken
  const checkUsernameAvailability = async (requestedUsername) => {
    const q = query(
      collection(db, 'users'),
      where('usernameLower', '==', requestedUsername.toLowerCase())
    );
    const snapshot = await getDocs(q);
    return snapshot.empty; 
  };

  const handleSignup = async () => {
    if (!fullName || !username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    const cleanUsername = username.trim().replace('@', '');

    setIsLoading(true);
    try {
      // 1. Check uniqueness
      const isAvailable = await checkUsernameAvailability(cleanUsername);
      if (!isAvailable) {
        Alert.alert('Username Taken', 'Please choose a different username.');
        setIsLoading(false);
        return;
      }

      // 2. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 3. Save comprehensive profile to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        fullName: fullName.trim(),
        username: cleanUsername,
        usernameLower: cleanUsername.toLowerCase(),
        email: email.trim(),
        bio: '',
        photoURL: null,
        roles: [],
        blockedUsers: [], // Array of UIDs this user has blocked
        isOnboarded: false,
        createdAt: serverTimestamp(),
      });

      // Navigation is typically handled automatically by an Auth listener in RootNavigator
    } catch (error) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>JOIN FILMROOM</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Create your filmmaker identity.
        </Text>

        <CustomInput
          label="Full Name"
          placeholder="e.g., Christopher Nolan"
          value={fullName}
          onChangeText={setFullName}
        />

        <CustomInput
          label="Username"
          placeholder="e.g., chris_nolan"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <CustomInput
          label="Email Address"
          placeholder="name@studio.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <CustomInput
          label="Password"
          placeholder="Min 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <CustomInput
          label="Confirm Password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

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
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
  },
  submitBtn: {
    marginTop: 20,
    marginBottom: 12,
  },
});