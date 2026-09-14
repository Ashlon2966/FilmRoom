import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { RoomProvider } from './src/context/RoomContext';
import { ToastProvider } from './src/context/ToastContext';
import { ModalProvider } from './src/context/ModalContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RoomProvider>
            <ToastProvider>
              <ModalProvider>
                <StatusBar barStyle="light-content" />
                <RootNavigator />
              </ModalProvider>
            </ToastProvider>
          </RoomProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}