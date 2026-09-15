import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

const PRIVACY_STORAGE_KEY = '@filmroom_privacy_settings';

const VISIBILITY_MODES = [
  { key: 'PUBLIC', label: 'Public Discovery', desc: 'Visible in Explore directory to all verified filmmakers' },
  { key: 'CONNECTIONS', label: 'Connections Only', desc: 'Visible only to accepted contacts and team members' },
  { key: 'PRIVATE', label: 'Private (Direct Code Only)', desc: 'Searchable solely via your 10-character FilmRoom Code' },
];

const THREE_TIER_OPTIONS = [
  { key: 'PUBLIC', label: 'Public' },
  { key: 'CONNECTIONS', label: 'Connections' },
  { key: 'PRIVATE', label: 'Private' },
];

const MESSAGING_PERMISSIONS = [
  { key: 'ANYONE', label: 'Anyone on FilmRoom', desc: 'Any verified filmmaker can initiate an inquiry or DM' },
  { key: 'CONNECTIONS_ONLY', label: 'Connections Only', desc: 'Only approved connections can message you' },
  { key: 'NOBODY', label: 'Nobody (Disabled)', desc: 'Direct inquiries and requests disabled' },
];

const DEFAULT_PRIVACY = {
  publicProfile: true, // Master Explore switch (Requirement 9)
  visibility: 'PUBLIC', // 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE'
  showreelVisibility: 'PUBLIC', // 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE' (Requirement 9)
  gearKitVisibility: 'PUBLIC', // 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE' (Requirement 9)
  messagingPermissions: 'ANYONE', // 'ANYONE' | 'CONNECTIONS_ONLY' | 'NOBODY' (Requirement 9)
  hidePhone: true,
  hideEmail: true,
  allowInquiries: true,
  allowConnections: true,
  showAvailability: true,
  showLocation: true,
  showProjects: true,
  showPortfolio: true,
};

