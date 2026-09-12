import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BackButton from '../../components/BackButton';

// Modular Settings Category Components
import CloudSyncModal from '../../components/settings/CloudSyncModal';
import StorageDataModal from '../../components/settings/StorageDataModal';
import ImportExportModal from '../../components/settings/ImportExportModal';
import AppearanceModal from '../../components/settings/AppearanceModal';
import PrivacyModal from '../../components/settings/PrivacyModal';
import NotificationsModal from '../../components/settings/NotificationsModal';
import SecurityModal from '../../components/settings/SecurityModal';
import ConnectedAppsModal from '../../components/settings/ConnectedAppsModal';
import ProfilesPreviewModal from '../../components/settings/ProfilesPreviewModal';
import AboutModal from '../../components/settings/AboutModal';

export default function SettingsScreen({ navigation }) {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme } = useTheme();

  // Active Category Modal state
  const [activeModal, setActiveModal] = useState(null); // 'CLOUD_SYNC' | 'STORAGE' | 'IMPORT_EXPORT' | 'APPEARANCE' | 'NOTIFICATIONS' | 'PRIVACY' | 'SECURITY' | 'CONNECTED_APPS' | 'PROFILES' | 'ABOUT'

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to end your FilmRoom session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            Alert.alert('Sign Out Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Pinned Top Bar */}
      <View style={[styles.topHeader, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
        <BackButton />
        <Text style={[styles.heading, { color: theme.text }]}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Identity Banner */}
        <View style={[styles.userBanner, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.avatarBadge, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
            <Text style={[styles.avatarInitial, { color: theme.primary }]}>
              {userProfile?.fullName ? userProfile.fullName[0].toUpperCase() : 'F'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {userProfile?.fullName || 'Filmmaker'}
            </Text>
            <Text style={[styles.userRole, { color: theme.primary }]}>
              {userProfile?.role || 'Director / Production'}
            </Text>
            <Text style={[styles.userMeta, { color: theme.textMuted }]}>
              @{userProfile?.username || 'crew'} • {currentUser?.email}
            </Text>
          </View>
        </View>

        {/* ── 1. ACCOUNT CATEGORY ── */}
        <Text style={[styles.categoryHeader, { color: theme.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('ProfileMain')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>👤</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Profile & Identity</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Manage your professional identity & credits
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('PROFILES')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🎭</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Profiles</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Manage profile modes & alternate identities
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. DATA & SYNC CATEGORY ── */}
        <Text style={[styles.categoryHeader, { color: theme.textSecondary }]}>DATA & SYNC</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('CLOUD_SYNC')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>☁</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Cloud Sync</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Firebase synchronization & status
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('IMPORT_EXPORT')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>📦</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Import & Export</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Move FilmRoom data & project packages
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('STORAGE')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>💾</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Storage & Data</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Local offline working layer & Cloudinary media
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. APPEARANCE & PREFERENCES ── */}
        <Text style={[styles.categoryHeader, { color: theme.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('APPEARANCE')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🎨</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Appearance</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Cinema Dark theme & accessibility
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('NOTIFICATIONS')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🔔</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Notifications</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Alerts, production calls & Quiet Hours
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. PRIVACY & SECURITY ── */}
        <Text style={[styles.categoryHeader, { color: theme.textSecondary }]}>PRIVACY & SECURITY</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('PRIVACY')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🔒</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Privacy</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Profile and contact information visibility
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('SECURITY')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🛡</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Security</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Password protection & account security
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── 5. INTEGRATIONS ── */}
        <Text style={[styles.categoryHeader, { color: theme.textSecondary }]}>INTEGRATIONS</Text>
        <View style={[styles.sectionGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('CONNECTED_APPS')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🔗</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Connected Apps</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                FilmRoom extensions (Draftly screenwriting link)
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── 6. ABOUT ── */}
        <View style={[styles.sectionGroup, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 14 }]}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setActiveModal('ABOUT')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>ℹ️</Text>
            <View style={styles.itemTextCol}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>About FilmRoom</Text>
              <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                Version 1.0.0 • Zero AI • FilmRoom Architecture
              </Text>
            </View>
            <Text style={[styles.itemArrow, { color: theme.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={[styles.logoutButton, { borderColor: theme.cardBorder }]} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: theme.danger || '#f87171' }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── MODALS ── */}
      <CloudSyncModal visible={activeModal === 'CLOUD_SYNC'} onClose={() => setActiveModal(null)} />
      <StorageDataModal visible={activeModal === 'STORAGE'} onClose={() => setActiveModal(null)} />
      <ImportExportModal visible={activeModal === 'IMPORT_EXPORT'} onClose={() => setActiveModal(null)} />
      <AppearanceModal visible={activeModal === 'APPEARANCE'} onClose={() => setActiveModal(null)} />
      <PrivacyModal visible={activeModal === 'PRIVACY'} onClose={() => setActiveModal(null)} navigation={navigation} />
      <NotificationsModal visible={activeModal === 'NOTIFICATIONS'} onClose={() => setActiveModal(null)} />
      <SecurityModal visible={activeModal === 'SECURITY'} onClose={() => setActiveModal(null)} navigation={navigation} />
      <ConnectedAppsModal visible={activeModal === 'CONNECTED_APPS'} onClose={() => setActiveModal(null)} />
      <ProfilesPreviewModal visible={activeModal === 'PROFILES'} onClose={() => setActiveModal(null)} />
      <AboutModal visible={activeModal === 'ABOUT'} onClose={() => setActiveModal(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  heading: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
  },
  userRole: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  userMeta: {
    fontSize: 11,
    marginTop: 3,
  },
  categoryHeader: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  itemArrow: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
    marginLeft: 50,
  },
  logoutButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});