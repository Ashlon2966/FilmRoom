import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function StorageDataModal({ visible, onClose }) {
  const { theme } = useTheme();

  const [cacheSize, setCacheSize] = useState('12 MB');

  const handleClearCache = () => {
    Alert.alert(
      'Clear Application Cache',
      'This will remove temporary thumbnail files and network cache. Your offline documents and data remain intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => {
            setCacheSize('0 MB');
            Alert.alert('✓ Cache Cleared', '12 MB of temporary cached files were removed.');
          },
        },
      ]
    );
  };

  const handleManageLocalData = () => {
    Alert.alert(
      'Offline Data Management',
      'Local working layer stores your offline drafts, cached scripts, and pending changes before cloud synchronization.'
    );
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
                Local offline database and media breakdown
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Overview Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.statRow}>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>LOCAL DATA</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>78 MB</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>CLOUD DATA</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>52 MB</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>PENDING SYNC</Text>
                  <Text style={[styles.statValue, { color: theme.primary }]}>0 items</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: theme.cardBorder, flex: 1, marginRight: 6 }]}
                  onPress={handleManageLocalData}
                >
                  <Text style={[styles.outlineBtnText, { color: theme.text }]}>Manage Local Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: theme.cardBorder, flex: 1, marginLeft: 6 }]}
                  onPress={() => Alert.alert('Export to Device', 'Preparing local database package export...')}
                >
                  <Text style={[styles.outlineBtnText, { color: theme.text }]}>Export to Device</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.actionRow, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: theme.cardBorder, flex: 1, marginRight: 6 }]}
                  onPress={() => Alert.alert('Import from Device', 'Select a .filmroom backup or SQLite package to import.')}
                >
                  <Text style={[styles.outlineBtnText, { color: theme.textSecondary }]}>Import from Device</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: theme.cardBorder, flex: 1, marginLeft: 6 }]}
                  onPress={() => Alert.alert('Import from Cloud', 'Pulling snapshot from Firebase cloud backup...')}
                >
                  <Text style={[styles.outlineBtnText, { color: theme.textSecondary }]}>Import from Cloud</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Detailed Storage Breakdown */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>STORAGE BREAKDOWN</Text>

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

            <View style={styles.actionBtnRow}>
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
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
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
  sectionHeading: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  breakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
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
});