export default function PrivacyModal({ visible, onClose, navigation }) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [savedSettings, setSavedSettings] = useState(DEFAULT_PRIVACY);
  const [draftSettings, setDraftSettings] = useState(DEFAULT_PRIVACY);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(PRIVACY_STORAGE_KEY).then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setSavedSettings((prev) => ({ ...prev, ...parsed }));
            setDraftSettings((prev) => ({ ...prev, ...parsed }));
          } catch (_) {}
        } else if (userProfile?.privacySettings) {
          setSavedSettings((prev) => ({ ...prev, ...userProfile.privacySettings }));
          setDraftSettings((prev) => ({ ...prev, ...userProfile.privacySettings }));
        }
      });
    }
  }, [visible, userProfile?.privacySettings]);

  const updateDraft = (key, value) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSavedSettings(draftSettings);
    try {
      await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(draftSettings));
    } catch (_) {}

    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          privacySettings: draftSettings,
          publicProfile: draftSettings.publicProfile,
          visibility: draftSettings.visibility,
          showreelVisibility: draftSettings.showreelVisibility,
          gearKitVisibility: draftSettings.gearKitVisibility,
          messagingPermissions: draftSettings.messagingPermissions,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Privacy cloud save notice:', err.message);
      }
    }

    showToast({
      type: 'success',
      title: 'Privacy Updated',
      message: 'Profile visibility, messaging, and asset privacy settings saved.',
    });
    onClose();
  };

  const handleCancel = () => {
    setDraftSettings(savedSettings);
    onClose();
  };

  const handleRestoreDefaults = () => {
    setDraftSettings(DEFAULT_PRIVACY);
    showToast({ type: 'info', message: 'Privacy settings reset to factory defaults.' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>PRIVACY CONTROLS</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Identity, contact protection & visibility
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* 1. PUBLIC PROFILE MASTER SWITCH */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>EXPLORE DIRECTORY VISIBILITY</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Public Profile</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    When ON, you appear in Explore directory. When OFF, you are hidden from search.
                  </Text>
                </View>
                <Switch
                  value={draftSettings.publicProfile}
                  onValueChange={(v) => updateDraft('publicProfile', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              {VISIBILITY_MODES.map((mode, index) => {
                const isSelected = draftSettings.visibility === mode.key;
                return (
                  <View key={mode.key}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.radioRow}
                      onPress={() => updateDraft('visibility', mode.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, { borderColor: isSelected ? theme.primary : theme.textMuted }]}>
                        {isSelected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                      </View>
                      <View style={styles.radioInfo}>
                        <Text style={[styles.radioLabel, { color: theme.text }]}>{mode.label}</Text>
                        <Text style={[styles.radioDesc, { color: theme.textMuted }]}>{mode.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* 2. ASSET VISIBILITY (SHOWREEL & GEAR KIT) */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>
              ASSET & PORTFOLIO PRIVACY
            </Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              {/* Showreel Visibility */}
              <View style={styles.tierContainer}>
                <Text style={[styles.tierHeaderTitle, { color: theme.text }]}>Showreel Visibility</Text>
                <Text style={[styles.tierHeaderDesc, { color: theme.textMuted }]}>
                  Control who can stream your video reels
                </Text>
                <View style={styles.tierBtnRow}>
                  {THREE_TIER_OPTIONS.map((opt) => {
                    const isSelected = (draftSettings.showreelVisibility || 'PUBLIC') === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.tierBtn,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surface,
                            borderColor: isSelected ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => updateDraft('showreelVisibility', opt.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.tierBtnText,
                            { color: isSelected ? '#000000' : theme.textSecondary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Gear Kit Visibility */}
              <View style={styles.tierContainer}>
                <Text style={[styles.tierHeaderTitle, { color: theme.text }]}>Gear Kit Visibility</Text>
                <Text style={[styles.tierHeaderDesc, { color: theme.textMuted }]}>
                  Control who can inspect your camera, lighting & sound equipment
                </Text>
                <View style={styles.tierBtnRow}>
                  {THREE_TIER_OPTIONS.map((opt) => {
                    const isSelected = (draftSettings.gearKitVisibility || 'PUBLIC') === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.tierBtn,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surface,
                            borderColor: isSelected ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => updateDraft('gearKitVisibility', opt.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.tierBtnText,
                            { color: isSelected ? '#000000' : theme.textSecondary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 3. MESSAGING & CONTACT PERMISSIONS */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>
              INQUIRIES & DIRECT MESSAGES
            </Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              {MESSAGING_PERMISSIONS.map((perm, index) => {
                const isSelected = (draftSettings.messagingPermissions || 'ANYONE') === perm.key;
                return (
                  <View key={perm.key}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.radioRow}
                      onPress={() => updateDraft('messagingPermissions', perm.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, { borderColor: isSelected ? theme.primary : theme.textMuted }]}>
                        {isSelected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                      </View>
                      <View style={styles.radioInfo}>
                        <Text style={[styles.radioLabel, { color: theme.text }]}>{perm.label}</Text>
                        <Text style={[styles.radioDesc, { color: theme.textMuted }]}>{perm.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* 4. CONTACT INFORMATION PROTECTION */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>
              CONTACT PROTECTION
            </Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Hide Phone Number</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    Never expose personal phone publicly
                  </Text>
                </View>
                <Switch
                  value={draftSettings.hidePhone}
                  onValueChange={(v) => updateDraft('hidePhone', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Hide Email Address</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    Inquiries route strictly through FilmRoom requests
                  </Text>
                </View>
                <Switch
                  value={draftSettings.hideEmail}
                  onValueChange={(v) => updateDraft('hideEmail', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* 5. PROFILE DETAILS */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>
              PROFILE DETAILS
            </Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Show Availability Status</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>Display Available / Busy status pill</Text>
                </View>
                <Switch
                  value={draftSettings.showAvailability}
                  onValueChange={(v) => updateDraft('showAvailability', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Show Location / City</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>Display primary production market</Text>
                </View>
                <Switch
                  value={draftSettings.showLocation}
                  onValueChange={(v) => updateDraft('showLocation', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Show Current Projects</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>List active credits and affiliations</Text>
                </View>
                <Switch
                  value={draftSettings.showProjects}
                  onValueChange={(v) => updateDraft('showProjects', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Save / Cancel / Restore Defaults Bottom Controls */}
            <View style={styles.footerControls}>
              <View style={styles.saveCancelRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.cardBorder }]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.restoreBtn} onPress={handleRestoreDefaults}>
                <Text style={[styles.restoreBtnText, { color: theme.textMuted }]}>↺ Restore Defaults</Text>
              </TouchableOpacity>
            </View>
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
    maxHeight: '90%',
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
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingGroup: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioInfo: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  radioDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
  },
  tierContainer: {
    paddingVertical: 14,
  },
  tierHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tierHeaderDesc: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  tierBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  footerControls: {
    marginTop: 24,
    alignItems: 'center',
  },
  saveCancelRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  restoreBtn: {
    paddingVertical: 6,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
