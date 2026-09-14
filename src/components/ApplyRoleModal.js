import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Extracts and normalizes all specified roles from a production or casting call.
 */
export function extractSpecifiedRoles(call) {
  if (!call) return [];
  const list = [];
  const seen = new Set();

  const addRole = (roleName, quantity = 1, requirement = null, category = null, isCasting = false) => {
    if (!roleName || typeof roleName !== 'string') return;
    const trimmed = roleName.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);

    list.push({
      role: trimmed,
      quantity: Number(quantity) || 1,
      requirement: requirement || null,
      category: category || null,
      isCasting,
    });
  };

  // 1. Structured crewRolesRequired or crewPositions
  const structuredPositions = call.crewRolesRequired || call.crewPositions || [];
  if (Array.isArray(structuredPositions)) {
    structuredPositions.forEach((pos) => {
      if (typeof pos === 'string') {
        addRole(pos, 1);
      } else if (pos && typeof pos === 'object') {
        addRole(pos.role, pos.quantity || 1, pos.requirement, pos.category);
      }
    });
  }

  // 2. Needed roles string array
  if (Array.isArray(call.neededRoles)) {
    call.neededRoles.forEach((r) => {
      if (typeof r === 'string') {
        addRole(r, 1);
      }
    });
  }

  // 3. Casting specific: characterName / rolePosition
  if (call.characterName) {
    addRole(
      call.characterName,
      1,
      call.characterDescription || null,
      call.rolePosition || 'Actor / Lead',
      true
    );
  }

  // 4. Fallback: single roleName or lookingFor
  if (call.roleName) {
    addRole(call.roleName, 1);
  }
  if (call.lookingFor) {
    addRole(call.lookingFor, 1);
  }

  return list;
}

/**
 * Pick an icon based on role/department
 */
function getRoleIcon(roleName = '', isCasting = false) {
  if (isCasting) return '🎭';
  const lower = roleName.toLowerCase();
  if (lower.includes('camera') || lower.includes('cinematograph') || lower.includes('dop') || lower.includes('dp')) return '🎥';
  if (lower.includes('sound') || lower.includes('audio') || lower.includes('boom') || lower.includes('mix')) return '🎧';
  if (lower.includes('edit') || lower.includes('color') || lower.includes('post') || lower.includes('vfx')) return '✂️';
  if (lower.includes('director') || lower.includes('ad ') || lower.includes('assistant director')) return '🎬';
  if (lower.includes('light') || lower.includes('grip') || lower.includes('gaffer') || lower.includes('electric')) return '💡';
  if (lower.includes('art') || lower.includes('design') || lower.includes('prop') || lower.includes('set')) return '🎨';
  if (lower.includes('costume') || lower.includes('wardrobe') || lower.includes('makeup')) return '👗';
  if (lower.includes('writ') || lower.includes('script')) return '📝';
  if (lower.includes('produc')) return '💼';
  if (lower.includes('actor') || lower.includes('cast')) return '🎭';
  return '👤';
}

