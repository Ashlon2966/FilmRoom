import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CreateActionSheetModal({
  visible,
  onClose,
  onCreateRoom,
  onAddFriends,
  onPostAchievement,
}) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner sheet stops click propagation so tapping the sheet itself doesn't close it */}
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme?.card || '#181b1f',
              borderColor: theme?.cardBorder || '#242830',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.heading, { color: theme?.text || '#ffffff' }]}>
            CREATE & CONNECT
          </Text>
          <Text style={[styles.subheading, { color: theme?.textSecondary || '#9ca3af' }]}>
            What would you like to initiate?
          </Text>

          {/* Option 1: Create Production Room */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: theme?.surface || '#121417',
                borderColor: theme?.cardBorder || '#242830',
              },
            ]}
            onPress={() => {
              onClose();
              setTimeout(() => onCreateRoom(), 150);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>🎬</Text>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: theme?.text || '#ffffff' }]}>
                Create Production Room
              </Text>
              <Text style={[styles.optionDesc, { color: theme?.textSecondary || '#9ca3af' }]}>
                Start a digital slate, script breakdown, and production pipeline.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Connect With Filmmakers */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: theme?.surface || '#121417',
                borderColor: theme?.cardBorder || '#242830',
              },
            ]}
            onPress={() => {
              onClose();
              setTimeout(() => onAddFriends(), 150);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>🤝</Text>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: theme?.text || '#ffffff' }]}>
                Connect With Filmmakers
              </Text>
              <Text style={[styles.optionDesc, { color: theme?.textSecondary || '#9ca3af' }]}>
                Search filmmakers by @username and start conversations.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 3: Add Skills / Gear Package */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: theme?.surface || '#121417',
                borderColor: theme?.cardBorder || '#242830',
              },
            ]}
            onPress={() => {
              onClose();
              setTimeout(() => onPostAchievement(), 150);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>⭐</Text>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: theme?.text || '#ffffff' }]}>
                Add Skills / Gear Package
              </Text>
              <Text style={[styles.optionDesc, { color: theme?.textSecondary || '#9ca3af' }]}>
                Update your profile with new credits, festival laurels, or gear.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: theme?.surface || '#121417' }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: theme?.text || '#ffffff' }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  heading: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  subheading: { fontSize: 12, marginTop: 2, marginBottom: 16 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  icon: { fontSize: 24, marginRight: 14 },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: 'bold' },
  optionDesc: { fontSize: 11, marginTop: 2 },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelText: { fontSize: 13, fontWeight: '700' },
});