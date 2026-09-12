import React, { useState } from 'react';
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

export default function PrivacyModal({ visible, onClose, navigation }) {
  const { theme } = useTheme();

  const [visibility, setVisibility] = useState('PUBLIC');

  // Contact Information Toggles
  const [hidePhone, setHidePhone] = useState(true);
  const [hideEmail, setHideEmail] = useState(true);
  const [allowInquiries, setAllowInquiries] = useState(true);
  const [allowConnections, setAllowConnections] = useState(true);

  // Professional Info Toggles
  const [showAvailability, setShowAvailability] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showPortfolio, setShowPortfolio] = useState(true);

  const handleSave = () => {
    Alert.alert('✓ Privacy Updated', 'Your profile visibility and contact privacy settings have been saved.');
    onClose();
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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Profile Visibility */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>PROFILE VISIBILITY</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              {VISIBILITY_MODES.map((mode, index) => {
                const isSelected = visibility === mode.key;
                return (
                  <View key={mode.key}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.radioRow}
                      onPress={() => setVisibility(mode.key)}
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
                  value={hidePhone}
                  onValueChange={setHidePhone}
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
                  value={hideEmail}
                  onValueChange={setHideEmail}
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
                  value={allowInquiries}
                  onValueChange={setAllowInquiries}
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
                  value={allowConnections}
                  onValueChange={setAllowConnections}
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
                  value={showAvailability}
                  onValueChange={setShowAvailability}
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
                  value={showLocation}
                  onValueChange={setShowLocation}
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
                  value={showProjects}
                  onValueChange={setShowProjects}
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
                  value={showPortfolio}
                  onValueChange={setShowPortfolio}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Safety Actions */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>SAFETY & MODERATION</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={styles.actionLinkRow}
                onPress={() => {
                  onClose();
                  if (navigation) navigation.navigate('BlockedUsers');
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

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>Save Privacy Settings</Text>
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
  saveBtn: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
});
