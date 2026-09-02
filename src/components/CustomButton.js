import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CustomButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  loading = false,
  disabled = false,
  style,
}) {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return theme?.surface || '#2c2c2e';
    switch (variant) {
      case 'primary':
        return theme?.primary || '#e50914';
      case 'secondary':
        return theme?.surface || '#2c2c2e';
      case 'outline':
        return 'transparent';
      case 'danger':
        return '#b00020';
      default:
        return theme?.primary || '#e50914';
    }
  };

  const getTextColor = () => {
    if (disabled) return theme?.textSecondary || '#777777';
    if (variant === 'outline') return theme?.text || '#ffffff';
    return '#ffffff';
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'outline' ? (theme?.border || '#333333') : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});