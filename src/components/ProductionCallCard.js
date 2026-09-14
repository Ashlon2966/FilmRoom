import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { streamUserApplicationForCall, REQUEST_STATUS } from '../services/contactRequestService';
import ManageApplicationModal from './ManageApplicationModal';

export default function ProductionCallCard({ project, onExpressInterest, onApply, onViewLead, onEditCall }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const [showRequirements, setShowRequirements] = useState(false);
  const [myApplication, setMyApplication] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !project?.id || (currentUser.uid && project.createdBy === currentUser.uid)) {
      setMyApplication(null);
      return;
    }

    const unsub = streamUserApplicationForCall(project.id, currentUser.uid, (app) => {
      setMyApplication(app);
    });

    return () => unsub();
  }, [project?.id, currentUser?.uid, project?.createdBy]);

  if (!project) return null;

  const isOwner = currentUser?.uid && project.createdBy === currentUser.uid;
  const hasDetailedPositions = project.crewPositions && project.crewPositions.length > 0;
  const isCasting = project.postType === 'CASTING_CALL';
  const hasScriptSides = project.hasDraftScript || !!project.draftScriptUrl || !!project.scriptSidesUrl;
  const handleApplyPress = onApply || onExpressInterest;

  return (
    <View style={[styles.card, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          {isCasting ? (
            <View style={styles.castingTag}>
              <Text style={styles.castingTagText}>🎭 CASTING CALL</Text>
            </View>
          ) : (
            <View style={styles.stageTag}>
              <Text style={styles.stageText}>{project.stage || 'PRE-PROD'}</Text>
            </View>
          )}
          {project.rolePosition && (
            <View style={styles.rolePositionTag}>
              <Text style={styles.rolePositionText}>
                {project.rolePosition.includes('Lead') ? '👑 ' : project.rolePosition.includes('Antagonist') ? '⚡ ' : '👤 '}
                {project.rolePosition}
              </Text>
            </View>
          )}
          {project.acceptRemote && (
            <View style={styles.remoteTag}>
              <Text style={styles.remoteText}>🌐 Remote Eligible</Text>
            </View>
          )}
          {myApplication ? (
            <View
              style={[
                styles.appliedTag,
                {
                  backgroundColor:
                    myApplication.status === 'ACCEPTED'
                      ? '#1e3d29'
                      : myApplication.status === 'PENDING'
                      ? '#2a2215'
                      : myApplication.status === 'DECLINED'
                      ? '#332020'
                      : '#1e2430',
                  borderColor:
                    myApplication.status === 'ACCEPTED'
                      ? '#4ade80'
                      : myApplication.status === 'PENDING'
                      ? '#f5a623'
                      : myApplication.status === 'DECLINED'
                      ? '#f87171'
                      : '#64748b',
                },
              ]}
            >
              <Text
                style={[
                  styles.appliedTagText,
                  {
                    color:
                      myApplication.status === 'ACCEPTED'
                        ? '#4ade80'
                        : myApplication.status === 'PENDING'
                        ? '#f5a623'
                        : myApplication.status === 'DECLINED'
                        ? '#f87171'
                        : '#94a3b8',
                  },
                ]}
              >
                {myApplication.status === 'ACCEPTED'
                  ? '✓ Confirmed'
                  : myApplication.status === 'PENDING'
                  ? '✓ Applied • Pending'
                  : myApplication.status === 'DECLINED'
                  ? '✕ Declined'
                  : '↩ Withdrawn'}
              </Text>
            </View>
          ) : null}
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

      {/* Casting Specific: Character Name & Gender Demographics */}
      {isCasting && (
        <View style={styles.castingMetaRow}>
          {project.characterName && (
            <View style={styles.charBadge}>
              <Text style={styles.charBadgeLabel}>ROLE / CHARACTER:</Text>
              <Text style={[styles.charBadgeValue, { color: theme.text || '#ffffff' }]}>
                {project.characterName}
              </Text>
            </View>
          )}
          {project.genderPreference && (
            <View style={[styles.genderChip, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
              <Text style={[styles.genderChipText, { color: theme.textSecondary || '#9ca3af' }]}>
                👤 {project.genderPreference}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Synopsis / Character Breakdown / Logline */}
      <Text style={[styles.logline, { color: theme.text || '#ffffff' }]} numberOfLines={3}>
        {project.characterDescription || project.logline || project.description}
      </Text>

      {/* Script Sides Locked Indicator */}
      {isCasting && hasScriptSides && (
        <View style={[styles.scriptSidesBadge, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
          <Text style={styles.scriptSidesText}>
            🔒 Draft Script / Sides Attached • Unlocked upon director confirmation
          </Text>
        </View>
      )}

      {/* Needed Roles Chips (Non-casting or supplemental) */}
      {!isCasting && project.neededRoles && project.neededRoles.length > 0 && (
        <View style={styles.rolesRow}>
          {project.neededRoles.map((r, i) => (
            <View key={i} style={[styles.roleChip, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
              <Text style={[styles.roleChipText, { color: theme.text || '#ffffff' }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}

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
        📅 {isCasting ? 'Auditions / Shoot: ' : 'Shoot Window: '}{project.dates || 'TBD'} • 👥 Status: Accepting Submissions
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
        ) : myApplication ? (
          myApplication.status === 'PENDING' ? (
            <TouchableOpacity
              style={[styles.manageBtn, { backgroundColor: theme.surface || '#121417', borderColor: theme.primary || '#f5a623' }]}
              onPress={() => setIsManageModalOpen(true)}
            >
              <Text style={[styles.manageBtnText, { color: theme.primary || '#f5a623' }]}>
                Manage Application ➔
              </Text>
            </TouchableOpacity>
          ) : myApplication.status === 'ACCEPTED' ? (
            <TouchableOpacity
              style={[styles.manageBtn, { backgroundColor: '#1e3d29', borderColor: '#4ade80' }]}
              onPress={() => setIsManageModalOpen(true)}
            >
              <Text style={[styles.manageBtnText, { color: '#4ade80' }]}>
                ✓ View Confirmation
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.expressBtn, { backgroundColor: theme.primary || '#f5a623' }]}
              onPress={() => setIsManageModalOpen(true)}
            >
              <Text style={[styles.expressText, { color: '#000000' }]}>
                Reapply ➔
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={[styles.expressBtn, { backgroundColor: theme.primary || '#f5a623' }]}
            onPress={handleApplyPress}
          >
            <Text style={styles.expressText}>
              {isCasting ? '🎭 Apply ➔' : 'Apply ➔'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ManageApplicationModal
        visible={isManageModalOpen}
        application={myApplication}
        callData={project}
        onClose={() => setIsManageModalOpen(false)}
        onApplicationUpdated={(app) => setMyApplication(app)}
      />
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
  castingTag: {
    backgroundColor: '#281a3d',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  castingTagText: {
    color: '#c084fc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rolePositionTag: {
    backgroundColor: '#1e2430',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  rolePositionText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '700',
  },
  appliedTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  appliedTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  manageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  castingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  charBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#1f1b13',
    borderWidth: 1,
    borderColor: '#d97706',
  },
  charBadgeLabel: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  charBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  genderChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  genderChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scriptSidesBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginVertical: 4,
  },
  scriptSidesText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
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