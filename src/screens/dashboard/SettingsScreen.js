import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { logout, userProfile, currentUser } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>SETTINGS</Text>

      {/* Account Details */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.name, { color: theme.text }]}>
          {userProfile?.fullName || 'Filmmaker'}
        </Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>
          @{userProfile?.username} • {currentUser?.email}
        </Text>
      </View>

      {/* Theme Toggle */}
      <View style={[styles.rowCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.text }]}>Dark Mode Appearance</Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#777', true: theme.primary }}
          thumbColor="#ffffff"
        />
      </View>

      <CustomButton
        title="SIGN OUT"
        variant="danger"
        onPress={logout}
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18 },
  heading: { fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
  card: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  name: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 12, marginTop: 2 },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: { fontSize: 14, fontWeight: '600' },
});