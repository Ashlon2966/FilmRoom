import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { resetPassword } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your account email.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      Alert.alert('Check Your Email', 'Password reset instructions have been sent.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      Alert.alert('Reset Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>RECOVER ACCESS</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Enter your registered email to receive reset instructions.
      </Text>

      <CustomInput
        label="Account Email"
        placeholder="writer@studio.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <CustomButton
        title="SEND RESET LINK"
        onPress={handleReset}
        loading={loading}
        style={{ marginTop: 14, marginBottom: 12 }}
      />

      <CustomButton
        title="Back to Login"
        variant="outline"
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 24 },
});