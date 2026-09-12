import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function ProductionCallCard({ project, onExpressInterest, onViewLead, onEditCall }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const [showRequirements, setShowRequirements] = useState(false);

  const isOwner = currentUser?.uid && project.createdBy === currentUser.uid;
  const hasDetailedPositions = project.crewPositions && project.crewPositions.length > 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.stageTag}>
            <Text style={styles.stageText}>{project.stage || 'PRE-PROD'}</Text>
          </View>
          {project.acceptRemote && (
            <View style={styles.remoteTag}>
              <Text style={styles.remoteText}>🌐 Remote Eligible</Text>
            </View>
          )}
        </View>

        <Text style={[styles.rateText, { color: theme.primary || '#f5a623' }]}>
          {project.compensationTier || project.rate || '$650 - $900/day (Union Scale & Kit)'}
        </Text>
      </View>

      {/* Project Title */}
      <Text style={[styles.title, { color: theme.primary || '#f5a623' }]}>{project.title}</Text>
      <Text style={[styles.directorLocation, { color: theme.textSecondary || '#9ca3af' }]}>
        Lead: {project.director || 'Production Lead'} • 📍 {project.location || 'Location Pending'}
      </Text>

      {/* Synopsis / Logline */}
      <Text style={[styles.logline, { color: theme.text || '#ffffff' }]} numberOfLines={3}>
        {project.logline}
      </Text>

      {/* Needed Roles Chips */}
      <View style={styles.rolesRow}>
        {project.neededRoles?.map((r, i) => (
          <View key={i} style={[styles.roleChip, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.roleChipText, { color: theme.text || '#ffffff' }]}>{r}</Text>
          </View>
        ))}
      </View>

      {/* Detailed Requirements (Expandable) */}
      {hasDetailedPositions && showRequirements && (
        <View style={[styles.positionsBreakdown, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
          <Text style={[styles.breakdownHeader, { color: theme.primary || '#f5a623' }]}>
            ROLE REQUIREMENTS & SPECIFICATIONS:
          </Text>
          {project.crewPositions.map((pos, idx) => (
            <View key={idx} style={styles.positionItem}>
              <View style={styles.positionTitleRow}>
                <Text style={[styles.positionRole, { color: theme.text || '#ffffff' }]}>
                  {pos.role}
                </Text>
                {pos.quantity && (
                  <Text style={[styles.positionQty, { color: theme.textSecondary || '#9ca3af' }]}>
                    Qty: {pos.quantity}
                  </Text>
                )}
              </View>
              {pos.requirement ? (
                <Text style={[styles.positionReq, { color: theme.textSecondary || '#9ca3af' }]}>
                  {pos.requirement}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Dates & Schedule */}
      <Text style={[styles.schedule, { color: theme.textMuted || '#64748b' }]}>
        📅 Shoot Window: {project.dates || 'TBD'} • 👥 Status: Accepting Submissions
      </Text>

      {/* Action Buttons */}
      <View style={styles.btnRow}>
        {hasDetailedPositions && (
          <TouchableOpacity
            style={[styles.detailsBtn, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}
            onPress={() => setShowRequirements(!showRequirements)}
          >
            <Text style={[styles.detailsBtnText, { color: theme.textSecondary || '#9ca3af' }]}>
              {showRequirements ? 'Hide Specs' : 'Role Specs'}
            </Text>
          </TouchableOpacity>
        )}

        {onViewLead && (
          <TouchableOpacity
            style={[styles.detailsBtn, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}
            onPress={onViewLead}
          >
            <Text style={[styles.detailsBtnText, { color: theme.textSecondary || '#9ca3af' }]}>
              Lead Dossier
            </Text>
          </TouchableOpacity>
        )}

        {isOwner ? (
          <TouchableOpacity
            style={[styles.expressBtn, { backgroundColor: theme.primary || '#f5a623' }]}
            onPress={onEditCall}
          >
            <Text style={[styles.expressText, { color: '#000000', fontWeight: '800' }]}>
              ⚙️ Edit Call
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.expressBtn, { backgroundColor: theme.primary || '#f5a623' }]}
            onPress={onExpressInterest}
          >
            <Text style={styles.expressText}>Submit Interest / Reel ➔</Text>
          </TouchableOpacity>
        )}
      </View>
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
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  remoteTag: {
    backgroundColor: '#162b20',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#245237',
  },
  remoteText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700',
  },
  rateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    borderRadius: 6,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  positionsBreakdown: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  breakdownHeader: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  positionItem: {
    marginBottom: 8,
  },
  positionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  positionRole: {
    fontSize: 12,
    fontWeight: '800',
  },
  positionQty: {
    fontSize: 10,
  },
  positionReq: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
    fontStyle: 'italic',
  },
  schedule: {
    fontSize: 11,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expressBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expressText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
});