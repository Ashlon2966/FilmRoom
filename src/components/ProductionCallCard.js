import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ProductionCallCard({ project, onExpressInterest, onAnalyzeMatch }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.stageTag}>
          <Text style={styles.stageText}>{project.stage || 'PRE-PROD'}</Text>
        </View>
        <Text style={[styles.rateText, { color: theme.primary }]}>
          {project.rate || '$650 - $900/day (Union Scale & Kit)'}
        </Text>
      </View>

      {/* Project Title */}
      <Text style={[styles.title, { color: theme.primary }]}>{project.title}</Text>
      <Text style={[styles.directorLocation, { color: theme.textSecondary }]}>
        Dir: {project.director} • 📍 {project.location}
      </Text>

      {/* Synopsis */}
      <Text style={[styles.logline, { color: theme.textSecondary }]} numberOfLines={3}>
        {project.logline}
      </Text>

      {/* Needed Roles */}
      <View style={styles.rolesRow}>
        {project.neededRoles?.map((r, i) => (
          <View key={i} style={[styles.roleChip, { backgroundColor: '#21262d' }]}>
            <Text style={[styles.roleChipText, { color: theme.text }]}>{r}</Text>
          </View>
        ))}
      </View>

      {/* Dates & Applicants */}
      <Text style={[styles.schedule, { color: theme.textMuted }]}>
        📅 {project.dates} • {project.applicantsCount || 0} Applicants
      </Text>

      {/* Action Buttons */}
      <TouchableOpacity
        style={[styles.expressBtn, { backgroundColor: theme.primary }]}
        onPress={onExpressInterest}
      >
        <Text style={styles.expressText}>Express Interest</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.matchBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
        onPress={onAnalyzeMatch}
      >
        <Text style={[styles.matchText, { color: theme.text }]}>✨ Analyze Script & Crew Match</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageTag: {
    backgroundColor: '#1f242d',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  stageText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 4,
  },
  directorLocation: {
    fontSize: 12,
    marginVertical: 4,
  },
  logline: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 6,
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  schedule: {
    fontSize: 11,
    marginBottom: 12,
  },
  expressBtn: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  expressText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  matchBtn: {
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
  },
});