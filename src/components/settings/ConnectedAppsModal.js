import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ConnectedAppsModal({ visible, onClose }) {
  const { theme } = useTheme();

  const handleOpenDraftly = async () => {
    const draftlyUrl = 'https://draftly.app';
    const canOpen = await Linking.canOpenURL(draftlyUrl);
    if (canOpen) {
      Linking.openURL(draftlyUrl);
    } else {
      Alert.alert(
        'Draftly Redirection',
        'Draftly is a dedicated screenwriting & production document suite. Full synchronization with FilmRoom will be available in a future update.'
      );
    }
  };

  const handleAddApp = () => {
    Alert.alert(
      'Connected App Ecosystem',
      'Integration API endpoints for lighting control, dailies delivery, and third-party call sheet sync are coming soon.'
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>CONNECTED APPS</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Production suite extensions & external tools
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Active Studio Suite */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>CURRENT PLATFORM</Text>
            <View style={[styles.appCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.appIconBox}>
                <Text style={styles.appIconEmoji}>🎬</Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={[styles.appName, { color: theme.text }]}>FilmRoom Studio</Text>
                <Text style={[styles.appDesc, { color: theme.textMuted }]}>
                  Filmmaker collaboration, crew roster & slate pipeline
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={[styles.activeBadgeText, { color: theme.success || '#4ade80' }]}>✓ Active</Text>
              </View>
            </View>

            {/* Available Ecosystem Integrations */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 20 }]}>
              AVAILABLE INTEGRATIONS
            </Text>

            {/* Draftly Card */}
            <View style={[styles.draftlyCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.draftlyHeaderRow}>
                <View style={styles.appIconBox}>
                  <Text style={styles.appIconEmoji}>✍️</Text>
                </View>
                <View style={styles.appInfo}>
                  <Text style={[styles.appName, { color: theme.text }]}>Draftly</Text>
                  <Text style={[styles.appDesc, { color: theme.textMuted }]}>
                    Screenwriting & production documents
                  </Text>
                </View>
              </View>

              <Text style={[styles.draftlyDetail, { color: theme.textSecondary }]}>
                Draftly handles professional scriptwriting, screenplay revision cycles, and Fountain document formatting.
              </Text>

              <TouchableOpacity
                style={[styles.openDraftlyBtn, { backgroundColor: theme.primary }]}
                onPress={handleOpenDraftly}
                activeOpacity={0.8}
              >
                <Text style={styles.openDraftlyText}>Open Draftly</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Add App Entry Point */}
            <TouchableOpacity
              style={[styles.addAppBtn, { borderColor: theme.cardBorder }]}
              onPress={handleAddApp}
              activeOpacity={0.7}
            >
              <Text style={[styles.addAppText, { color: theme.textSecondary }]}>+ Add App</Text>
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
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  appIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#121417',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconEmoji: {
    fontSize: 20,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
  },
  appDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  draftlyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  draftlyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  draftlyDetail: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  openDraftlyBtn: {
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openDraftlyText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
    marginVertical: 16,
  },
  addAppBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAppText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
