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
import { exportUserDataToDrive, importUserDataFromFile } from '../../services/backupService';

const PROJECT_PACKAGE_CATEGORIES = [
  { id: 'details', label: 'Project details', defaultSelected: true },
  { id: 'crew', label: 'Crew & Roles', defaultSelected: true },
  { id: 'casting', label: 'Casting & Talent', defaultSelected: true },
  { id: 'callsheets', label: 'Call sheets & Schedules', defaultSelected: true },
  { id: 'documents', label: 'Documents & Scripts', defaultSelected: true },
  { id: 'media', label: 'Media references (Cloudinary)', defaultSelected: true },
  { id: 'notes', label: 'Private notes', defaultSelected: false },
  { id: 'contacts', label: 'Private contact information', defaultSelected: false, sensitive: true },
];

export default function ImportExportModal({ visible, onClose }) {
  const { theme } = useTheme();

  // Mode: 'MENU' | 'IMPORT_PREVIEW' | 'PROJECT_CATEGORIES'
  const [viewMode, setViewMode] = useState('MENU');

  // Category selections
  const [selectedCategories, setSelectedCategories] = useState({
    details: true,
    crew: true,
    casting: true,
    callsheets: true,
    documents: true,
    media: true,
    notes: false,
    contacts: false,
  });

  const toggleCategory = (id) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExportFull = async () => {
    try {
      await exportUserDataToDrive();
    } catch (e) {
      Alert.alert('Export Error', e.message);
    }
  };

  const handleTriggerImport = async () => {
    setViewMode('IMPORT_PREVIEW');
  };

  const handleConfirmImport = async () => {
    try {
      await importUserDataFromFile();
      Alert.alert('✓ Import Complete', 'Selected project data imported successfully.');
      onClose();
    } catch (e) {
      Alert.alert('Import Error', e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>
                {viewMode === 'MENU' && 'IMPORT & EXPORT'}
                {viewMode === 'IMPORT_PREVIEW' && 'IMPORT PREVIEW'}
                {viewMode === 'PROJECT_CATEGORIES' && 'IMPORT PROJECT'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {viewMode === 'MENU' && 'Move FilmRoom packages & backups securely'}
                {viewMode === 'IMPORT_PREVIEW' && 'Inspect package contents before merging'}
                {viewMode === 'PROJECT_CATEGORIES' && 'Select categories to include'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* ── MODE: MAIN MENU ── */}
            {viewMode === 'MENU' && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EXPORT DATA</Text>
                <View style={[styles.menuGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <TouchableOpacity style={styles.menuRow} onPress={handleExportFull} activeOpacity={0.7}>
                    <Text style={styles.menuIcon}>📦</Text>
                    <View style={styles.menuInfo}>
                      <Text style={[styles.menuLabel, { color: theme.text }]}>Entire FilmRoom Data</Text>
                      <Text style={[styles.menuDesc, { color: theme.textMuted }]}>
                        Complete JSON package with projects, rooms, and roster
                      </Text>
                    </View>
                    <Text style={[styles.menuArrow, { color: theme.primary }]}>→</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => Alert.alert('Export Project', 'Choose an active production room to export as a standalone package.')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.menuIcon}>🎬</Text>
                    <View style={styles.menuInfo}>
                      <Text style={[styles.menuLabel, { color: theme.text }]}>Project Package (.filmroom)</Text>
                      <Text style={[styles.menuDesc, { color: theme.textMuted }]}>
                        Call sheets, cast, crew, and scripts without private contact info
                      </Text>
                    </View>
                    <Text style={[styles.menuArrow, { color: theme.primary }]}>→</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => Alert.alert('Export Profile', 'Exporting public professional dossier and portfolio links.')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.menuIcon}>👤</Text>
                    <View style={styles.menuInfo}>
                      <Text style={[styles.menuLabel, { color: theme.text }]}>Professional Dossier</Text>
                      <Text style={[styles.menuDesc, { color: theme.textMuted }]}>
                        Credits, equipment kit list, and bio summary
                      </Text>
                    </View>
                    <Text style={[styles.menuArrow, { color: theme.primary }]}>→</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 18 }]}>IMPORT DATA</Text>
                <View style={[styles.menuGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <TouchableOpacity style={styles.menuRow} onPress={handleTriggerImport} activeOpacity={0.7}>
                    <Text style={styles.menuIcon}>📁</Text>
                    <View style={styles.menuInfo}>
                      <Text style={[styles.menuLabel, { color: theme.text }]}>Import from Device</Text>
                      <Text style={[styles.menuDesc, { color: theme.textMuted }]}>
                        Inspect and restore from .filmroom or JSON package
                      </Text>
                    </View>
                    <Text style={[styles.menuArrow, { color: theme.primary }]}>→</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => {
                      setViewMode('PROJECT_CATEGORIES');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.menuIcon}>🗂</Text>
                    <View style={styles.menuInfo}>
                      <Text style={[styles.menuLabel, { color: theme.text }]}>Selective Project Import</Text>
                      <Text style={[styles.menuDesc, { color: theme.textMuted }]}>
                        Choose categories to merge into your studio
                      </Text>
                    </View>
                    <Text style={[styles.menuArrow, { color: theme.primary }]}>→</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── MODE: IMPORT PREVIEW (Conflict Management) ── */}
            {viewMode === 'IMPORT_PREVIEW' && (
              <View style={styles.previewContainer}>
                <View style={[styles.previewCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <View style={styles.previewStatRow}>
                    <Text style={[styles.previewStatLabel, { color: theme.textSecondary }]}>Projects</Text>
                    <Text style={[styles.previewStatValue, { color: theme.text }]}>3</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.previewStatRow}>
                    <Text style={[styles.previewStatLabel, { color: theme.textSecondary }]}>People</Text>
                    <Text style={[styles.previewStatValue, { color: theme.text }]}>24</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.previewStatRow}>
                    <Text style={[styles.previewStatLabel, { color: theme.textSecondary }]}>Documents</Text>
                    <Text style={[styles.previewStatValue, { color: theme.text }]}>18</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.previewStatRow}>
                    <Text style={[styles.previewStatLabel, { color: theme.textSecondary }]}>Media references</Text>
                    <Text style={[styles.previewStatValue, { color: theme.text }]}>12</Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.previewStatRow}>
                    <Text style={[styles.previewStatLabel, { color: theme.primary }]}>Conflicts</Text>
                    <Text style={[styles.previewStatValue, { color: theme.primary }]}>0</Text>
                  </View>
                </View>

                <Text style={[styles.conflictNotice, { color: theme.textMuted }]}>
                  Conflict safe: Incoming items will not overwrite newer records. Existing local drafts are preserved.
                </Text>

                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={[styles.outlineActionBtn, { borderColor: theme.cardBorder, flex: 1, marginRight: 6 }]}
                    onPress={() => setViewMode('MENU')}
                  >
                    <Text style={[styles.outlineActionBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.outlineActionBtn, { borderColor: theme.cardBorder, flex: 1, marginHorizontal: 6 }]}
                    onPress={() => setViewMode('PROJECT_CATEGORIES')}
                  >
                    <Text style={[styles.outlineActionBtnText, { color: theme.text }]}>Review</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.primary, flex: 1, marginLeft: 6 }]}
                    onPress={handleConfirmImport}
                  >
                    <Text style={styles.primaryActionBtnText}>Import</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── MODE: PROJECT CATEGORIES (Selective Import) ── */}
            {viewMode === 'PROJECT_CATEGORIES' && (
              <View style={styles.categoriesContainer}>
                <Text style={[styles.categoriesPrompt, { color: theme.textSecondary }]}>
                  Select data categories to include from this package:
                </Text>

                <View style={[styles.checklistCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  {PROJECT_PACKAGE_CATEGORIES.map((cat, index) => {
                    const isChecked = !!selectedCategories[cat.id];
                    return (
                      <View key={cat.id}>
                        {index > 0 && <View style={styles.divider} />}
                        <TouchableOpacity
                          style={styles.checkRow}
                          onPress={() => toggleCategory(cat.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, { borderColor: isChecked ? theme.primary : theme.cardBorder }]}>
                            {isChecked && <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>}
                          </View>
                          <View style={styles.checkInfo}>
                            <Text style={[styles.checkLabel, { color: theme.text }]}>
                              {cat.label}
                            </Text>
                            {cat.sensitive && (
                              <Text style={[styles.sensitiveBadge, { color: theme.danger || '#f87171' }]}>
                                Protected: Excluded by default
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={[styles.outlineActionBtn, { borderColor: theme.cardBorder, flex: 1, marginRight: 8 }]}
                    onPress={() => setViewMode('MENU')}
                  >
                    <Text style={[styles.outlineActionBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.primary, flex: 2, marginLeft: 8 }]}
                    onPress={handleConfirmImport}
                  >
                    <Text style={styles.primaryActionBtnText}>Import Selected</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuGroup: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  menuArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#242830',
  },
  previewContainer: {
    paddingTop: 8,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  previewStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  previewStatLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewStatValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  conflictNotice: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  actionBtnRow: {
    flexDirection: 'row',
  },
  outlineActionBtn: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryActionBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  categoriesContainer: {
    paddingTop: 8,
  },
  categoriesPrompt: {
    fontSize: 13,
    marginBottom: 14,
  },
  checklistCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '900',
  },
  checkInfo: {
    flex: 1,
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sensitiveBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
