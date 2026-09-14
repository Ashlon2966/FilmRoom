/**
 * FilmRoom Global Custom Modal & Confirmation Dialog System
 * 
 * Replaces native OS Alert popups for consequential user choices:
 * - Save / Cancel
 * - Delete / Keep
 * - Accept / Decline
 * - Remove member / Remove role
 * - Delete room / Leave room
 * - Discard changes / Account deletion
 * - Security verification choices
 * 
 * Built specifically to FilmRoom's Cinema Dark & Studio Light specifications:
 * - High-contrast cinematic dark card (#181b1f) and crisp light card (#ffffff)
 * - Custom icons, destructive styling, safe-area awareness
 * - Support for async loading state on the primary button
 * - Promise-based: const ok = await showConfirm(...) OR callback-based
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const ModalContext = createContext({
  showConfirm: () => Promise.resolve(false),
  hideConfirm: () => {},
});

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export function ModalProvider({ children }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [dialogConfig, setDialogConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const resolverRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const showConfirm = useCallback(
    ({
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDestructive = false,
      icon = null, // e.g. '🗑️', '⚠️', '🚪', '🔒', '✓'
      onConfirm = null,
      onCancel = null,
      allowBackdropDismiss = true,
    }) => {
      return new Promise((resolve) => {
        resolverRef.current = { resolve, onConfirm, onCancel };
        setDialogConfig({
          title,
          message,
          confirmText,
          cancelText,
          isDestructive,
          icon: icon || (isDestructive ? '⚠️' : '🎬'),
          allowBackdropDismiss,
        });
        setIsLoading(false);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 65,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, scaleAnim]
  );

  const hideConfirm = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDialogConfig(null);
      setIsLoading(false);
      resolverRef.current = null;
    });
  }, [fadeAnim, scaleAnim]);

  const handleConfirmPress = async () => {
    if (isLoading) return;

    if (resolverRef.current?.onConfirm) {
      try {
        setIsLoading(true);
        await resolverRef.current.onConfirm();
      } catch (err) {
        console.warn('Confirm action error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (resolverRef.current?.resolve) {
      resolverRef.current.resolve(true);
    }
    hideConfirm();
  };

  const handleCancelPress = () => {
    if (isLoading) return;

    if (resolverRef.current?.onCancel) {
      try {
        resolverRef.current.onCancel();
      } catch (err) {
        console.warn('Cancel action error:', err);
      }
    }

    if (resolverRef.current?.resolve) {
      resolverRef.current.resolve(false);
    }
    hideConfirm();
  };

  return (
    <ModalContext.Provider value={{ showConfirm, hideConfirm }}>
      {children}

      {dialogConfig && (
        <Modal
          transparent
          visible={!!dialogConfig}
          animationType="none"
          onRequestClose={dialogConfig.allowBackdropDismiss ? handleCancelPress : undefined}
        >
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable
              style={styles.backdropPressable}
              onPress={dialogConfig.allowBackdropDismiss ? handleCancelPress : undefined}
            >
              <Animated.View
                style={[
                  styles.card,
                  {
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: theme?.card || (isDark ? '#181b1f' : '#ffffff'),
                    borderColor: dialogConfig.isDestructive
                      ? (isDark ? '#b91c1c66' : '#fca5a5')
                      : (theme?.cardBorder || (isDark ? '#242830' : '#e5e7eb')),
                    marginBottom: Math.max(insets.bottom, 20),
                  },
                ]}
                onStartShouldSetResponder={() => true}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {/* Icon Badge */}
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: dialogConfig.isDestructive
                        ? (isDark ? '#2d1515' : '#fee2e2')
                        : (theme?.surface || (isDark ? '#121417' : '#f3f4f6')),
                      borderColor: dialogConfig.isDestructive
                        ? '#ef444455'
                        : (theme?.primary ? theme.primary + '44' : '#f5a62344'),
                    },
                  ]}
                >
                  <Text style={styles.iconText}>{dialogConfig.icon}</Text>
                </View>

                {/* Title */}
                <Text
                  style={[
                    styles.title,
                    {
                      color: dialogConfig.isDestructive
                        ? (theme?.danger || '#f87171')
                        : (theme?.text || '#ffffff'),
                    },
                  ]}
                  accessibilityRole="header"
                >
                  {dialogConfig.title}
                </Text>

                {/* Description */}
                <Text
                  style={[
                    styles.message,
                    { color: theme?.textSecondary || (isDark ? '#9ca3af' : '#4b5563') },
                  ]}
                >
                  {dialogConfig.message}
                </Text>

                {/* Buttons Row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      {
                        backgroundColor: theme?.surface || (isDark ? '#121417' : '#f3f4f6'),
                        borderColor: theme?.cardBorder || (isDark ? '#242830' : '#e5e7eb'),
                      },
                    ]}
                    onPress={handleCancelPress}
                    disabled={isLoading}
                    activeOpacity={0.7}
                    accessibilityLabel={dialogConfig.cancelText}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.cancelBtnText,
                        { color: theme?.textSecondary || (isDark ? '#9ca3af' : '#4b5563') },
                      ]}
                    >
                      {dialogConfig.cancelText}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      {
                        backgroundColor: dialogConfig.isDestructive
                          ? (theme?.danger || '#f87171')
                          : (theme?.primary || '#f5a623'),
                      },
                    ]}
                    onPress={handleConfirmPress}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    accessibilityLabel={dialogConfig.confirmText}
                    accessibilityRole="button"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text
                        style={[
                          styles.confirmBtnText,
                          {
                            color: dialogConfig.isDestructive ? '#ffffff' : '#000000',
                          },
                        ]}
                      >
                        {dialogConfig.confirmText}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </Modal>
      )}
    </ModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
