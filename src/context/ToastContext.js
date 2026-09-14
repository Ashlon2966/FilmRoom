/**
 * FilmRoom Global Toast / Notification Bubble System
 * 
 * Provides transient, non-blocking visual feedback for successes, errors, warnings, and info.
 * Designed with FilmRoom Cinema Dark & Studio Light aesthetics:
 * - Positioned bottom-center with safe area awareness
 * - Keyboard-aware positioning so toasts remain visible above virtual keyboards
 * - Smooth native fade & upward translation animations
 * - Auto-dismiss with clean timer teardown
 * - Tap to dismiss immediately
 * - Single-bubble policy to eliminate screen-covering toast stacks
 * - Full accessibility compliance (accessibilityRole="alert", screen reader announcements)
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const ToastContext = createContext({
  showToast: () => {},
  hideToast: () => {},
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Visual configurations per toast type
const TOAST_TYPES = {
  success: {
    icon: '✓',
    darkColor: '#4ade80',
    darkBorder: '#22c55e44',
    darkBg: '#181b1f',
    lightColor: '#16a34a',
    lightBorder: '#86efac',
    lightBg: '#f0fdf4',
    defaultTitle: 'Success',
  },
  error: {
    icon: '✕',
    darkColor: '#f87171',
    darkBorder: '#ef444444',
    darkBg: '#181b1f',
    lightColor: '#dc2626',
    lightBorder: '#fca5a5',
    lightBg: '#fef2f2',
    defaultTitle: 'Error',
  },
  warning: {
    icon: '⚠',
    darkColor: '#f5a623',
    darkBorder: '#f5a62344',
    darkBg: '#181b1f',
    lightColor: '#d97706',
    lightBorder: '#fde68a',
    lightBg: '#fffbeb',
    defaultTitle: 'Notice',
  },
  info: {
    icon: 'ⓘ',
    darkColor: '#60a5fa',
    darkBorder: '#3b82f644',
    darkBg: '#181b1f',
    lightColor: '#2563eb',
    lightBorder: '#93c5fd',
    lightBg: '#eff6ff',
    defaultTitle: 'Info',
  },
};

export function ToastProvider({ children }) {
  const { theme, isDark = true } = useTheme() || {};
  const insets = useSafeAreaInsets();

  const [toastData, setToastData] = useState(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Animation values
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;
  const timerRef = useRef(null);

  // Listen to keyboard show / hide
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardOffset(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardOffset(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastData(null);
    });
  }, [opacityAnim, translateYAnim]);

  const showToast = useCallback(
    (optionsOrMessage, fallbackType = 'success') => {
      // Clear existing auto-dismiss timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      let payload = {};
      if (typeof optionsOrMessage === 'string') {
        payload = {
          message: optionsOrMessage,
          type: fallbackType,
          duration: 3000,
        };
      } else if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null) {
        payload = {
          type: optionsOrMessage.type || 'success',
          title: optionsOrMessage.title || null,
          message: optionsOrMessage.message || '',
          duration: optionsOrMessage.duration !== undefined ? optionsOrMessage.duration : 3000,
        };
      } else {
        return;
      }

      // Normalise type
      if (!TOAST_TYPES[payload.type]) {
        payload.type = 'info';
      }

      setToastData(payload);

      // Reset animation positions
      opacityAnim.setValue(0);
      translateYAnim.setValue(16);

      // Entrance animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Schedule auto-dismiss
      const duration = payload.duration > 0 ? payload.duration : 3000;
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, opacityAnim, translateYAnim]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Compute safe bottom positioning:
  // Base offset accounts for bottom navigation tab bar (~60px) + device safe area insets
  // If keyboard is open, lifts above the keyboard
  const bottomPosition = keyboardOffset > 0
    ? keyboardOffset + 16
    : Math.max(insets.bottom, 12) + 68;

  const currentTypeConfig = toastData ? TOAST_TYPES[toastData.type] || TOAST_TYPES.info : null;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {toastData && currentTypeConfig && (
        <View
          style={[styles.toastContainer, { bottom: bottomPosition }]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.toastBubble,
              {
                opacity: opacityAnim,
                transform: [{ translateY: translateYAnim }],
                backgroundColor: isDark
                  ? currentTypeConfig.darkBg
                  : currentTypeConfig.lightBg,
                borderColor: isDark
                  ? currentTypeConfig.darkBorder
                  : currentTypeConfig.lightBorder,
              },
            ]}
          >
            <Pressable
              onPress={hideToast}
              style={styles.pressableContent}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`${toastData.title || currentTypeConfig.defaultTitle}: ${toastData.message}`}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark
                      ? (currentTypeConfig.darkColor + '18')
                      : (currentTypeConfig.lightColor + '20'),
                    borderColor: isDark
                      ? currentTypeConfig.darkBorder
                      : currentTypeConfig.lightBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.iconText,
                    {
                      color: isDark
                        ? currentTypeConfig.darkColor
                        : currentTypeConfig.lightColor,
                    },
                  ]}
                >
                  {currentTypeConfig.icon}
                </Text>
              </View>

              <View style={styles.textColumn}>
                {toastData.title ? (
                  <Text
                    style={[
                      styles.toastTitle,
                      { color: isDark ? '#ffffff' : '#0f172a' },
                    ]}
                    numberOfLines={1}
                  >
                    {toastData.title}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.toastMessage,
                    {
                      color: isDark
                        ? (toastData.title ? '#9ca3af' : '#ffffff')
                        : (toastData.title ? '#475569' : '#0f172a'),
                      fontSize: toastData.title ? 12 : 13,
                    },
                  ]}
                >
                  {toastData.message}
                </Text>
              </View>

              <Text style={[styles.dismissX, { color: isDark ? '#6b7280' : '#94a3b8' }]}>
                ✕
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  toastBubble: {
    maxWidth: 420,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  pressableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 46,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 12,
    fontWeight: '900',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  toastMessage: {
    fontWeight: '600',
    lineHeight: 17,
  },
  dismissX: {
    fontSize: 11,
    fontWeight: '700',
    paddingLeft: 4,
    paddingRight: 2,
  },
});
