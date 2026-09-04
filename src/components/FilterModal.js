import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const DEPARTMENTS = [
  'All',
  'Director',
  'Cinematographer',
  'Camera Operator',
  'Scriptwriter',
  'Producer',
  'Sound Designer',
  'Editor',
  'Actor',
  'Gaffer',
  'Grip',
  'Production Assistant',
];

export default function FilterModal({ visible, currentFilters, onClose, onApply }) {
  const { theme } = useTheme();

  // Local state initialized with current active filters
  const [status, setStatus] = useState('ALL');
  const [role, setRole] = useState('All');
  const [region, setRegion] = useState('');
  const [skillKeyword, setSkillKeyword] = useState('');

  // Sync state whenever modal opens
  useEffect(() => {
    if (visible && currentFilters) {
      setStatus(currentFilters.status || 'ALL');
      setRole(currentFilters.role || 'All');
      setRegion(currentFilters.region || '');
      setSkillKeyword(currentFilters.skillKeyword || '');
    }
  }, [visible, currentFilters]);

  // Apply button handler
  const handleApply = () => {
    onApply({
      status,
      role,
      region: region.trim(),
      skillKeyword: skillKeyword.trim(),
    });
    onClose();
  };

  // Cancel Filter: Discard unsaved changes and close
  const handleCancel = () => {
    onClose();
  };

  // Clear Filter: Reset all criteria back to default
  const handleClear = () => {
    setStatus('ALL');
    setRole('All');
    setRegion('');
    setSkillKeyword('');
    onApply({
      status: 'ALL',
      role: 'All',
      region: '',
      skillKeyword: '',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme?.card || '#181b1f',
              borderColor: theme?.cardBorder || '#242830',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Header Row */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme?.text || '#ffffff' }]}>
                FILTER TALENT DIRECTORY
              </Text>
              <Text style={[styles.subTitle, { color: theme?.textSecondary || '#9ca3af' }]}>
                Narrow creatives by availability, role, and location
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeX, { color: theme?.textSecondary || '#9ca3af' }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Availability Status */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af' }]}>
              AVAILABILITY STATUS
            </Text>
            <View style={styles.btnRow}>
              {[
                { id: 'ALL', label: 'All Creatives' },
                { id: 'AVAILABLE', label: '🟢 Available Only' },
                { id: 'BUSY', label: '⚪ Busy' },
              ].map((item) => {
                const isSelected = status === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.surface || '#121417'),
                        borderColor: theme?.cardBorder || '#242830',
                      },
                    ]}
                    onPress={() => setStatus(item.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : (theme?.text || '#ffffff'), fontWeight: isSelected ? '800' : '500' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Department / Primary Role */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              PRIMARY DEPARTMENT / ROLE
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {DEPARTMENTS.map((dept) => {
                const isSelected = role === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.surface || '#121417'),
                        borderColor: theme?.cardBorder || '#242830',
                        marginRight: 6,
                      },
                    ]}
                    onPress={() => setRole(dept)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : (theme?.text || '#ffffff'), fontWeight: isSelected ? '800' : '500' },
                      ]}
                    >
                      {dept}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Region / City */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              REGION / CITY / LOCATION
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme?.surface || '#121417',
                  color: theme?.text || '#ffffff',
                  borderColor: theme?.cardBorder || '#242830',
                },
              ]}
              placeholder="e.g. Los Angeles, London, Mumbai, Atlanta..."
              placeholderTextColor={theme?.textMuted || '#64748b'}
              value={region}
              onChangeText={setRegion}
            />

            {/* Gear or Skill Keywords */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              GEAR OR SKILLS KEYWORD
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme?.surface || '#121417',
                  color: theme?.text || '#ffffff',
                  borderColor: theme?.cardBorder || '#242830',
                },
              ]}
              placeholder="e.g. Alexa Mini LF, Anamorphic, Dolby Atmos..."
              placeholderTextColor={theme?.textMuted || '#64748b'}
              value={skillKeyword}
              onChangeText={setSkillKeyword}
            />

            {/* Bottom Actions: Cancel, Clear, and Apply */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: theme?.cardBorder || '#242830' }]}
                onPress={handleClear}
              >
                <Text style={{ color: theme?.textSecondary || '#9ca3af', fontWeight: '700', fontSize: 12 }}>
                  Clear Filter
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: theme?.cardBorder || '#242830' }]}
                onPress={handleCancel}
              >
                <Text style={{ color: theme?.text || '#ffffff', fontWeight: '700', fontSize: 12 }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: theme?.primary || '#f5a623' }]}
                onPress={handleApply}
              >
                <Text style={styles.applyBtnText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    height: '84%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeX: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  input: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    paddingBottom: 20,
  },
  outlineBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  applyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  applyBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
  },
});