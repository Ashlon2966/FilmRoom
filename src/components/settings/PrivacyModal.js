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
import { useTheme } from '../../context/ThemeContext';

const VISIBILITY_MODES = [
  { key: 'PUBLIC', label: 'Public', desc: 'Visible in Explore directory to all verified filmmakers' },
  { key: 'CONNECTIONS', label: 'Connections Only', desc: 'Visible only to accepted professional contacts' },
  { key: 'PRIVATE', label: 'Private', desc: 'Hidden from discovery; visible only via direct project link' },
];

const DEFAULT_PRIVACY = {
  visibility: 'PUBLIC',
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

  // Saved privacy settings & draft staging
  const [savedSettings, setSavedSettings] = useState(DEFAULT_PRIVACY);
  const [draftSettings, setDraftSettings] = useState(DEFAULT_PRIVACY);

  useEffect(() => {
    if (visible) {
      setDraftSettings(savedSettings);
    }
  }, [visible]);

  const updateDraft = (key, value) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSavedSettings(draftSettings);
    Alert.alert('✓ Privacy Updated', 'Your profile visibility and contact privacy settings have been saved.');
    onClose();
  };

  const handleCancel = () => {
    setDraftSettings(savedSettings);
    onClose();
  };

  const handleRestoreDefaults = () => {
    setDraftSettings(DEFAULT_PRIVACY);
    Alert.alert('Defaults Restored', 'Privacy settings reset to factory defaults.');
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
            {/* Profile Visibility */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>PROFILE VISIBILITY</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
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

            {/* Contact Information Privacy */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>
              CONTACT INFORMATION
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
                    Inquiries route through FilmRoom requests
                  </Text>
                </View>
                <Switch
                  value={draftSettings.hideEmail}
                  onValueChange={(v) => updateDraft('hideEmail', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Allow Professional Inquiries</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    Permit verified directors and producers to send requests
                  </Text>
                </View>
                <Switch
                  value={draftSettings.allowInquiries}
                  onValueChange={(v) => updateDraft('allowInquiries', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Allow Connection Requests</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    Enable filmmaker-to-filmmaker networking
                  </Text>
                </View>
                <Switch
                  value={draftSettings.allowConnections}
                  onValueChange={(v) => updateDraft('allowConnections', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Professional Information */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>
              PROFESSIONAL INFORMATION
            </Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Show Availability Status</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>Display Available / Busy / Date pill</Text>
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

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Show Portfolio Links</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>Showreel and IMDb links</Text>
                </View>
                <Switch
                  value={draftSettings.showPortfolio}
                  onValueChange={(v) => updateDraft('showPortfolio', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* REALISTIC COMING SOON FEATURE */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>SECURITY & RIGHTS PROTECTION</Text>
            <View style={[styles.comingSoonCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.comingSoonHeader}>
                <Text style={[styles.comingSoonTitle, { color: theme.text }]}>Forensic Watermarked Screeners</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={[styles.comingSoonDesc, { color: theme.textMuted }]}>
                Dynamic forensic burnt-in viewer email, IP, and timestamp overlay on all showreel views and script PDF downloads to prevent unauthorized leaks and protect agency clients.
              </Text>
            </View>

            {/* Safety Actions */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>SAFETY & MODERATION</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={styles.actionLinkRow}
                onPress={() => {
                  Alert.alert(
                    'Blocked Users',
                    'To unblock or manage blocked filmmakers, visit their profile or open Direct Messages. Blocked users cannot send requests or messages to you.'
                  );
                }}
              >
                <Text style={[styles.actionLinkLabel, { color: theme.text }]}>🚫 Manage Blocked Users</Text>
                <Text style={[styles.actionLinkArrow, { color: theme.primary }]}>→</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.actionLinkRow}
                onPress={() => Alert.alert('Report Content', 'To report harassment or impersonation, contact trust@filmroom.app')}
              >
                <Text style={[styles.actionLinkLabel, { color: theme.text }]}>🚩 Report an Issue</Text>
                <Text style={[styles.actionLinkArrow, { color: theme.primary }]}>→</Text>
              </TouchableOpacity>
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
    fontWeight: '850',
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
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
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
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
  },
  comingSoonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  comingSoonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  comingSoonTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  comingSoonBadge: {
    backgroundColor: '#3b82f620',
    borderColor: '#3b82f6',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingSoonBadgeText: {
    color: '#60a5fa',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  comingSoonDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  actionLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionLinkArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerControls: {
    marginTop: 20,
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
