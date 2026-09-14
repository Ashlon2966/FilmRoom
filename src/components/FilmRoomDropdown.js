import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function FilmRoomDropdown({
  label,
  options = [],
  selectedValue,
  onSelect,
  placeholder = 'Select an option...',
  allowCustom = false,
  customPlaceholder = 'Enter custom value...',
  disabled = false,
  style,
}) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Normalize options to { label, value, icon, description }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return {
      label: opt.label || opt.title || opt.name || String(opt.value),
      value: opt.value !== undefined ? opt.value : opt.id || opt.label,
      icon: opt.icon,
      description: opt.description,
    };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === selectedValue);
  const displayLabel = selectedOption
    ? (selectedOption.icon ? `${selectedOption.icon}  ${selectedOption.label}` : selectedOption.label)
    : (isCustomMode && customValue ? customValue : selectedValue || placeholder);

  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item) => {
    setIsCustomMode(false);
    onSelect(item.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    setIsOpen(false);
    if (customValue.trim()) {
      onSelect(customValue.trim());
    }
  };

  const handleCustomTextChange = (text) => {
    setCustomValue(text);
    onSelect(text);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary || '#9ca3af' }]}>
          {label}
        </Text>
      ) : null}

      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.triggerBtn,
          {
            backgroundColor: theme.surface || '#121417',
            borderColor: isOpen ? (theme.primary || '#f5a623') : (theme.cardBorder || '#242830'),
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={0.75}
        disabled={disabled}
      >
        <Text
          style={[
            styles.triggerText,
            {
              color: selectedOption || (isCustomMode && customValue) || selectedValue
                ? (theme.text || '#ffffff')
                : (theme.textMuted || '#64748b'),
            },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <Text style={[styles.arrow, { color: theme.textSecondary || '#9ca3af' }]}>▾</Text>
      </TouchableOpacity>

      {/* Custom input if in custom mode */}
      {allowCustom && isCustomMode ? (
        <View style={styles.customWrap}>
          <TextInput
            style={[
              styles.customInput,
              {
                backgroundColor: theme.surface || '#121417',
                borderColor: theme.primary || '#f5a623',
                color: theme.text || '#ffffff',
              },
            ]}
            placeholder={customPlaceholder}
            placeholderTextColor={theme.textMuted || '#64748b'}
            value={customValue}
            onChangeText={handleCustomTextChange}
            autoFocus
          />
          <TouchableOpacity
            style={styles.switchBackBtn}
            onPress={() => setIsOpen(true)}
          >
            <Text style={[styles.switchBackText, { color: theme.primary || '#f5a623' }]}>
              List ▾
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Options Selection Modal */}
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder || '#242830' }]}>
              <Text style={[styles.modalTitle, { color: theme.text || '#ffffff' }]}>
                {label ? `Select ${label}` : 'Select Option'}
              </Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <Text style={[styles.closeX, { color: theme.textSecondary || '#9ca3af' }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search filter if more than 5 options */}
            {normalizedOptions.length > 5 ? (
              <View style={styles.searchWrap}>
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: theme.surface || '#121417',
                      borderColor: theme.cardBorder || '#242830',
                      color: theme.text || '#ffffff',
                    },
                  ]}
                  placeholder="Search options..."
                  placeholderTextColor={theme.textMuted || '#64748b'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            ) : null}

            {/* List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => `${item.value}_${index}`}
              style={{ maxHeight: 340 }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: isSelected ? (theme.surface || '#121417') : 'transparent',
                        borderColor: isSelected ? (theme.primary || '#f5a623') : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSelected ? (theme.primary || '#f5a623') : (theme.text || '#ffffff'),
                            fontWeight: isSelected ? '800' : '500',
                          },
                        ]}
                      >
                        {item.icon ? `${item.icon}  ` : ''}{item.label}
                      </Text>
                      {item.description ? (
                        <Text style={[styles.optionDesc, { color: theme.textMuted || '#64748b' }]}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Text style={[styles.checkMark, { color: theme.primary || '#f5a623' }]}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: theme.textMuted || '#64748b' }]}>
                    No matching options found.
                  </Text>
                </View>
              }
            />

            {/* Custom Option Button */}
            {allowCustom ? (
              <View style={[styles.customOptionFooter, { borderTopColor: theme.cardBorder || '#242830' }]}>
                <TouchableOpacity
                  style={[styles.customOptionBtn, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}
                  onPress={handleSelectCustom}
                >
                  <Text style={[styles.customOptionText, { color: theme.primary || '#f5a623' }]}>
                    ✏️ Enter Custom / Other Value
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
  },
  triggerText: {
    fontSize: 14,
    flex: 1,
  },
  arrow: {
    fontSize: 14,
    marginLeft: 8,
  },
  customWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  customInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  switchBackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  switchBackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  closeX: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 13,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 2,
  },
  optionText: {
    fontSize: 14,
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyWrap: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  customOptionFooter: {
    padding: 12,
    borderTopWidth: 1,
  },
  customOptionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  customOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
