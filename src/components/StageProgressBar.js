import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const PRODUCTION_STAGES = [
  'Idea',
  'Screenplay',
  'Pre-Prod',
  'Production',
  'Post-Prod',
];

export default function StageProgressBar({ currentStageIndex = 0, onSelectStage }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {PRODUCTION_STAGES.map((stageName, index) => {
        const isCompleted = index < currentStageIndex;
        const isActive = index === currentStageIndex;

        return (
          <TouchableOpacity
            key={stageName}
            style={styles.stageItem}
            onPress={() => onSelectStage && onSelectStage(index)}
            disabled={!onSelectStage}
          >
            <View
              style={[
                styles.circle,
                {
                  backgroundColor: isActive
                    ? theme.primary
                    : isCompleted
                    ? theme.success
                    : theme.surface,
                },
              ]}
            >
              <Text style={styles.circleText}>{index + 1}</Text>
            </View>
            <Text
              style={[
                styles.stageLabel,
                {
                  color: isActive ? theme.text : theme.textSecondary,
                  fontWeight: isActive ? '800' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {stageName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
  },
  stageItem: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  circleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stageLabel: {
    fontSize: 10,
  },
});