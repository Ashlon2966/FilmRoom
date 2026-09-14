import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AboutModal({ visible, onClose }) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const displayName = userProfile?.fullName || currentUser?.displayName || 'Filmmaker';
  const supportPhone = '919766634560';
  const prefilledMessage = `Hi Ashlon, I'm ${displayName}.\nI want to inquire about / ask a question / report an issue with the FilmRoom app.`;
  const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(prefilledMessage)}`;

  const handleContactSupport = async () => {
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${supportPhone}&text=${encodeURIComponent(prefilledMessage)}`);
      }
    } catch (err) {
      showToast({ type: 'error', message: 'Could not open WhatsApp on this device.' });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>ABOUT FILMROOM</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Cinema production & talent collaboration platform
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.brandContainer}>
              <Text style={styles.brandIcon}>🎬</Text>
              <Text style={[styles.brandName, { color: theme.text }]}>
                FILM<Text style={{ color: theme.primary }}>ROOM</Text>
              </Text>
              <Text style={[styles.brandVersion, { color: theme.textSecondary }]}>
                Version 1.0.0 • Expo SDK 54
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              {/* Developer Attribution (Requirement 67) */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.primary }]}>DEVELOPER & CREATIVE ARCHITECT</Text>
                <Text style={[styles.infoValue, { color: theme.text, fontWeight: '800', fontSize: 14 }]}>
                  Ashlon Braganca
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>CORE PURPOSE</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  Connect professional filmmakers, discover crew, establish verified contact requests, and manage production rooms from pre-pro to delivery.
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>ZERO AI ARCHITECTURE</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  FilmRoom contains zero generative AI, zero automated writing, and zero AI assistants. Everything is 100% human-curated and filmmaker-driven.
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>CLOUD & MEDIA INFRASTRUCTURE</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  • Cloud Firestore: Metadata, projects & roster{'\n'}
                  • Cloudinary: Posters, showreels & media storage{'\n'}
                  • Offline Database: Local backup & pending sync
                </Text>
              </View>
            </View>

            {/* Contact Developer & Support (Requirement 67) */}
            <View style={[styles.contactCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.contactTitle, { color: theme.text }]}>
                💬 Contact Developer / FilmRoom Support
              </Text>
              <Text style={[styles.contactSubtitle, { color: theme.textSecondary }]}>
                Direct chat with Ashlon Braganca (+91 9766634560) via WhatsApp with your inquiry prefilled.
              </Text>
              <TouchableOpacity
                style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
                onPress={handleContactSupport}
                activeOpacity={0.85}
              >
                <Text style={styles.whatsappBtnText}>Open WhatsApp (+91 9766634560)</Text>
              </TouchableOpacity>
              <Text style={[styles.whatsappNote, { color: theme.textMuted }]}>
                * WhatsApp will open with your message prefilled. Tap Send in WhatsApp to deliver.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.dismissBtn, { backgroundColor: theme.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Close</Text>
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
    maxHeight: '80%',
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
    paddingBottom: 28,
  },
  brandContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  brandIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandVersion: {
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 12,
  },
  infoRow: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '850',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
    marginVertical: 6,
  },
  dismissBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  dismissBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  contactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  whatsappBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  whatsappNote: {
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
