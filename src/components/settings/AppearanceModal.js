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
import { ACCENT_PRESETS } from '../../styles/themes';

const ACCENT_OPTIONS = Object.values(ACCENT_PRESETS);

export default function AppearanceModal({ visible, onClose }) {
  const {
    theme,
    themeMode,
    accentColor,
    textSize,
    reduceMotion,
    saveAppearanceSettings,
    resetAppearanceDefaults,
  } = useTheme();

  // Local draft state — pending until user presses [ Save Changes ]
  const [draftTheme, setDraftTheme] = useState(themeMode);
  const [draftAccent, setDraftAccent] = useState(accentColor);
  const [draftTextSize, setDraftTextSize] = useState(textSize);
  const [draftReduceMotion, setDraftReduceMotion] = useState(reduceMotion);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync draft state whenever modal becomes visible or theme values change
  useEffect(() => {
    if (visible) {
      setDraftTheme(themeMode);
      setDraftAccent(accentColor);
      setDraftTextSize(textSize);
      setDraftReduceMotion(reduceMotion);
      setHasChanges(false);
    }
  }, [visible, themeMode, accentColor, textSize, reduceMotion]);

  // Track if any field was changed
  const updateDraft = (setter, newVal, currentVal) => {
    setter(newVal);
    setHasChanges(true);
  };

  // Discard changes & restore previous
  const handleCancel = () => {
    setDraftTheme(themeMode);
    setDraftAccent(accentColor);
    setDraftTextSize(textSize);
    setDraftReduceMotion(reduceMotion);
    setHasChanges(false);
    onClose();
  };

  // Save changes & apply to FilmRoom
  const handleSave = async () => {
    await saveAppearanceSettings({
      themeMode: draftTheme,
      accentColor: draftAccent,
      textSize: draftTextSize,
      reduceMotion: draftReduceMotion,
    });
    setHasChanges(false);
    Alert.alert('✓ Appearance updated', 'Your visual theme and studio preferences have been saved.');
    onClose();
  };

  // Restore factory defaults (Cinema Dark, Cinema Gold)
  const handleRestoreDefaults = () => {
    Alert.alert(
      'Restore Defaults',
      'Reset all appearance settings to Cinema Dark and Cinema Gold?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Defaults',
          style: 'destructive',
          onPress: async () => {
            await resetAppearanceDefaults();
            setDraftTheme('CINEMA_DARK');
            setDraftAccent('ORANGE');
            setDraftTextSize('STANDARD');
            setDraftReduceMotion(false);
            setHasChanges(false);
            Alert.alert('✓ Restored', 'Appearance settings reset to factory defaults.');
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>APPEARANCE</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Visual themes, accents, and accessibility
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Theme Mode Selection */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>THEME</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              {/* Cinema Dark */}
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => updateDraft(setDraftTheme, 'CINEMA_DARK', draftTheme)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: draftTheme === 'CINEMA_DARK' ? theme.primary : theme.textMuted }]}>
                  {draftTheme === 'CINEMA_DARK' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
                <View style={styles.radioLabelCol}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>Cinema Dark (Default)</Text>
                  <Text style={[styles.radioSub, { color: theme.textMuted }]}>High-contrast #0c0d0e OLED studio aesthetic</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

              {/* Light Mode */}
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => updateDraft(setDraftTheme, 'LIGHT', draftTheme)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: draftTheme === 'LIGHT' ? theme.primary : theme.textMuted }]}>
                  {draftTheme === 'LIGHT' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
                <View style={styles.radioLabelCol}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>Light Studio</Text>
                  <Text style={[styles.radioSub, { color: theme.textMuted }]}>High-key daylight exterior shooting mode</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

              {/* System Mode */}
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => updateDraft(setDraftTheme, 'SYSTEM', draftTheme)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: draftTheme === 'SYSTEM' ? theme.primary : theme.textMuted }]}>
                  {draftTheme === 'SYSTEM' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
                <View style={styles.radioLabelCol}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>System Match</Text>
                  <Text style={[styles.radioSub, { color: theme.textMuted }]}>Follows your device dark/light setting</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Accent Color Selection */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 22 }]}>
              ACCENT COLOR
            </Text>
            <View style={styles.accentGrid}>
              {ACCENT_OPTIONS.map((item) => {
                const isSelected = draftAccent === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.accentBtn,
                      {
                        backgroundColor: theme.background,
                        borderColor: isSelected ? item.hex : theme.cardBorder,
                      },
                    ]}
                    onPress={() => updateDraft(setDraftAccent, item.key, draftAccent)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.accentSwatch, { backgroundColor: item.hex }]} />
                    <Text style={[styles.accentLabel, { color: theme.text }]}>{item.label}</Text>
                    {isSelected && <Text style={{ color: item.hex, marginLeft: 'auto', fontWeight: 'bold' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Accessibility & Typography */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 22 }]}>
              ACCESSIBILITY & TYPOGRAPHY
            </Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Text Scaling</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    Increase font sizes for outdoor script reading
                  </Text>
                </View>
                <View style={[styles.segmentedToggle, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  <TouchableOpacity
                    style={[styles.segBtn, draftTextSize === 'STANDARD' && { backgroundColor: theme.primary }]}
                    onPress={() => updateDraft(setDraftTextSize, 'STANDARD', draftTextSize)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: draftTextSize === 'STANDARD' ? '#000000' : theme.textMuted }}>
                      Standard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segBtn, draftTextSize === 'LARGE' && { backgroundColor: theme.primary }]}
                    onPress={() => updateDraft(setDraftTextSize, 'LARGE', draftTextSize)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: draftTextSize === 'LARGE' ? '#000000' : theme.textMuted }}>
                      Large (+15%)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Reduce Motion</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    Minimize slide transitions on mobile set devices
                  </Text>
                </View>
                <Switch
                  value={draftReduceMotion}
                  onValueChange={(val) => updateDraft(setDraftReduceMotion, val, draftReduceMotion)}
                  trackColor={{ false: '#334155', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Action Buttons: Save Changes, Cancel, Restore Defaults */}
            <View style={styles.actionSection}>
              <View style={styles.primaryActionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.cardBorder }]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: theme.primary, opacity: hasChanges ? 1 : 0.85 },
                  ]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={handleRestoreDefaults}
              >
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
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    paddingBottom: 36,
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
  radioLabelCol: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  radioSub: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  accentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: '46%',
    flex: 1,
  },
  accentSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  accentLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  segmentedToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  actionSection: {
    marginTop: 28,
    alignItems: 'center',
  },
  primaryActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  restoreBtn: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
