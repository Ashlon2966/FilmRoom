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

const ACCENT_COLORS = [
  { key: 'ORANGE', label: 'Cinema Gold', hex: '#f5a623' },
  { key: 'BLUE', label: 'Cyan / Blue', hex: '#38bdf8' },
  { key: 'PURPLE', label: 'Deep Purple', hex: '#a855f7' },
  { key: 'GREEN', label: 'Set Green', hex: '#4ade80' },
];

export default function AppearanceModal({ visible, onClose }) {
  const { theme } = useTheme();

  const [selectedTheme, setSelectedTheme] = useState('CINEMA_DARK');
  const [selectedAccent, setSelectedAccent] = useState('ORANGE');
  const [textSize, setTextSize] = useState('STANDARD'); // 'STANDARD' | 'LARGE'
  const [reduceMotion, setReduceMotion] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Theme Selection */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>THEME</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => setSelectedTheme('CINEMA_DARK')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: selectedTheme === 'CINEMA_DARK' ? theme.primary : theme.textMuted }]}>
                  {selectedTheme === 'CINEMA_DARK' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
                <View style={styles.radioLabelCol}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>Cinema Dark (Default)</Text>
                  <Text style={[styles.radioSub, { color: theme.textMuted }]}>High-contrast #0c0d0e OLED studio aesthetic</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => {
                  setSelectedTheme('LIGHT');
                  Alert.alert('Theme Notice', 'Cinema Dark is the default studio environment.');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: selectedTheme === 'LIGHT' ? theme.primary : theme.textMuted }]}>
                  {selectedTheme === 'LIGHT' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
                <View style={styles.radioLabelCol}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>Light</Text>
                  <Text style={[styles.radioSub, { color: theme.textMuted }]}>High-key daytime shooting mode</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => setSelectedTheme('SYSTEM')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, { borderColor: selectedTheme === 'SYSTEM' ? theme.primary : theme.textMuted }]}>
                  {selectedTheme === 'SYSTEM' && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
                </View>
                <View style={styles.radioLabelCol}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>System</Text>
                  <Text style={[styles.radioSub, { color: theme.textMuted }]}>Match operating system preference</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Accent Color Selection */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>ACCENT COLOR</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder, paddingVertical: 12 }]}>
              <View style={styles.accentGrid}>
                {ACCENT_COLORS.map((accent) => {
                  const isSelected = selectedAccent === accent.key;
                  return (
                    <TouchableOpacity
                      key={accent.key}
                      style={[
                        styles.accentBtn,
                        {
                          borderColor: isSelected ? accent.hex : theme.cardBorder,
                          backgroundColor: isSelected ? '#181b1f' : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedAccent(accent.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.accentSwatch, { backgroundColor: accent.hex }]} />
                      <Text style={[styles.accentLabel, { color: theme.text }]}>{accent.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Accessibility */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary, marginTop: 18 }]}>ACCESSIBILITY</Text>
            <View style={[styles.settingGroup, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Text Size</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    {textSize === 'LARGE' ? 'Large (High Legibility)' : 'Standard'}
                  </Text>
                </View>
                <View style={styles.segmentedToggle}>
                  <TouchableOpacity
                    style={[styles.segBtn, textSize === 'STANDARD' && { backgroundColor: theme.primary }]}
                    onPress={() => setTextSize('STANDARD')}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSize === 'STANDARD' ? '#000' : theme.textSecondary }}>
                      Standard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segBtn, textSize === 'LARGE' && { backgroundColor: theme.primary }]}
                    onPress={() => setTextSize('LARGE')}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: textSize === 'LARGE' ? '#000' : theme.textSecondary }}>
                      Large
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Reduce Motion</Text>
                  <Text style={[styles.switchDesc, { color: theme.textMuted }]}>
                    Minimize sliding transitions and banner animations
                  </Text>
                </View>
                <Switch
                  value={reduceMotion}
                  onValueChange={setReduceMotion}
                  trackColor={{ false: '#242830', true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
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
    backgroundColor: '#242830',
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
    minWidth: '45%',
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
    backgroundColor: '#121417',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: '#242830',
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
});
