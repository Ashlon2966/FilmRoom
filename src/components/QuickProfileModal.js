import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AVAILABILITY_CONFIG, AVAILABILITY_STATUS } from '../config/rolesConfig';
import { streamFollowerCount } from '../services/followService';

export default function QuickProfileModal({
  visible,
  profile,
  contextInfo,
  onClose,
  onViewFullProfile,
  onReviewRequest,
  onAccept,
  onDecline,
  onConnect,
  connectLabel = '+ Add Connection',
  actionLoading = false,
}) {
  const { theme } = useTheme();

  const [followerCount, setFollowerCount] = useState(
    profile?.followersCount || profile?.followerCount || 0
  );

  useEffect(() => {
    let isMounted = true;
    const targetUid = profile?.id || profile?.uid;
    if (visible && targetUid) {
      const unsub = streamFollowerCount(targetUid, (count) => {
        if (isMounted) setFollowerCount(count);
      });
      return () => {
        isMounted = false;
        unsub();
      };
    }
  }, [visible, profile?.id, profile?.uid]);

  if (!profile) return null;

  const name = profile.fullName || profile.displayName || profile.name || 'Filmmaker';
  const username = profile.username || 'filmmaker';
  const filmRoomId = profile.filmRoomId || null;
  const photoURL = profile.photoURL || profile.avatar || null;
  const bio = profile.bio || profile.shortBio || '';
  const location = profile.location || profile.city || 'Worldwide';

  // Resolve ordered roles
  const primaryRole =
    profile.primaryRole ||
    (Array.isArray(profile.roles) && profile.roles.length > 0 ? profile.roles[0] : profile.role || 'Filmmaker');
  const secondaryRoles = Array.isArray(profile.secondaryRoles) && profile.secondaryRoles.length > 0
    ? profile.secondaryRoles
    : Array.isArray(profile.roles) && profile.roles.length > 1
    ? profile.roles.slice(1)
    : [];

  // Availability
  let availKey = AVAILABILITY_STATUS.AVAILABLE;
  let availDate = null;
  if (profile.availability) {
    if (typeof profile.availability === 'object') {
      availKey = profile.availability.status || AVAILABILITY_STATUS.AVAILABLE;
      availDate = profile.availability.availableFromDate || null;
    } else if (typeof profile.availability === 'string') {
      availKey = profile.availability;
    }
  } else if (profile.isAvailable === false) {
    availKey = AVAILABILITY_STATUS.BUSY;
  }
  const availCfg = AVAILABILITY_CONFIG[availKey] || AVAILABILITY_CONFIG[AVAILABILITY_STATUS.AVAILABLE];
  const availLabel =
    availKey === AVAILABILITY_STATUS.AVAILABLE_FROM && availDate
      ? `Available from: ${availDate}`
      : availCfg.label;

  // Showreel / Portfolio link
  const showreelUrl = profile.showreelUrl || profile.portfolioUrl || profile.reel || profile.details?.portfolioOrReel || null;

  // Representation
  const isRepresented = !!profile.representation?.isRepresented;
  const repAgency = profile.representation?.agencyName || profile.representation?.managerName;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <View style={styles.topBar}>
            <Text style={[styles.cardHeaderTag, { color: theme.primary || '#f5a623' }]}>
              FILMMAKER QUICK DOSSIER
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.closeIcon, { color: theme.textSecondary || '#9ca3af' }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Identity Row */}
            <View style={styles.identityRow}>
              <View
                style={[
                  styles.avatarWrapper,
                  { backgroundColor: theme.surface || '#121417', borderColor: theme.primary || '#f5a623' },
                ]}
              >
                {photoURL ? (
                  <Image source={{ uri: photoURL }} style={styles.avatar} />
                ) : (
                  <Text style={[styles.avatarFallback, { color: theme.primary || '#f5a623' }]}>
                    {name[0]?.toUpperCase() || 'F'}
                  </Text>
                )}
              </View>

              <View style={styles.identityCol}>
                <Text style={[styles.nameText, { color: theme.text || '#ffffff' }]} numberOfLines={1}>
                  {name.toUpperCase()}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  <Text style={[styles.userHandle, { color: theme.textSecondary || '#9ca3af' }]}>
                    @{username} {filmRoomId ? `• ${filmRoomId}` : ''}
                  </Text>
                  <View style={[styles.followerPill, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                    <Text style={[styles.followerPillText, { color: theme.primary || '#f5a623' }]}>
                      👥 {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.locationText, { color: theme.textMuted || '#64748b' }]}>
                  📍 {location}
                </Text>
              </View>
            </View>

            {/* Context Info Banner if supplied (e.g. "Applicant for: Cinematographer") */}
            {contextInfo ? (
              <View
                style={[
                  styles.contextBanner,
                  { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' },
                ]}
              >
                <Text style={[styles.contextText, { color: theme.primary || '#f5a623' }]}>
                  📌 {contextInfo}
                </Text>
              </View>
            ) : null}

            {/* Roles Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                PRIMARY ROLE
              </Text>
              <View style={styles.roleRow}>
                <View
                  style={[
                    styles.primaryRoleChip,
                    { backgroundColor: theme.primary || '#f5a623' },
                  ]}
                >
                  <Text style={styles.primaryRoleText}>{primaryRole}</Text>
                </View>
              </View>

              {secondaryRoles.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary || '#9ca3af', marginTop: 10 }]}>
                    SECONDARY CRAFTS ({secondaryRoles.length})
                  </Text>
                  <View style={styles.rolesWrap}>
                    {secondaryRoles.map((r, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.secondaryRoleChip,
                          {
                            backgroundColor: theme.surface || '#121417',
                            borderColor: theme.cardBorder || '#242830',
                          },
                        ]}
                      >
                        <Text style={[styles.secondaryRoleText, { color: theme.text || '#ffffff' }]}>
                          {r}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* Availability & Representation Badges */}
            <View style={styles.badgeRow}>
              <View style={[styles.metaBadge, { backgroundColor: availCfg.bgColor, borderColor: availCfg.color }]}>
                <Text style={[styles.metaBadgeText, { color: availCfg.color }]}>
                  {availCfg.icon} {availLabel}
                </Text>
              </View>

              {isRepresented && (
                <View
                  style={[
                    styles.metaBadge,
                    { backgroundColor: '#1e293b', borderColor: '#38bdf8' },
                  ]}
                >
                  <Text style={[styles.metaBadgeText, { color: '#38bdf8' }]}>
                    🏢 Rep: {repAgency || 'Represented'}
                  </Text>
                </View>
              )}
            </View>

            {/* Short Bio */}
            {bio ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                  ABOUT
                </Text>
                <Text style={[styles.bioText, { color: theme.text || '#ffffff' }]} numberOfLines={3}>
                  {bio}
                </Text>
              </View>
            ) : null}

            {/* Showreel Indicator & Quick Preview */}
            {showreelUrl ? (
              <TouchableOpacity
                style={[
                  styles.reelBtn,
                  { backgroundColor: theme.surface || '#121417', borderColor: theme.primary || '#f5a623' },
                ]}
                onPress={() => Linking.openURL(showreelUrl).catch(() => {})}
                activeOpacity={0.8}
              >
                <Text style={[styles.reelBtnText, { color: theme.primary || '#f5a623' }]}>
                  🎬 Showreel Available (Tap to Watch) ↗
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={[styles.footer, { borderTopColor: theme.cardBorder || '#242830' }]}>
            {actionLoading ? (
              <ActivityIndicator color={theme.primary || '#f5a623'} style={{ padding: 12 }} />
            ) : (
              <>
                {onAccept && onDecline ? (
                  <View style={styles.decisionRow}>
                    <TouchableOpacity
                      style={[styles.declineBtn, { borderColor: theme.danger || '#f87171' }]}
                      onPress={onDecline}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.declineText, { color: theme.danger || '#f87171' }]}>
                        Decline
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: theme.success || '#4ade80' }]}
                      onPress={onAccept}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.acceptText}>✓ Accept</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={styles.primaryActionRow}>
                  {onConnect && (
                    <TouchableOpacity
                      style={[
                        styles.viewFullBtn,
                        { backgroundColor: theme.primary || '#f5a623', flex: 1 },
                      ]}
                      onPress={onConnect}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewFullText}>{connectLabel}</Text>
                    </TouchableOpacity>
                  )}

                  {onReviewRequest && (
                    <TouchableOpacity
                      style={[
                        styles.secondaryActionBtn,
                        {
                          backgroundColor: theme.surface || '#121417',
                          borderColor: theme.cardBorder || '#242830',
                        },
                      ]}
                      onPress={onReviewRequest}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.secondaryActionText, { color: theme.text || '#ffffff' }]}>
                        Review Request
                      </Text>
                    </TouchableOpacity>
                  )}

                  {onViewFullProfile && (
                    <TouchableOpacity
                      style={[
                        styles.viewFullBtn,
                        { backgroundColor: onConnect ? (theme.surface || '#121417') : (theme.primary || '#f5a623'), flex: 1, borderWidth: onConnect ? 1 : 0, borderColor: theme.cardBorder || '#242830' },
                      ]}
                      onPress={onViewFullProfile}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.viewFullText, onConnect && { color: theme.text || '#ffffff' }]}>
                        View Full Profile ➔
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  cardHeaderTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 14,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 24,
    fontWeight: '900',
  },
  identityCol: {
    flex: 1,
  },
  nameText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  userHandle: {
    fontSize: 13,
    marginTop: 2,
  },
  followerPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
  },
  followerPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  locationText: {
    fontSize: 12,
    marginTop: 2,
  },
  contextBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  primaryRoleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  primaryRoleText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  rolesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  secondaryRoleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  secondaryRoleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
  },
  reelBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  reelBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewFullBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewFullText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
});
