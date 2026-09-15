import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { currentUser, userProfile, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme?.background || '#0c0d0e' }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 84, height: 84, borderRadius: 18, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text style={[styles.splashTitle, { color: theme?.text || '#ffffff' }]}>
          FILM<Text style={{ color: theme?.primary || '#f5a623' }}>ROOM</Text>
        </Text>
        <ActivityIndicator size="small" color={theme?.primary || '#f5a623'} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!currentUser ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !userProfile?.isOnboarded ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          <Stack.Screen name="AppNavigator" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
});