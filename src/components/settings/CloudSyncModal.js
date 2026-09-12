import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { syncNow, getPendingQueueCount, getLastSyncMetadata } from '../../services/syncService';

const DEFAULT_SYNC_PREFS = {
  autoSync: true,
  wifiOnly: true,
  chargingOnly: false,
  syncMedia: true,
  syncProdData: true,
};

export default function CloudSyncModal({ visible, onClose }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Checking...');
  const [pendingChanges, setPendingChanges] = useState(0);

  // Saved preferences & draft staging
  const [savedPrefs, setSavedPrefs] = useState(DEFAULT_SYNC_PREFS);
  const [draftPrefs, setDraftPrefs] = useState(DEFAULT_SYNC_PREFS);

  useEffect(() => {
    if (visible) {
      setDraftPrefs(savedPrefs);
      getPendingQueueCount().then(setPendingChanges);
      getLastSyncMetadata().then((ts) => {
        if (ts) {
          const date = new Date(ts);
          setLastSynced(
            `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          );
        } else {
          setLastSynced('Never');
        }
      });
    }
  }, [visible]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const result = await syncNow({ userId: currentUser?.uid });
      const count = await getPendingQueueCount();
      setPendingChanges(count);
      const now = new Date();
      setLastSynced(
        `${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );

      if (result.syncedCount === 0 && result.failedCount === 0 && result.conflictCount === 0) {
        Alert.alert('✓ Up to Date', 'All local production records are synchronized with Firebase.');
      } else {
        Alert.alert(
          'Cloud Sync Complete',
          `${result.syncedCount} item(s) synced.${result.failedCount > 0 ? `\n${result.failedCount} item(s) failed.` : ''}${result.conflictCount > 0 ? `\n${result.conflictCount} conflict(s) detected.` : ''}`
        );
      }
    } catch (err) {
      Alert.alert('Sync Notice', err.message || 'Unable to sync with Firebase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveChanges = () => {
    setSavedPrefs(draftPrefs);
    Alert.alert('✓ Saved', 'Sync preferences have been updated.');
    onClose();
  };

  const handleCancel = () => {
    setDraftPrefs(savedPrefs);
    onClose();
  };

  const handleRestoreDefaults = () => {
    setDraftPrefs(DEFAULT_SYNC_PREFS);
    Alert.alert('Defaults Restored', 'Sync preferences reset to factory defaults.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>CLOUD SYNC</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Firebase synchronization & status
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Status Card */}
            <View style={[styles.statusCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.connectionIndicatorRow}>
                <View style={[styles.statusDot, { backgroundColor: theme.success || '#4ade80' }]} />
                <Text style={[styles.statusText, { color: theme.success || '#4ade80' }]}>Connected</Text>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>LAST SYNCED</Text>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{lastSynced}</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>PENDING CHANGES</Text>
                  <Text style={[styles.metricValue, { color: pendingChanges > 0 ? theme.primary : theme.text }]}>
                    {pendingChanges}
                  </Text>
                </View>
              </View>

              <View style={styles.statusFooter}>
                <Text style={[styles.statusFooterText, { color: theme.textMuted }]}>
                  Cloud Status: <Text style={{ color: theme.text, fontWeight: '700' }}>Ready</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.syncNowBtn, { backgroundColor: theme.primary }]}
                onPress={handleSyncNow}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.syncNowBtnText}>Sync Now</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sync Settings */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>SYNC PREFERENCES</Text>

            <View style={[styles.settingsGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Auto Sync</Text>
                  <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                    Automatically synchronize pending changes
                  </Text>
                </View>
                <Switch
                  value={draftPrefs.autoSync}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, autoSync: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Sync on Wi-Fi only</Text>
                  <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                    Conserve cellular data on mobile networks
                  </Text>
                </View>
                <Switch
                  value={draftPrefs.wifiOnly}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, wifiOnly: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Sync while charging</Text>
                  <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                    Defer heavy background operations to power
                  </Text>
                </View>
                <Switch
                  value={draftPrefs.chargingOnly}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, chargingOnly: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Sync Media</Text>
                  <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                    Sync Cloudinary media references & posters
                  </Text>
                </View>
                <Switch
                  value={draftPrefs.syncMedia}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, syncMedia: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>Sync Production Data</Text>
                  <Text style={[styles.settingDesc, { color: theme.textMuted }]}>
                    Rooms, call sheets, circle takes, and slates
                  </Text>
                </View>
                <Switch
                  value={draftPrefs.syncProdData}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, syncProdData: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* REALISTIC COMING SOON FEATURE */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 16 }]}>LOCAL ON-SET COLLABORATION</Text>
            <View style={[styles.comingSoonCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.comingSoonHeader}>
                <Text style={[styles.comingSoonTitle, { color: theme.text }]}>Peer-to-Peer On-Set Local Sync</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={[styles.comingSoonDesc, { color: theme.textMuted }]}>
                Real-time zero-cloud synchronization between production crew devices (Director, 1st AD, Script Supervisor, DIT) over local ad-hoc Wi-Fi or Teradek network without requiring internet connection.
              </Text>
            </View>

            <Text style={[styles.freeTierNotice, { color: theme.textMuted, marginTop: 14 }]}>
              Firebase Spark plan: Live listeners are throttled to minimize reads and writes.
            </Text>

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
                  onPress={handleSaveChanges}
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
  statusCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  connectionIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusFooter: {
    marginBottom: 16,
  },
  statusFooterText: {
    fontSize: 12,
  },
  syncNowBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncNowBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingsGroup: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
  },
  comingSoonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
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
  freeTierNotice: {
    fontSize: 11,
    textAlign: 'center',
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