export default function ApplyRoleModal({
  visible,
  call,
  onClose,
  onSelectRole,
}) {
  const { theme } = useTheme();

  const specifiedRoles = useMemo(() => extractSpecifiedRoles(call), [call]);

  const [selectedRole, setSelectedRole] = useState(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customRoleText, setCustomRoleText] = useState('');

  // Reset or pre-select on open
  useEffect(() => {
    if (visible) {
      if (specifiedRoles.length === 1) {
        setSelectedRole(specifiedRoles[0].role);
      } else {
        setSelectedRole(null);
      }
      setIsCustomMode(false);
      setCustomRoleText('');
    }
  }, [visible, specifiedRoles]);

  if (!call) return null;

  const isCasting = call.postType === 'CASTING_CALL' || !!call.characterName;

  const handleSelectRoleItem = (roleItem) => {
    setIsCustomMode(false);
    setSelectedRole(roleItem.role);
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    setSelectedRole(null);
  };

  const activeRoleName = isCustomMode ? customRoleText.trim() : selectedRole;
  const canProceed = Boolean(activeRoleName);

  const handleConfirm = () => {
    if (!canProceed) return;
    const meta = specifiedRoles.find((r) => r.role === activeRoleName) || {
      role: activeRoleName,
      quantity: 1,
      isCustom: isCustomMode,
    };
    onSelectRole(activeRoleName, meta);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.surface || '#181b1f',
              borderColor: theme.cardBorder || '#242830',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: isCasting ? '#3b1c1c' : '#1e3d29',
                      borderColor: isCasting ? '#f87171' : '#4ade80',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: isCasting ? '#f87171' : '#4ade80' },
                    ]}
                  >
                    {isCasting ? '🎭 CASTING CALL' : '🎬 CREW CALL'}
                  </Text>
                </View>
                {call.compensationTier && (
                  <Text style={[styles.compText, { color: theme.primary || '#f5a623' }]}>
                    {call.compensationTier}
                  </Text>
                )}
              </View>

              <Text style={[styles.projectTitle, { color: theme.text || '#ffffff' }]} numberOfLines={1}>
                {call.title || call.projectName || 'Production Call'}
              </Text>
              <Text style={[styles.projectSubtitle, { color: theme.textSecondary || '#9ca3af' }]}>
                Lead: {call.director || 'Production Lead'} • 📍 {call.location || 'Worldwide'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.closeText, { color: theme.textMuted || '#64748b' }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Section Description */}
          <View style={[styles.promptBox, { backgroundColor: theme.card || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.promptTitle, { color: theme.primary || '#f5a623' }]}>
              WHICH ROLE ARE YOU APPLYING FOR?
            </Text>
            <Text style={[styles.promptSub, { color: theme.textSecondary || '#9ca3af' }]}>
              {specifiedRoles.length > 0
                ? 'Select one of the specified positions required for this production to attach with your showreel/application:'
                : 'Specify your craft or position for consideration by the production lead:'}
            </Text>
          </View>

          {/* List of Specified Roles */}
          <ScrollView
            style={styles.rolesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {specifiedRoles.map((item, idx) => {
              const isSelected = !isCustomMode && selectedRole === item.role;
              const icon = getRoleIcon(item.role, item.isCasting);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: isSelected
                        ? theme.surfaceActive || '#232014'
                        : theme.card || '#121417',
                      borderColor: isSelected
                        ? theme.primary || '#f5a623'
                        : theme.cardBorder || '#242830',
                    },
                  ]}
                  onPress={() => handleSelectRoleItem(item)}
                  activeOpacity={0.7}
                >
                  {/* Radio Button Indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected
                          ? theme.primary || '#f5a623'
                          : theme.cardBorder || '#242830',
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: theme.primary || '#f5a623' },
                        ]}
                      />
                    )}
                  </View>

                  {/* Icon & Title */}
                  <Text style={styles.roleIcon}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.roleTitleRow}>
                      <Text
                        style={[
                          styles.roleName,
                          {
                            color: isSelected
                              ? theme.primary || '#f5a623'
                              : theme.text || '#ffffff',
                          },
                        ]}
                      >
                        {item.role}
                      </Text>

                      {item.quantity > 1 && (
                        <View style={[styles.qtyBadge, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                          <Text style={[styles.qtyBadgeText, { color: theme.textSecondary || '#9ca3af' }]}>
                            Qty: {item.quantity}
                          </Text>
                        </View>
                      )}

                      {item.category && item.category !== 'General' && (
                        <View style={[styles.qtyBadge, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                          <Text style={[styles.qtyBadgeText, { color: theme.textMuted || '#64748b' }]}>
                            {item.category}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Requirement or description snippet if present */}
                    {item.requirement && (
                      <Text style={[styles.reqSnippet, { color: theme.textMuted || '#64748b' }]} numberOfLines={2}>
                        {item.requirement}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Option to apply for another / unlisted position */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                {
                  backgroundColor: isCustomMode
                    ? theme.surfaceActive || '#232014'
                    : theme.card || '#121417',
                  borderColor: isCustomMode
                    ? theme.primary || '#f5a623'
                    : theme.cardBorder || '#242830',
                },
              ]}
              onPress={handleSelectCustom}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isCustomMode
                      ? theme.primary || '#f5a623'
                      : theme.cardBorder || '#242830',
                  },
                ]}
              >
                {isCustomMode && (
                  <View
                    style={[
                      styles.radioDot,
                      { backgroundColor: theme.primary || '#f5a623' },
                    ]}
                  />
                )}
              </View>

              <Text style={styles.roleIcon}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.roleName,
                    {
                      color: isCustomMode
                        ? theme.primary || '#f5a623'
                        : theme.text || '#ffffff',
                    },
                  ]}
                >
                  Other / Unlisted Department Position
                </Text>
                <Text style={[styles.reqSnippet, { color: theme.textMuted || '#64748b' }]}>
                  Pitch for a specialized craft not explicitly enumerated above
                </Text>
              </View>
            </TouchableOpacity>

            {/* Custom Role Input field (visible only when custom option is selected) */}
            {isCustomMode && (
              <View style={[styles.customInputBox, { backgroundColor: theme.card || '#121417', borderColor: theme.primary || '#f5a623' }]}>
                <Text style={[styles.customInputLabel, { color: theme.primary || '#f5a623' }]}>
                  ENTER CRAFT OR ROLE TITLE *
                </Text>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: theme.surface || '#181b1f',
                      borderColor: theme.cardBorder || '#242830',
                      color: theme.text || '#ffffff',
                    },
                  ]}
                  placeholder="e.g. 1st Assistant Camera, Drone Operator, Production Assistant"
                  placeholderTextColor={theme.textMuted || '#64748b'}
                  value={customRoleText}
                  onChangeText={setCustomRoleText}
                  autoFocus
                />
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.cardBorder || '#242830' }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.cardBorder || '#242830' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: theme.textSecondary || '#9ca3af' }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.continueBtn,
                {
                  backgroundColor: canProceed
                    ? theme.primary || '#f5a623'
                    : '#33373d',
                },
              ]}
              onPress={handleConfirm}
              disabled={!canProceed}
            >
              <Text
                style={[
                  styles.continueText,
                  { color: canProceed ? '#000000' : '#888888' },
                ]}
              >
                Continue to Application ➔
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compText: {
    fontSize: 11,
    fontWeight: '700',
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  projectSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  promptBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  promptTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  promptSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  rolesList: {
    maxHeight: 340,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleIcon: {
    fontSize: 20,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '700',
  },
  qtyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  qtyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  reqSnippet: {
    fontSize: 11,
    marginTop: 2,
  },
  customInputBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  customInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  customInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  continueBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  continueText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
