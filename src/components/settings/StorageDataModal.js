import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
  CLOUDINARY_CONFIG,
  resolveCloudinaryConfig,
  getCloudinaryStatus,
  setCustomCloudinaryConfig,
  resetCustomCloudinaryConfig,
  initCloudinaryConfig,
  isPlaceholderValue,
} from '../../config/cloudinaryConfig';
import { testCloudinaryConnection } from '../../services/cloudinaryService';
import { getLocalDatabaseStats, clearLocalCache } from '../../services/localDatabaseService';
import { getPendingQueueCount } from '../../services/syncService';
import { useToast } from '../../context/ToastContext';

const DEFAULT_STORAGE_PREFS = {
  autoPurgeCache: false,
  prefetchScripts: true,
  wifiOnlyMediaCache: true,
};

export default function StorageDataModal({ visible, onClose }) {
  const { theme } = useTheme();
  const { showToast } = useToast();

  const [cacheSize, setCacheSize] = useState('0 KB');
  const [dbStats, setDbStats] = useState({
    rooms: 0,
    calls: 0,
    takes: 0,
    pendingSync: 0,
    totalRecords: 0,
    estimatedSizeFormatted: '16 KB',
  });

  // Cloudinary credentials state
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(false);
  const [activeConfig, setActiveConfig] = useState(null);
  const [savingCloudinary, setSavingCloudinary] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Storage preferences draft staging
  const [savedPrefs, setSavedPrefs] = useState(DEFAULT_STORAGE_PREFS);
  const [draftPrefs, setDraftPrefs] = useState(DEFAULT_STORAGE_PREFS);

  const refreshStats = async () => {
    const stats = await getLocalDatabaseStats();
    const pending = await getPendingQueueCount();
    setDbStats({ ...stats, pendingSync: pending });
    setCacheSize(stats.estimatedSizeFormatted);
  };

  useEffect(() => {
    if (visible) {
      initCloudinaryConfig().then((resolved) => {
        if (resolved.configured) {
          setCloudName(resolved.cloudName || '');
          setUploadPreset(resolved.uploadPreset || '');
          setIsCloudinaryConfigured(true);
          setActiveConfig(resolved);
        } else {
          setCloudName('');
          setUploadPreset('');
          setIsCloudinaryConfigured(false);
          setActiveConfig(null);
        }
      });
      refreshStats();
      setDraftPrefs(savedPrefs);
    }
  }, [visible]);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Application Cache',
      'This will clear local temporary caches. Un-synchronized changes and cloud data remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await clearLocalCache();
            await refreshStats();
            showToast({ type: 'info', message: 'Temporary cache cleared' });
          },
        },
      ]
    );
  };

  const handleSaveCloudinary = async () => {
    const trimmedCloud = cloudName.trim();
    const trimmedPreset = uploadPreset.trim();

    if (!trimmedCloud || !trimmedPreset) {
      Alert.alert(
        'Missing Information',
        'Please enter both your Cloud Name and Unsigned Upload Preset.'
      );
      return;
    }

    if (isPlaceholderValue(trimmedCloud) || isPlaceholderValue(trimmedPreset)) {
      Alert.alert(
        'Invalid Credentials',
        'Please enter your actual Cloudinary credentials. Placeholder values like "filmroom_media" cannot be saved.'
      );
      return;
    }

    setSavingCloudinary(true);
    try {
      const resolved = await setCustomCloudinaryConfig(trimmedCloud, trimmedPreset);
      setIsCloudinaryConfigured(resolved.configured);
      setActiveConfig(resolved);
      showToast({ type: 'success', message: 'Cloudinary configuration saved' });
    } catch (e) {
      showToast({ type: 'error', message: e.message || 'Failed to save configuration.' });
    } finally {
      setSavingCloudinary(false);
    }
  };

  const handleTestConnection = async () => {
    const targetCloud = cloudName.trim();
    const targetPreset = uploadPreset.trim();

    if (!targetCloud || !targetPreset) {
      Alert.alert(
        'Credentials Required',
        'Please enter your Cloud Name and Unsigned Upload Preset to test connection.'
      );
      return;
    }

    if (isPlaceholderValue(targetCloud) || isPlaceholderValue(targetPreset)) {
      Alert.alert(
        'Invalid Credentials',
        'Placeholder values cannot be tested. Enter your actual Cloudinary credentials.'
      );
      return;
    }

    setTestingConnection(true);
    try {
      const result = await testCloudinaryConnection({
        cloudName: targetCloud,
        uploadPreset: targetPreset,
      });

      if (result.success) {
        showToast({ type: 'success', message: result.message });
      } else {
        showToast({ type: 'error', message: result.message });
      }
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Unable to connect to Cloudinary.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleResetCloudinary = async () => {
    Alert.alert(
      'Clear Cloudinary Configuration',
      'Remove saved Cloudinary credentials from this device? Uploads will be paused until credentials are configured again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Configuration',
          style: 'destructive',
          onPress: async () => {
            const resolved = await resetCustomCloudinaryConfig();
            setCloudName(resolved.cloudName || '');
            setUploadPreset(resolved.uploadPreset || '');
            setIsCloudinaryConfigured(resolved.configured);
            setActiveConfig(resolved.configured ? resolved : null);
            showToast({ type: 'info', message: 'Cloudinary configuration removed' });
          },
        },
      ]
    );
  };

  const handleSaveChanges = () => {
    setSavedPrefs(draftPrefs);
    showToast({ type: 'success', message: 'Storage preferences saved' });
    onClose();
  };

  const handleCancel = () => {
    setDraftPrefs(savedPrefs);
    onClose();
  };

  const handleRestoreDefaults = () => {
    setDraftPrefs(DEFAULT_STORAGE_PREFS);
    showToast({ type: 'info', message: 'Storage preferences reset to defaults' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>STORAGE & DATA</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Local offline database, media & Cloudinary setup
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Overview Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.statRow}>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>LOCAL SQLITE</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{dbStats.estimatedSizeFormatted}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>CACHED RECORDS</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{dbStats.totalRecords}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>PENDING SYNC</Text>
                  <Text style={[styles.statValue, { color: dbStats.pendingSync > 0 ? theme.primary : theme.text }]}>
                    {dbStats.pendingSync} items
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: theme.cardBorder, flex: 1, marginRight: 6 }]}
                  onPress={() => Alert.alert('Offline Data', 'Local working layer stores offline drafts, call sheets, and circle takes.')}
                >
                  <Text style={[styles.outlineBtnText, { color: theme.text }]}>Manage Offline Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: theme.cardBorder, flex: 1, marginLeft: 6 }]}
                  onPress={() => Alert.alert('Export to Device', 'Preparing local database package export...')}
                >
                  <Text style={[styles.outlineBtnText, { color: theme.text }]}>Export to Device</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CLOUDINARY MEDIA SETUP */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>CLOUDINARY MEDIA CONFIGURATION</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isCloudinaryConfigured ? '#052e16' : '#2e1b05',
                    borderColor: isCloudinaryConfigured ? '#22c55e' : '#f59e0b',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isCloudinaryConfigured ? '#4ade80' : '#fbbf24' },
                  ]}
                >
                  {isCloudinaryConfigured ? '✓ Cloudinary Configured' : '○ Cloudinary Not Configured'}
                </Text>
              </View>
            </View>

            <View style={[styles.configCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              {/* Safe Client Warning */}
              <View style={[styles.securityNoticeBox, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <Text style={styles.securityNoticeIcon}>🔒</Text>
                <Text style={[styles.securityNoticeText, { color: theme.textSecondary }]}>
                  Cloud Name and unsigned upload preset are safe for client-side unsigned uploads. Never enter your Cloudinary API Secret here.
                </Text>
              </View>

              {isCloudinaryConfigured && activeConfig ? (
                <View style={[styles.activeConfigBox, { backgroundColor: theme.background, borderColor: '#22c55e33' }]}>
                  <Text style={[styles.activeConfigHeader, { color: '#4ade80' }]}>Active Configuration</Text>
                  <View style={styles.activeConfigRow}>
                    <Text style={[styles.activeConfigKey, { color: theme.textSecondary }]}>Cloud Name:</Text>
                    <Text style={[styles.activeConfigVal, { color: theme.text }]}>{activeConfig.cloudName}</Text>
                  </View>
                  <View style={styles.activeConfigRow}>
                    <Text style={[styles.activeConfigKey, { color: theme.textSecondary }]}>Upload Preset:</Text>
                    <Text style={[styles.activeConfigVal, { color: theme.text }]}>{activeConfig.uploadPreset}</Text>
                  </View>
                </View>
              ) : null}

              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 10 }]}>CLOUD NAME</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                value={cloudName}
                onChangeText={setCloudName}
                placeholder="e.g. your-cloud-name"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>UNSIGNED UPLOAD PRESET</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                value={uploadPreset}
                onChangeText={setUploadPreset}
                placeholder="e.g. your_unsigned_preset"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.configBtnRow}>
                <TouchableOpacity
                  style={[styles.saveConfigBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveCloudinary}
                  disabled={savingCloudinary || testingConnection}
                  activeOpacity={0.8}
                >
                  {savingCloudinary ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.saveConfigBtnText}>Save Configuration</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testConfigBtn, { borderColor: theme.primary, backgroundColor: theme.surface }]}
                  onPress={handleTestConnection}
                  disabled={testingConnection || savingCloudinary}
                  activeOpacity={0.8}
                >
                  {testingConnection ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={[styles.testConfigBtnText, { color: theme.primary }]}>Test Connection</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.clearConfigBtn, { borderColor: theme.cardBorder }]}
                onPress={handleResetCloudinary}
                disabled={testingConnection || savingCloudinary}
                activeOpacity={0.7}
              >
                <Text style={[styles.clearConfigBtnText, { color: theme.textSecondary }]}>Clear Configuration</Text>
              </TouchableOpacity>
            </View>

            {/* Detailed Storage Breakdown */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 16 }]}>STORAGE BREAKDOWN</Text>
            <View style={[styles.breakdownCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>🖼 Photos</Text>
                <Text style={[styles.itemValue, { color: theme.textSecondary }]}>82 MB</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>🎬 Videos</Text>
                <Text style={[styles.itemValue, { color: theme.textSecondary }]}>240 MB</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>📄 Documents</Text>
                <Text style={[styles.itemValue, { color: theme.textSecondary }]}>18 MB</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>💾 Offline Data</Text>
                <Text style={[styles.itemValue, { color: theme.textSecondary }]}>7 MB</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>⚡ Cache</Text>
                <Text style={[styles.itemValue, { color: theme.textSecondary }]}>{cacheSize}</Text>
              </View>
              <View style={styles.divider} />

              <View style={[styles.breakdownRow, { paddingTop: 14 }]}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>TOTAL</Text>
                <Text style={[styles.totalValue, { color: theme.primary }]}>
                  {cacheSize === '0 MB' ? '347 MB' : '359 MB'}
                </Text>
              </View>
            </View>

            {/* Storage & Caching Preferences */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 16 }]}>CACHING PREFERENCES</Text>
            <View style={[styles.settingsGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.prefRow}>
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Auto-Purge Cache on Exit</Text>
                  <Text style={[styles.prefDesc, { color: theme.textMuted }]}>Automatically clear image and video cache when leaving the app</Text>
                </View>
                <Switch
                  value={draftPrefs.autoPurgeCache}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, autoPurgeCache: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />

              <View style={styles.prefRow}>
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Offline Script Pre-fetch</Text>
                  <Text style={[styles.prefDesc, { color: theme.textMuted }]}>Download script sides and call sheets for offline set use</Text>
                </View>
                <Switch
                  value={draftPrefs.prefetchScripts}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, prefetchScripts: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={styles.divider} />

              <View style={styles.prefRow}>
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Wi-Fi Only for Media Cache</Text>
                  <Text style={[styles.prefDesc, { color: theme.textMuted }]}>Save cellular data while browsing filmmaker showreels</Text>
                </View>
                <Switch
                  value={draftPrefs.wifiOnlyMediaCache}
                  onValueChange={(v) => setDraftPrefs((p) => ({ ...p, wifiOnlyMediaCache: v }))}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* REALISTIC COMING SOON FEATURES */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 16 }]}>PROFESSIONAL HARDWARE & VAULT</Text>
            <View style={[styles.comingSoonCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.comingSoonHeader}>
                <Text style={[styles.comingSoonTitle, { color: theme.text }]}>Direct NAS & Hard Drive Ingest</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={[styles.comingSoonDesc, { color: theme.textMuted }]}>
                Direct location offload from CFexpress, SD cards, and USB-C RAID drives directly into local FilmRoom production vaults with checksum verification (MD5/xxHash).
              </Text>
            </View>

            <View style={[styles.comingSoonCard, { backgroundColor: theme.background, borderColor: theme.cardBorder, marginTop: 8 }]}>
              <View style={styles.comingSoonHeader}>
                <Text style={[styles.comingSoonTitle, { color: theme.text }]}>Encrypted Production Vault</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              </View>
              <Text style={[styles.comingSoonDesc, { color: theme.textMuted }]}>
                Zero-knowledge client-side encryption (AES-256) for high-confidentiality shooting scripts, NDA cast agreements, and budget sheets.
              </Text>
            </View>

            <View style={[styles.actionBtnRow, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: theme.cardBorder, flex: 1, marginRight: 8 }]}
                onPress={handleClearCache}
              >
                <Text style={[styles.dangerBtnText, { color: theme.text }]}>Clear Cache</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1, marginLeft: 8 }]}
                onPress={() => Alert.alert('Manage Files', 'Cloudinary media manager is synchronized.')}
              >
                <Text style={styles.primaryBtnText}>Manage Files</Text>
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
    maxHeight: '92%',
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
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '850',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
  },
  outlineBtn: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  configCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  securityNoticeBox: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  securityNoticeIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  activeConfigBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  activeConfigHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  activeConfigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  activeConfigKey: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeConfigVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  configExplainer: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  configBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  saveConfigBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveConfigBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  testConfigBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testConfigBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  clearConfigBtn: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  clearConfigBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
  },
  settingsGroup: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  prefInfo: {
    flex: 1,
    paddingRight: 12,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefDesc: {
    fontSize: 11,
    marginTop: 2,
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
  actionBtnRow: {
    flexDirection: 'row',
  },
  dangerBtn: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 14,
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
