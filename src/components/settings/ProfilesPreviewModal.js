import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ProfilesPreviewModal({ visible, onClose }) {
  const { userProfile } = useAuth();
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>PROFILES & MODES</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Multi-profile architecture & identity slots
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Active Primary Profile */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>PRIMARY IDENTITY</Text>
            <View style={[styles.profileCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.profileHeaderRow}>
                <View style={styles.badgeBox}>
                  <Text style={styles.badgeEmoji}>🎬</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileName, { color: theme.text }]}>
                    {userProfile?.fullName || 'Primary Profile'}
                  </Text>
                  <Text style={[styles.profileRole, { color: theme.primary }]}>
                    {userProfile?.role || 'Director / Filmmaker'}
                  </Text>
                </View>
                <View style={[styles.activePill, { backgroundColor: theme.surface, borderColor: theme.success || '#4ade80' }]}>
                  <Text style={[styles.activePillText, { color: theme.success || '#4ade80' }]}>Active</Text>
                </View>
              </View>
              <Text style={[styles.profileDesc, { color: theme.textMuted }]}>
                Main verified industry identity with published credits, equipment list, and direct representation.
              </Text>
            </View>

            {/* Upcoming Alternate Identity Slot */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 20 }]}>
              ALTERNATE IDENTITY (UPCOMING)
            </Text>
            <View style={[styles.plannedCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.profileHeaderRow}>
                <View style={[styles.badgeBox, { backgroundColor: '#121417' }]}>
                  <Text style={styles.badgeEmoji}>🎭</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileName, { color: theme.text }]}>Alternate / Alias Identity</Text>
                  <Text style={[styles.profileRole, { color: theme.textMuted }]}>Separate Role & Portfolio</Text>
                </View>
                <View style={[styles.lockedPill, { borderColor: theme.cardBorder }]}>
                  <Text style={[styles.lockedPillText, { color: theme.textMuted }]}>In Design</Text>
                </View>
              </View>

              <Text style={[styles.plannedDesc, { color: theme.textSecondary }]}>
                Architecture under design: Will allow switching between acting, crew, or pseudonymous producing roles without creating duplicate Firebase accounts or compromising verified credentials.
              </Text>

              <View style={styles.featureList}>
                <Text style={[styles.featureItem, { color: theme.textMuted }]}>• Profile-specific portfolio & showreel</Text>
                <Text style={[styles.featureItem, { color: theme.textMuted }]}>• Profile-specific visibility & availability</Text>
                <Text style={[styles.featureItem, { color: theme.textMuted }]}>• Single verified account (zero fake auth)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.closeModalBtnText, { color: theme.text }]}>Dismiss</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    paddingBottom: 32,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#181b1f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeEmoji: {
    fontSize: 20,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  profileDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  plannedCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  lockedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  lockedPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  plannedDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  featureList: {
    gap: 4,
  },
  featureItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  closeModalBtn: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
