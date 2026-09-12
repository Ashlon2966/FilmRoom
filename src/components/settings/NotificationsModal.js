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

export default function NotificationsModal({ visible, onClose }) {
  const { theme } = useTheme();

  // Requests alerts
  const [reqContact, setReqContact] = useState(true);
  const [reqAccepted, setReqAccepted] = useState(true);
  const [reqDeclined, setReqDeclined] = useState(true);

  // Production alerts
  const [prodCrewCall, setProdCrewCall] = useState(true);
  const [prodInvite, setProdInvite] = useState(true);
  const [prodChanges, setProdChanges] = useState(true);

  // Messages alerts
  const [msgDirect, setMsgDirect] = useState(true);
  const [msgConnection, setMsgConnection] = useState(true);

  // Sync alerts
  const [syncDone, setSyncDone] = useState(false);
  const [syncFail, setSyncFail] = useState(true);
  const [syncImport, setSyncImport] = useState(true);

  // Quiet Hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietFromHour, setQuietFromHour] = useState('22:00');
  const [quietToHour, setQuietToHour] = useState('08:00');

  const TIME_OPTIONS = [
    '20:00', '21:00', '22:00', '23:00', '00:00', '01:00',
    '06:00', '07:00', '08:00', '09:00', '10:00',
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>NOTIFICATIONS</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Production calls, requests & Quiet Hours
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* 1. REQUESTS */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>REQUESTS</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Contact requests</Text>
                <Switch
                  value={reqContact}
                  onValueChange={setReqContact}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Request accepted</Text>
                <Switch
                  value={reqAccepted}
                  onValueChange={setReqAccepted}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Request declined</Text>
                <Switch
                  value={reqDeclined}
                  onValueChange={setReqDeclined}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* 2. PRODUCTION */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>PRODUCTION</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Crew call updates</Text>
                <Switch
                  value={prodCrewCall}
                  onValueChange={setProdCrewCall}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Project invitations</Text>
                <Switch
                  value={prodInvite}
                  onValueChange={setProdInvite}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Production changes</Text>
                <Switch
                  value={prodChanges}
                  onValueChange={setProdChanges}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* 3. MESSAGES */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>MESSAGES</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>New messages</Text>
                <Switch
                  value={msgDirect}
                  onValueChange={setMsgDirect}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Connection messages</Text>
                <Switch
                  value={msgConnection}
                  onValueChange={setMsgConnection}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* 4. SYNC */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>SYNC ALERTS</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Sync completed</Text>
                <Switch
                  value={syncDone}
                  onValueChange={setSyncDone}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Sync failure</Text>
                <Switch
                  value={syncFail}
                  onValueChange={setSyncFail}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Import completed</Text>
                <Switch
                  value={syncImport}
                  onValueChange={setSyncImport}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* 5. QUIET HOURS */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>QUIET HOURS</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder, paddingVertical: 8 }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Enable Quiet Hours</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>Mute notifications during sleep/set times</Text>
                </View>
                <Switch
                  value={quietHoursEnabled}
                  onValueChange={setQuietHoursEnabled}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {quietHoursEnabled && (
                <View style={styles.timePickerContainer}>
                  <Text style={[styles.timePickerLabel, { color: theme.textSecondary }]}>FROM TIME</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    {TIME_OPTIONS.slice(0, 6).map((t) => (
                      <TouchableOpacity
                        key={`from-${t}`}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: quietFromHour === t ? theme.primary : theme.surface,
                            borderColor: quietFromHour === t ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => setQuietFromHour(t)}
                      >
                        <Text style={[styles.timeChipText, { color: quietFromHour === t ? '#000000' : theme.text }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[styles.timePickerLabel, { color: theme.textSecondary, marginTop: 10 }]}>TO TIME</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    {TIME_OPTIONS.slice(6).map((t) => (
                      <TouchableOpacity
                        key={`to-${t}`}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: quietToHour === t ? theme.primary : theme.surface,
                            borderColor: quietToHour === t ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => setQuietToHour(t)}
                      >
                        <Text style={[styles.timeChipText, { color: quietToHour === t ? '#000000' : theme.text }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                Alert.alert('✓ Saved', 'Your notification preferences have been saved.');
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>Save Preferences</Text>
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
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
  },
  timePickerContainer: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  timePickerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
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
