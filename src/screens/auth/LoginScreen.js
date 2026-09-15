import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
    } catch (error) {
      const code = error?.code || '';
      if (code === 'auth/network-request-failed') {
        Alert.alert(
          'Network Connection Required',
          'An active internet connection is required to sign in. Please check your internet connection and try again.'
        );
      } else if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        Alert.alert('Sign In Notice', 'Invalid email or password. Please check your credentials.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert(
          'Too Many Attempts',
          'Access temporarily disabled due to multiple failed attempts. Please try again later.'
        );
      } else {
        Alert.alert('Login Failed', error.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme?.background || '#0c0d0e' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.logoContainer}>
          {!imageError ? (
            <Image
              // Uses icon.png which exists in assets/ by default
              source={require('../../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.fallbackIconBadge, { backgroundColor: '#181b1f', borderColor: '#242830' }]}>
              <Text style={styles.fallbackIconText}>🎬</Text>
            </View>
          )}

          <Text style={[styles.brandTitle, { color: theme?.text || '#ffffff' }]}>
            FILM<Text style={{ color: theme?.primary || '#f5a623' }}>ROOM</Text>
          </Text>
          <Text style={[styles.brandSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
            Cinema Production Management & Talent Network
          </Text>
        </View>

        {/* Form Inputs */}
        <CustomInput
          label="Email Address"
          placeholder="director@studio.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <CustomInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={[styles.forgotText, { color: theme?.primary || '#f5a623' }]}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        <CustomButton
          title="ENTER STUDIO"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: 10 }}
        />

        <View style={styles.footerRow}>
          <Text style={{ color: theme?.textSecondary || '#9ca3af', fontSize: 13 }}>
            New to FilmRoom?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={{ color: theme?.primary || '#f5a623', fontWeight: 'bold', fontSize: 13 }}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginBottom: 14,
  },
  fallbackIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  fallbackIconText: {
    fontSize: 40,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
