import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, getCustomTheme } from '../styles/themes';

const APPEARANCE_STORAGE_KEY = '@filmroom_appearance_settings';

const DEFAULT_SETTINGS = {
  themeMode: 'CINEMA_DARK', // 'CINEMA_DARK' | 'LIGHT' | 'SYSTEM'
  accentColor: 'ORANGE',    // 'ORANGE' | 'BLUE' | 'PURPLE' | 'GREEN'
  textSize: 'STANDARD',     // 'STANDARD' | 'LARGE'
  reduceMotion: false,
};

const ThemeContext = createContext({
  theme: darkTheme,
  isDark: true,
  themeMode: 'CINEMA_DARK',
  accentColor: 'ORANGE',
  textSize: 'STANDARD',
  reduceMotion: false,
  saveAppearanceSettings: async () => {},
  resetAppearanceDefaults: async () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme(); // 'light' | 'dark'

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved appearance preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch (_) {
        // Fallback to default settings
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Determine effective mode based on themeMode & system preference
  const effectiveMode =
    settings.themeMode === 'SYSTEM'
      ? systemColorScheme === 'light'
        ? 'LIGHT'
        : 'CINEMA_DARK'
      : settings.themeMode;

  const isDark = effectiveMode !== 'LIGHT';
  const theme = getCustomTheme(effectiveMode, settings.accentColor);

  // Save new appearance settings and persist to AsyncStorage
  const saveAppearanceSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {
      // Storage error non-critical
    }
  };

  // Reset to original factory defaults (Cinema Dark, Cinema Gold)
  const resetAppearanceDefaults = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await AsyncStorage.removeItem(APPEARANCE_STORAGE_KEY);
    } catch (_) {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        themeMode: settings.themeMode,
        accentColor: settings.accentColor,
        textSize: settings.textSize,
        reduceMotion: settings.reduceMotion,
        saveAppearanceSettings,
        resetAppearanceDefaults,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);