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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';

const DEFAULT_NOTIFS = {
  reqContact: true,
  reqAccepted: true,
  reqDeclined: true,
  prodCrewCall: true,
  prodInvite: true,
  prodChanges: true,
  msgDirect: true,
  msgConnection: true,
  syncDone: false,
  syncFail: true,
  syncImport: true,
  quietHoursEnabled: false,
  quietFromHour: '22:00',
  quietToHour: '08:00',
};

const TIME_OPTIONS = [
  '20:00', '21:00', '22:00', '23:00', '00:00', '01:00',
  '06:00', '07:00', '08:00', '09:00', '10:00',
];

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;
  const displayMinutes = String(m || 0).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
};

const parseTimeString = (timeStr) => {
  const d = new Date();
  if (!timeStr) return d;
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

export default function NotificationsModal({ visible, onClose }) {
  const { theme } = useTheme();

  // Saved preferences & draft staging
  const [savedSettings, setSavedSettings] = useState(DEFAULT_NOTIFS);
  const [draftSettings, setDraftSettings] = useState(DEFAULT_NOTIFS);
  const [timePickerTarget, setTimePickerTarget] = useState(null); // 'FROM' | 'TO' | null

  useEffect(() => {
    if (visible) {
      setDraftSettings(savedSettings);
    }
  }, [visible]);

  const updateDraft = (key, value) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setTimePickerTarget(null);
    }
    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }
    const hours = String(selectedDate.getHours()).padStart(2, '0');
    const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (timePickerTarget === 'FROM') {
      updateDraft('quietFromHour', timeStr);
    } else if (timePickerTarget === 'TO') {
      updateDraft('quietToHour', timeStr);
    }
  };

  const handleSave = () => {
    setSavedSettings(draftSettings);
    Alert.alert('✓ Saved', 'Your notification preferences have been saved.');
    onClose();
  };

  const handleCancel = () => {
    setDraftSettings(savedSettings);
    onClose();
  };

  const handleRestoreDefaults = () => {
    setDraftSettings(DEFAULT_NOTIFS);
    Alert.alert('Defaults Restored', 'Notification preferences reset to factory defaults.');
  };

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
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
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
                  value={draftSettings.reqContact}
                  onValueChange={(v) => updateDraft('reqContact', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Request accepted</Text>
                <Switch
                  value={draftSettings.reqAccepted}
                  onValueChange={(v) => updateDraft('reqAccepted', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Request declined</Text>
                <Switch
                  value={draftSettings.reqDeclined}
                  onValueChange={(v) => updateDraft('reqDeclined', v)}
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
                  value={draftSettings.prodCrewCall}
                  onValueChange={(v) => updateDraft('prodCrewCall', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Project invitations</Text>
                <Switch
                  value={draftSettings.prodInvite}
                  onValueChange={(v) => updateDraft('prodInvite', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Production changes</Text>
                <Switch
                  value={draftSettings.prodChanges}
                  onValueChange={(v) => updateDraft('prodChanges', v)}
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
                  value={draftSettings.msgDirect}
                  onValueChange={(v) => updateDraft('msgDirect', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Connection messages</Text>
                <Switch
                  value={draftSettings.msgConnection}
                  onValueChange={(v) => updateDraft('msgConnection', v)}
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
                  value={draftSettings.syncDone}
                  onValueChange={(v) => updateDraft('syncDone', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Sync failure</Text>
                <Switch
                  value={draftSettings.syncFail}
                  onValueChange={(v) => updateDraft('syncFail', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Import completed</Text>
                <Switch
                  value={draftSettings.syncImport}
                  onValueChange={(v) => updateDraft('syncImport', v)}
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
                  value={draftSettings.quietHoursEnabled}
                  onValueChange={(v) => updateDraft('quietHoursEnabled', v)}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {draftSettings.quietHoursEnabled && (
                <View style={styles.timePickerContainer}>
                  {/* Native Time Picker Tap Targets */}
                  <View style={styles.timeRowPicker}>
                    <TouchableOpacity
                      style={[styles.nativeTimeBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                      onPress={() => setTimePickerTarget('FROM')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timePickerLabel, { color: theme.textSecondary }]}>FROM</Text>
                      <Text style={[styles.nativeTimeValue, { color: theme.primary }]}>
                        {formatTimeDisplay(draftSettings.quietFromHour)}
                      </Text>
                      <Text style={[styles.nativeTimeSub, { color: theme.textMuted }]}>
                        {draftSettings.quietFromHour} • Tap to pick
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.nativeTimeBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                      onPress={() => setTimePickerTarget('TO')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timePickerLabel, { color: theme.textSecondary }]}>TO</Text>
                      <Text style={[styles.nativeTimeValue, { color: theme.primary }]}>
                        {formatTimeDisplay(draftSettings.quietToHour)}
                      </Text>
                      <Text style={[styles.nativeTimeSub, { color: theme.textMuted }]}>
                        {draftSettings.quietToHour} • Tap to pick
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.timePickerLabel, { color: theme.textSecondary, marginTop: 12 }]}>PRESETS (FROM)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    {TIME_OPTIONS.slice(0, 6).map((t) => (
                      <TouchableOpacity
                        key={`from-${t}`}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: draftSettings.quietFromHour === t ? theme.primary : theme.surface,
                            borderColor: draftSettings.quietFromHour === t ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => updateDraft('quietFromHour', t)}
                      >
                        <Text style={[styles.timeChipText, { color: draftSettings.quietFromHour === t ? '#000000' : theme.text }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[styles.timePickerLabel, { color: theme.textSecondary, marginTop: 10 }]}>PRESETS (TO)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    {TIME_OPTIONS.slice(6).map((t) => (
                      <TouchableOpacity
                        key={`to-${t}`}
                        style={[
                          styles.timeChip,
                          {
                            backgroundColor: draftSettings.quietToHour === t ? theme.primary : theme.surface,
                            borderColor: draftSettings.quietToHour === t ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => updateDraft('quietToHour', t)}
                      >
                        <Text style={[styles.timeChipText, { color: draftSettings.quietToHour === t ? '#000000' : theme.text }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Native Date/Time Picker Modal */}
                  {timePickerTarget && (
                    <DateTimePicker
                      value={parseTimeString(timePickerTarget === 'FROM' ? draftSettings.quietFromHour : draftSettings.quietToHour)}
                      mode="time"
                      is24Hour={false}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimeChange}
                    />
                  )}
                </View>
              )}
            </View>

            {/* REALISTIC COMING SOON FEATURE */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>EMERGENCY NOTIFICATIONS</Text>
            <View style={[styles.comingSoonCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.comingSoonHeader}>
                <Text style={[styles.comingSoonTitle, { color: theme.text }]}>Critical Call Sheet & 1st AD Push</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={[styles.comingSoonDesc, { color: theme.textMuted }]}>
                High-priority production alarms that bypass phone Do Not Disturb / Focus modes for urgent 1st AD schedule shifts, emergency weather location moves, and next-day call time changes.
              </Text>
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
                  <Text style={styles.saveBtnText}>Save Preferences</Text>
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
  timeRowPicker: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  nativeTimeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  nativeTimeValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 2,
  },
  nativeTimeSub: {
    fontSize: 11,
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
  comingSoonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
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
