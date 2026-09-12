import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const CREW_CATEGORIES = [
  {
    key: 'Camera',
    icon: '🎥',
    roles: ['Cinematographer', '1st AC', '2nd AC', 'DIT', 'Steadicam Operator', 'Drone Pilot', 'Camera PA'],
  },
  {
    key: 'Lighting',
    icon: '💡',
    roles: ['Gaffer', 'Best Boy Electric', 'Key Grip', 'Best Boy Grip', 'Dolly Grip', 'Electrician'],
  },
  {
    key: 'Sound',
    icon: '🎙',
    roles: ['Sound Recordist / Mixer', 'Boom Operator', 'Sound Utility'],
  },
  {
    key: 'Art',
    icon: '🎨',
    roles: ['Production Designer', 'Art Director', 'Set Decorator', 'Prop Master', 'Leadman'],
  },
  {
    key: 'Production',
    icon: '📋',
    roles: ['Line Producer', 'UPM', '1st AD', '2nd AD', 'Production Coordinator', 'Key PA'],
  },
  {
    key: 'Costume',
    icon: '👗',
    roles: ['Costume Designer', 'Wardrobe Supervisor', 'Set Costumer'],
  },
  {
    key: 'Makeup',
    icon: '💄',
    roles: ['Key Makeup Artist', 'Hair Stylist', 'SFX Makeup Artist'],
  },
  {
    key: 'Post',
    icon: '💻',
    roles: ['Film Editor', 'Assistant Editor', 'Colorist', 'Sound Designer', 'Composer', 'VFX Artist'],
  },
  {
    key: 'Other',
    icon: '📁',
    roles: ['Script Supervisor', 'Location Manager', 'Stunt Coordinator', 'Catering Lead', 'Custom...'],
  },
];

export default function AddCrewRoleModal({ visible, onClose, onAddRole }) {
  const { theme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState('Camera');
  const [selectedRole, setSelectedRole] = useState('Cinematographer');
  const [customRole, setCustomRole] = useState('');
  const [quantity, setQuantity] = useState(1);

  const activeCategoryObj = CREW_CATEGORIES.find((c) => c.key === selectedCategory) || CREW_CATEGORIES[0];

  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    const cat = CREW_CATEGORIES.find((c) => c.key === catKey);
    if (cat && cat.roles.length > 0) {
      setSelectedRole(cat.roles[0]);
    }
  };

  const handleConfirm = () => {
    const finalRole = selectedRole === 'Custom...' ? customRole.trim() : selectedRole;
    if (!finalRole) {
      Alert.alert('Role Required', 'Please choose a role or type a custom craft title.');
      return;
    }

    onAddRole({
      category: selectedCategory,
      role: finalRole,
      quantity: Math.max(1, quantity),
    });

    // Reset for next addition
    setCustomRole('');
    setQuantity(1);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>ADD REQUIRED ROLE</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Specify department, position, and head count
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Step 1: Department / Category */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>1. CREW CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CREW_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.background,
                          borderColor: theme.cardBorder,
                        },
                      ]}
                      onPress={() => handleSelectCategory(cat.key)}
                    >
                      <Text style={{ fontSize: 13, marginRight: 4 }}>{cat.icon}</Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isSelected ? '#000000' : theme.text,
                        }}
                      >
                        {cat.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Step 2: Specific Role */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>
              2. SPECIFIC ROLE ({selectedCategory.toUpperCase()})
            </Text>
            <View style={styles.roleGrid}>
              {activeCategoryObj.roles.map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: isSelected ? '#1e2430' : theme.background,
                        borderColor: isSelected ? theme.primary : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: isSelected ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedRole === 'Custom...' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder, marginTop: 10 }]}
                placeholder="Type custom crew role (e.g. SFX Armorer)..."
                placeholderTextColor={theme.textMuted}
                value={customRole}
                onChangeText={setCustomRole}
                autoFocus
              />
            )}

            {/* Step 3: Quantity */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 18 }]}>
              3. PEOPLE NEEDED
            </Text>
            <View style={[styles.stepperRow, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                style={[styles.stepperBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
              >
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>−</Text>
              </TouchableOpacity>

              <View style={styles.quantityBox}>
                <Text style={[styles.quantityNumber, { color: theme.primary }]}>{quantity}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                  {quantity === 1 ? 'person' : 'people'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.stepperBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setQuantity((prev) => prev + 1)}
              >
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                Add {quantity} × {selectedRole === 'Custom...' ? customRole || 'Custom' : selectedRole}
              </Text>
            </TouchableOpacity>
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
  card: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
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
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginTop: 8,
  },
  stepperBtn: {
    width: 44,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBox: {
    alignItems: 'center',
  },
  quantityNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  confirmBtn: {
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 22,
  },
  confirmBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
