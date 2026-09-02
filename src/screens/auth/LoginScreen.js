import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Info', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme?.background || '#121212' }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme?.text || '#ffffff' }]}>FILMROOM</Text>
        <Text style={[styles.subtitle, { color: theme?.textSecondary || '#888888' }]}>
          Collaborative studio for filmmakers
        </Text>

        <CustomInput
          label="Email"
          placeholder="director@studio.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <CustomInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <CustomButton
          title="LOG IN"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: 10, marginBottom: 12 }}
        />

        <CustomButton
          title="Forgot Password?"
          variant="outline"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={{ marginBottom: 12 }}
        />

        <CustomButton
          title="Create New Account"
          variant="secondary"
          onPress={() => navigation.navigate('Signup')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 30 },
});