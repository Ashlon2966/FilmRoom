/**
 * FilmRoom Custom Action Drop-Up / Sheet Component
 * 
 * Provides a cinematic, non-native bottom drop-up menu for contextual actions
 * such as the Requests '+' FAB options, action pickers, and multi-option flows.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function CustomActionDropUp({
  visible,
  title,
  subtitle,
  actions = [], // [{ label, icon, subtitle, description, isDestructive, onPress, id }]
  onSelect,
  onClose,
}) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <Animated.View
            style={[
              styles.sheetCard,
              {
                transform: [{ translateY: slideAnim }],
                backgroundColor: theme?.card || (isDark ? '#181b1f' : '#ffffff'),
                borderColor: theme?.cardBorder || (isDark ? '#242830' : '#e5e7eb'),
                paddingBottom: Math.max(insets.bottom + 12, 24),
              },
            ]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <View style={[styles.handleBar, { backgroundColor: theme?.cardBorder || (isDark ? '#2b303c' : '#d1d5db') }]} />

            {/* Header */}
            {title && (
              <View style={styles.headerBox}>
                <Text style={[styles.sheetTitle, { color: theme?.text || '#ffffff' }]}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={[styles.sheetSubtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Action Items */}
            <View style={styles.actionsList}>
              {actions.map((act, index) => {
                const isDestructive = !!act.isDestructive;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionItem,
                      {
                        backgroundColor: theme?.surface || (isDark ? '#121417' : '#f9fafb'),
                        borderColor: theme?.cardBorder || (isDark ? '#242830' : '#e5e7eb'),
                      },
                    ]}
                    onPress={() => {
                      onClose?.();
                      if (typeof act.onPress === 'function') {
                        act.onPress();
                      }
                      if (typeof onSelect === 'function') {
                        onSelect(act);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {act.icon && (
                      <View
                        style={[
                          styles.actionIconBox,
                          {
                            backgroundColor: isDestructive
                              ? (isDark ? '#2d1515' : '#fee2e2')
                              : (theme?.card || (isDark ? '#181b1f' : '#ffffff')),
                            borderColor: isDestructive
                              ? '#ef444444'
                              : (theme?.primary ? theme.primary + '33' : '#f5a62333'),
                          },
                        ]}
                      >
                        <Text style={styles.actionIconText}>{act.icon}</Text>
                      </View>
                    )}

                    <View style={styles.actionTextBox}>
                      <Text
                        style={[
                          styles.actionLabel,
                          {
                            color: isDestructive
                              ? (theme?.danger || '#f87171')
                              : (theme?.text || '#ffffff'),
                          },
                        ]}
                      >
                        {act.label}
                      </Text>
                      {(act.subtitle || act.description) ? (
                        <Text style={[styles.actionSub, { color: theme?.textSecondary || '#9ca3af' }]}>
                          {act.subtitle || act.description}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={{ color: theme?.textMuted || '#64748b', fontSize: 16 }}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: theme?.surface || (isDark ? '#121417' : '#f3f4f6'),
                  borderColor: theme?.cardBorder || (isDark ? '#242830' : '#e5e7eb'),
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: theme?.textSecondary || '#9ca3af' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  handleBar: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerBox: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  actionsList: {
    gap: 10,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIconText: {
    fontSize: 18,
  },
  actionTextBox: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
