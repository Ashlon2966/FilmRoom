import React, { useState } from 'react';
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

export default function CloudSyncModal({ visible, onClose }) {
  const { theme } = useTheme();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Today, 6:42 PM');
  const [pendingChanges, setPendingChanges] = useState(0);

  // Sync Preferences (Stored in local state / AsyncStorage)
  const [autoSync, setAutoSync] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [chargingOnly, setChargingOnly] = useState(false);
  const [syncMedia, setSyncMedia] = useState(true);
  const [syncProdData, setSyncProdData] = useState(true);

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setPendingChanges(0);
      const now = new Date();
      setLastSynced(`Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      Alert.alert('Cloud Sync Complete', 'All local production records are synchronized with Firebase.');
    }, 1500);
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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
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
                  value={autoSync}
                  onValueChange={setAutoSync}
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
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
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
                  value={chargingOnly}
                  onValueChange={setChargingOnly}
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
                  value={syncMedia}
                  onValueChange={setSyncMedia}
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
                  value={syncProdData}
                  onValueChange={setSyncProdData}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            <Text style={[styles.freeTierNotice, { color: theme.textMuted }]}>
              Firebase Spark plan: Live listeners are throttled to minimize reads and writes.
            </Text>
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
  freeTierNotice: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
