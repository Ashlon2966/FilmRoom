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
import {
  ROLE_CATEGORIES,
  INDUSTRY_ROLES,
  UNION_STATUSES,
  AVAILABILITY_STATUS,
  getRolesByCategory,
} from '../config/rolesConfig';

export default function FilterModal({ visible, currentFilters, onClose, onApply }) {
  const { theme } = useTheme();

  // Local state initialized with current active filters
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [role, setRole] = useState('All');
  const [representation, setRepresentation] = useState('ALL');
  const [unionStatus, setUnionStatus] = useState('All');
  const [region, setRegion] = useState('');
  const [skillKeyword, setSkillKeyword] = useState('');

  // Sync state whenever modal opens
  useEffect(() => {
    if (visible && currentFilters) {
      setStatus(currentFilters.status || 'ALL');
      setCategory(currentFilters.category || 'ALL');
      setRole(currentFilters.role || 'All');
      setRepresentation(currentFilters.representation || 'ALL');
      setUnionStatus(currentFilters.unionStatus || 'All');
      setRegion(currentFilters.region || '');
      setSkillKeyword(currentFilters.skillKeyword || '');
    }
  }, [visible, currentFilters]);

  // Handle Category selection change (resets role to 'All' if previous role does not match category)
  const handleCategorySelect = (catKey) => {
    setCategory(catKey);
    setRole('All');
  };

  // Get available roles for the current category selection
  const rolesList =
    category === 'ALL'
      ? ['All', ...INDUSTRY_ROLES.map((r) => r.name)]
      : ['All', ...getRolesByCategory(category).map((r) => r.name)];

  // Apply button handler
  const handleApply = () => {
    onApply({
      status,
      category,
      role,
      representation,
      unionStatus,
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
    setCategory('ALL');
    setRole('All');
    setRepresentation('ALL');
    setUnionStatus('All');
    setRegion('');
    setSkillKeyword('');
    onApply({
      status: 'ALL',
      category: 'ALL',
      role: 'All',
      representation: 'ALL',
      unionStatus: 'All',
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
                Multi-variable deterministic professional filter
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeX, { color: theme?.textSecondary || '#9ca3af' }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* 1. Availability Status */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af' }]}>
              AVAILABILITY STATUS
            </Text>
            <View style={styles.btnRow}>
              {[
                { id: 'ALL', label: 'All Creatives' },
                { id: AVAILABILITY_STATUS.AVAILABLE, label: '🟢 Available for Hire' },
                { id: AVAILABILITY_STATUS.BUSY, label: '⚪ On Production (Busy)' },
                { id: AVAILABILITY_STATUS.AVAILABLE_FROM, label: '🟡 Available Soon' },
                { id: AVAILABILITY_STATUS.UNAVAILABLE, label: '🔴 Unavailable' },
              ].map((item) => {
                const isSelected = status === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.surface || '#121417'),
                        borderColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.cardBorder || '#242830'),
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

            {/* 2. Industry Pillar / Category */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              INDUSTRY PILLAR
            </Text>
            <View style={styles.btnRow}>
              {[
                { id: 'ALL', label: 'All Pillars' },
                { id: ROLE_CATEGORIES.TALENT, label: 'Talent & Crafts' },
                { id: ROLE_CATEGORIES.PRODUCTION, label: 'Production & Hiring' },
                { id: ROLE_CATEGORIES.REPRESENTATION, label: 'Representation' },
              ].map((item) => {
                const isSelected = category === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.surface || '#121417'),
                        borderColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.cardBorder || '#242830'),
                      },
                    ]}
                    onPress={() => handleCategorySelect(item.id)}
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

            {/* 3. Primary Role */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              PRIMARY ROLE ({rolesList.length - 1} AVAILABLE)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {rolesList.map((rName) => {
                const isSelected = role === rName;
                return (
                  <TouchableOpacity
                    key={rName}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.surface || '#121417'),
                        borderColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.cardBorder || '#242830'),
                        marginRight: 6,
                      },
                    ]}
                    onPress={() => setRole(rName)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : (theme?.text || '#ffffff'), fontWeight: isSelected ? '800' : '500' },
                      ]}
                    >
                      {rName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 4. Representation Gateway */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              REPRESENTATION STATUS
            </Text>
            <View style={styles.btnRow}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'REPRESENTED', label: '🏛 Agency / Managed' },
                { id: 'SELF', label: '👤 Self-Represented' },
              ].map((item) => {
                const isSelected = representation === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.surface || '#121417'),
                        borderColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.cardBorder || '#242830'),
                      },
                    ]}
                    onPress={() => setRepresentation(item.id)}
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

            {/* 5. Union Status */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              UNION AFFILIATION
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {['All', ...UNION_STATUSES].map((u) => {
                const isSelected = unionStatus === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.surface || '#121417'),
                        borderColor: isSelected ? (theme?.primary || '#f5a623') : (theme?.cardBorder || '#242830'),
                        marginRight: 6,
                      },
                    ]}
                    onPress={() => setUnionStatus(u)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : (theme?.text || '#ffffff'), fontWeight: isSelected ? '800' : '500' },
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 6. Region / City */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              PRIMARY PRODUCTION REGION / CITY
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

            {/* 7. Skills, Equipment, or Language Keyword */}
            <Text style={[styles.label, { color: theme?.textSecondary || '#9ca3af', marginTop: 16 }]}>
              SKILLS, GEAR, OR LANGUAGE KEYWORD
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
              placeholder="e.g. Alexa Mini LF, Spanish, French, Stunts, Avid..."
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
    height: '88%',
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
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
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