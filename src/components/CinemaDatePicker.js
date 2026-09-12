import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO, isValid, isBefore, startOfDay } from 'date-fns';
import { useTheme } from '../context/ThemeContext';

/**
 * Safely format a date value into human-readable string: '15 Sep 2026'
 */
export const formatDisplayDate = (val) => {
  if (!val) return '';
  if (val instanceof Date && isValid(val)) {
    return format(val, 'dd MMM yyyy');
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return '';
    const isoParsed = parseISO(trimmed);
    if (isValid(isoParsed)) {
      return format(isoParsed, 'dd MMM yyyy');
    }
    const standardParsed = new Date(trimmed);
    if (isValid(standardParsed)) {
      return format(standardParsed, 'dd MMM yyyy');
    }
    return trimmed;
  }
  return '';
};

/**
 * Safely parse any date value into a JavaScript Date object.
 */
export const parseToDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date && isValid(val)) return val;
  if (typeof val === 'string') {
    const iso = parseISO(val.trim());
    if (isValid(iso)) return iso;
    const std = new Date(val.trim());
    if (isValid(std)) return std;
  }
  return new Date();
};

/**
 * Single Date Picker Field
 * Renders a tap-to-select native date picker with formatted display and safe cancellation.
 */
export function SingleDatePickerField({
  label,
  value,
  onChangeDate,
  placeholder = 'Select date...',
  editable = true,
  minDate,
  maxDate,
}) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => parseToDate(value));

  const displayString = formatDisplayDate(value);

  const handleOpenPicker = () => {
    if (!editable) return;
    setTempDate(parseToDate(value));
    setShowPicker(true);
  };

  const handleNativeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      // 'set' indicates user pressed OK with selected date
      // 'dismissed' indicates user pressed Cancel or tapped outside (preserve previous selection)
      if (event.type === 'set' && selectedDate) {
        const formatted = format(selectedDate, 'dd MMM yyyy');
        if (onChangeDate) {
          onChangeDate(formatted, selectedDate);
        }
      }
    } else {
      // iOS
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleIosConfirm = () => {
    setShowPicker(false);
    const formatted = format(tempDate, 'dd MMM yyyy');
    if (onChangeDate) {
      onChangeDate(formatted, tempDate);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label.toUpperCase()}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.fieldBox,
          {
            backgroundColor: theme.surface,
            borderColor: theme.cardBorder,
            opacity: editable ? 1 : 0.6,
          },
        ]}
        onPress={handleOpenPicker}
        activeOpacity={editable ? 0.7 : 1}
        disabled={!editable}
      >
        <Text style={styles.calendarIcon}>📅</Text>
        <Text
          style={[
            styles.valueText,
            { color: displayString ? theme.text : theme.textMuted },
          ]}
          numberOfLines={1}
        >
          {displayString || placeholder}
        </Text>
      </TouchableOpacity>

      {/* Android Native Picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={parseToDate(value)}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          onChange={handleNativeChange}
        />
      )}

      {/* iOS Modal Picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.iosPickerCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <View style={styles.iosHeaderRow}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.iosCancelText, { color: theme.textMuted }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitle, { color: theme.text }]}>
                  {label || 'Select Date'}
                </Text>
                <TouchableOpacity onPress={handleIosConfirm}>
                  <Text style={[styles.iosDoneText, { color: theme.primary }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={handleNativeChange}
                textColor={theme.text}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/**
 * Date Range Picker Field
 * Features:
 * - Independent From Date and To Date native pickers
 * - Inline validation (To Date cannot precede From Date)
 * - Auto-prompts user if From Date changes and invalidates existing To Date
 * - Cancellation safety (preserves existing selected dates on cancel)
 * - Clean human-readable display: 'From: 15 Sep 2026', 'To: 30 Sep 2026'
 */
export function DateRangePickerField({
  label,
  startDate,
  endDate,
  onChangeRange,
  editable = true,
}) {
  const { theme } = useTheme();

  // Active picker state: null | 'START' | 'END'
  const [activePicker, setActivePicker] = useState(null);
  const [iosTempDate, setIosTempDate] = useState(new Date());

  const formattedStart = formatDisplayDate(startDate);
  const formattedEnd = formatDisplayDate(endDate);

  // Validation logic
  let validationError = null;
  if (startDate && endDate) {
    const startD = parseToDate(startDate);
    const endD = parseToDate(endDate);
    if (isValid(startD) && isValid(endD)) {
      if (isBefore(startOfDay(endD), startOfDay(startD))) {
        validationError = 'To Date cannot be before From Date. Please select a valid range.';
      }
    }
  }

  const handleOpenPicker = (target) => {
    if (!editable) return;
    const curVal = target === 'START' ? startDate : endDate;
    setIosTempDate(parseToDate(curVal));
    setActivePicker(target);
  };

  const handleNativeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      const target = activePicker;
      setActivePicker(null);

      // Safe cancellation handling
      if (event.type !== 'set' || !selectedDate) {
        return; // Preserves existing values
      }

      const formatted = format(selectedDate, 'dd MMM yyyy');

      if (target === 'START') {
        let newEnd = endDate;
        // If From Date moves past existing To Date, clear or adjust To Date
        if (endDate) {
          const endObj = parseToDate(endDate);
          if (isValid(endObj) && isBefore(startOfDay(endObj), startOfDay(selectedDate))) {
            newEnd = ''; // Require user to select valid To date
          }
        }

        if (onChangeRange) {
          onChangeRange({
            startDate: formatted,
            endDate: newEnd,
            formattedRange: newEnd ? `${formatted} – ${newEnd}` : formatted,
          });
        }
      } else if (target === 'END') {
        if (onChangeRange) {
          onChangeRange({
            startDate: startDate || '',
            endDate: formatted,
            formattedRange: startDate ? `${startDate} – ${formatted}` : formatted,
          });
        }
      }
    } else {
      // iOS
      if (selectedDate) {
        setIosTempDate(selectedDate);
      }
    }
  };

  const handleIosConfirm = () => {
    const target = activePicker;
    setActivePicker(null);
    const formatted = format(iosTempDate, 'dd MMM yyyy');

    if (target === 'START') {
      let newEnd = endDate;
      if (endDate) {
        const endObj = parseToDate(endDate);
        if (isValid(endObj) && isBefore(startOfDay(endObj), startOfDay(iosTempDate))) {
          newEnd = '';
        }
      }
      if (onChangeRange) {
        onChangeRange({
          startDate: formatted,
          endDate: newEnd,
          formattedRange: newEnd ? `${formatted} – ${newEnd}` : formatted,
        });
      }
    } else if (target === 'END') {
      if (onChangeRange) {
        onChangeRange({
          startDate: startDate || '',
          endDate: formatted,
          formattedRange: startDate ? `${startDate} – ${formatted}` : formatted,
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label.toUpperCase()}
        </Text>
      )}

      {/* From & To Touch Fields */}
      <View style={styles.rangeRow}>
        {/* From Date Box */}
        <View style={styles.rangeCol}>
          <Text style={[styles.subLabel, { color: theme.textMuted }]}>FROM DATE</Text>
          <TouchableOpacity
            style={[
              styles.fieldBox,
              {
                backgroundColor: theme.surface,
                borderColor: theme.cardBorder,
                opacity: editable ? 1 : 0.6,
              },
            ]}
            onPress={() => handleOpenPicker('START')}
            activeOpacity={editable ? 0.7 : 1}
            disabled={!editable}
          >
            <Text style={styles.calendarIcon}>📅</Text>
            <Text
              style={[
                styles.valueText,
                { color: formattedStart ? theme.text : theme.textMuted },
              ]}
              numberOfLines={1}
            >
              {formattedStart ? `From: ${formattedStart}` : 'Select From...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* To Date Box */}
        <View style={styles.rangeCol}>
          <Text style={[styles.subLabel, { color: theme.textMuted }]}>TO DATE</Text>
          <TouchableOpacity
            style={[
              styles.fieldBox,
              {
                backgroundColor: theme.surface,
                borderColor: validationError ? theme.danger : theme.cardBorder,
                opacity: editable ? 1 : 0.6,
              },
            ]}
            onPress={() => handleOpenPicker('END')}
            activeOpacity={editable ? 0.7 : 1}
            disabled={!editable}
          >
            <Text style={styles.calendarIcon}>📅</Text>
            <Text
              style={[
                styles.valueText,
                {
                  color: validationError
                    ? theme.danger
                    : formattedEnd
                    ? theme.text
                    : theme.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {formattedEnd ? `To: ${formattedEnd}` : 'Select To...'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inline Validation Warning */}
      {validationError ? (
        <View style={styles.validationBox}>
          <Text style={[styles.validationText, { color: theme.danger }]}>
            ⚠️ {validationError}
          </Text>
        </View>
      ) : null}

      {/* Android Picker */}
      {Platform.OS === 'android' && activePicker && (
        <DateTimePicker
          value={
            activePicker === 'START'
              ? parseToDate(startDate)
              : parseToDate(endDate || startDate)
          }
          mode="date"
          display="default"
          minimumDate={activePicker === 'END' && startDate ? parseToDate(startDate) : undefined}
          onChange={handleNativeChange}
        />
      )}

      {/* iOS Modal Picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={!!activePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.iosPickerCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <View style={styles.iosHeaderRow}>
                <TouchableOpacity onPress={() => setActivePicker(null)}>
                  <Text style={[styles.iosCancelText, { color: theme.textMuted }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitle, { color: theme.text }]}>
                  {activePicker === 'START' ? 'Select Start Date' : 'Select End Date'}
                </Text>
                <TouchableOpacity onPress={handleIosConfirm}>
                  <Text style={[styles.iosDoneText, { color: theme.primary }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={iosTempDate}
                mode="date"
                display="spinner"
                minimumDate={activePicker === 'END' && startDate ? parseToDate(startDate) : undefined}
                onChange={handleNativeChange}
                textColor={theme.text}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rangeCol: {
    flex: 1,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  calendarIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  validationBox: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  validationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  iosPickerCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingBottom: 30,
    paddingTop: 12,
  },
  iosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242830',
  },
  iosTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  iosCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iosDoneText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
