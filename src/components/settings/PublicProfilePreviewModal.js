import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function PublicProfilePreviewModal({ visible, onClose }) {
  const { userProfile } = useAuth();
  const { theme } = useTheme();

  if (!userProfile) return null;

  // Resolve availability badge configuration
  const rawAvail = userProfile.availability;
  let availStatus = 'AVAILABLE';
  let availFromDate = null;
  if (typeof rawAvail === 'object' && rawAvail) {
    availStatus = rawAvail.status || 'AVAILABLE';
    availFromDate = rawAvail.availableFromDate || null;
  } else if (typeof rawAvail === 'string') {
    availStatus = rawAvail;
  }

  const getAvailBadge = (status, date) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'AVAILABLE FOR WORK', color: '#4ade80', bg: '#162b1e', icon: '🟢' };
      case 'ON_PROJECT':
        return { label: 'CURRENTLY ON PROJECT', color: '#38bdf8', bg: '#142033', icon: '🔵' };
      case 'AVAILABLE_FROM':
        return {
          label: date ? `AVAILABLE FROM ${date.toUpperCase()}` : 'AVAILABLE SOON',
          color: '#f5a623',
          bg: '#2b2114',
          icon: '🟡',
        };
      case 'BUSY':
        return { label: 'UNAVAILABLE / BOOKED', color: '#f87171', bg: '#2b1616', icon: '🔴' };
      default:
        return { label: 'AVAILABLE FOR WORK', color: '#4ade80', bg: '#162b1e', icon: '🟢' };
    }
  };

  const availBadge = getAvailBadge(availStatus, availFromDate);

  // Representation
  const isRepresented = !!userProfile.representation?.isRepresented;
  const agencyName = userProfile.representation?.agencyName || '';
  const managerName = userProfile.representation?.managerName || '';

  // Pronoun display
  const pronouns = userProfile.pronouns || (userProfile.gender === 'he' ? 'he/him' : userProfile.gender === 'she' ? 'she/her' : userProfile.gender === 'they' ? 'they/them' : null);

  const primaryRole = userProfile.primaryRole || (userProfile.roles && userProfile.roles[0]) || userProfile.role || 'Filmmaker';
  const secondaryRoles = (userProfile.secondaryRoles?.length ? userProfile.secondaryRoles : (userProfile.roles && userProfile.roles.slice(1))) || [];

  // Privacy Resolution (Requirement 9)
  const isProfilePublic = userProfile.publicProfile !== false && userProfile.privacySettings?.publicProfile !== false;
  const showreelVis = userProfile.privacySettings?.showreelVisibility || userProfile.showreelVisibility || 'PUBLIC';
  const gearVis = userProfile.privacySettings?.gearKitVisibility || userProfile.gearKitVisibility || 'PUBLIC';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Pinned Top Bar */}
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>PUBLIC PROFILE VIEW</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                How your portfolio appears to other filmmakers
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.card }]}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Disabled Notice (Requirement 9) */}
          {!isProfilePublic && (
            <View style={[styles.privateNotice, { backgroundColor: '#2b1414', borderColor: '#7f1d1d' }]}>
              <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 12, marginBottom: 2 }}>
                🔒 PROFILE IS PRIVATE
              </Text>
              <Text style={{ color: '#fca5a5', fontSize: 11, lineHeight: 15 }}>
                Your public profile is disabled in Privacy Settings. You are hidden from the Explore directory, talent search, and direct inquiries. Only you can view this preview.
              </Text>
            </View>
          )}

          {/* Privacy Shield Notice */}
          <View style={styles.shieldNotice}>
            <Text style={styles.shieldNoticeText}>
              🛡️ Private Data Shielded: Your Firebase UID, private email address, and personal phone number are hidden from public view.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Identity Header */}
            <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={styles.avatarRow}>
                {userProfile.photoURL ? (
                  <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.background }]}>
                    <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                      {userProfile.fullName ? userProfile.fullName[0].toUpperCase() : 'F'}
                    </Text>
                  </View>
                )}

                <View style={styles.nameBlock}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={[styles.fullName, { color: theme.text }]}>
                      {userProfile.fullName || 'Filmmaker'}
                    </Text>
                    {pronouns ? (
                      <Text style={[styles.pronounText, { color: theme.textSecondary }]}>
                        ({pronouns})
                      </Text>
                    ) : null}
                  </View>

                  <Text style={[styles.usernameText, { color: theme.textMuted }]}>
                    @{userProfile.username || 'crew'}
                  </Text>

                  {userProfile.filmRoomId ? (
                    <View style={styles.codePill}>
                      <Text style={[styles.codePillText, { color: theme.primary }]}>
                        CODE: {userProfile.filmRoomId}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Location */}
              <Text style={[styles.locationText, { color: theme.textSecondary }]}>
                📍 {userProfile.location || 'Available Worldwide'}
              </Text>

              {/* Role Badges */}
              <View style={styles.roleContainer}>
                <View style={[styles.primaryRoleBadge, { backgroundColor: '#2a2215', borderColor: theme.primary }]}>
                  <Text style={[styles.primaryRoleText, { color: theme.primary }]}>
                    ★ {primaryRole}
                  </Text>
                </View>

                {secondaryRoles.map((role, idx) => (
                  <View key={idx} style={[styles.secondaryRoleBadge, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.secondaryRoleText, { color: theme.textSecondary }]}>
                      {role}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Availability Status Pill */}
              <View style={[styles.availPill, { backgroundColor: availBadge.bg, borderColor: availBadge.color + '66' }]}>
                <Text style={{ fontSize: 12 }}>{availBadge.icon}</Text>
                <Text style={[styles.availPillText, { color: availBadge.color }]}>
                  {availBadge.label}
                </Text>
              </View>
            </View>

            {/* Representation Gateway */}
            <View style={[styles.sectionCard, { backgroundColor: isRepresented ? '#141d2e' : theme.card, borderColor: isRepresented ? '#2b3f66' : theme.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: isRepresented ? '#93c5fd' : theme.text }]}>
                {isRepresented ? '🏛 OFFICIAL REPRESENTATION' : '👤 SELF-REPRESENTED TALENT'}
              </Text>
              {isRepresented ? (
                <View style={{ marginTop: 6 }}>
                  {agencyName ? (
                    <Text style={[styles.repLine, { color: theme.text }]}>
                      Agency: <Text style={{ fontWeight: '800' }}>{agencyName}</Text>
                    </Text>
                  ) : null}
                  {managerName ? (
                    <Text style={[styles.repLine, { color: theme.text }]}>
                      Manager / Agent: <Text style={{ fontWeight: '800' }}>{managerName}</Text>
                    </Text>
                  ) : null}
                  <Text style={[styles.repSub, { color: theme.textMuted, marginTop: 4 }]}>
                    All commercial casting and director inquiries route through verified representation.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.repSub, { color: theme.textSecondary, marginTop: 4 }]}>
                  Direct contact requests and crew applications are accepted via FilmRoom.
                </Text>
              )}
            </View>

            {/* Bio / Logline */}
            {userProfile.bio ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ABOUT & CREDITS</Text>
                <Text style={[styles.bioText, { color: theme.text, marginTop: 6 }]}>
                  {userProfile.bio}
                </Text>
              </View>
            ) : null}

            {/* Showreel / Portfolio (Requirement 9) */}
            {userProfile.showreelUrl ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SHOWREEL & PORTFOLIO</Text>
                  {showreelVis !== 'PUBLIC' && (
                    <View style={{ backgroundColor: showreelVis === 'PRIVATE' ? '#3d1d1d' : '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: showreelVis === 'PRIVATE' ? '#f87171' : '#93c5fd', fontSize: 9, fontWeight: 'bold' }}>
                        {showreelVis === 'PRIVATE' ? 'PRIVATE' : 'CONNECTIONS ONLY'}
                      </Text>
                    </View>
                  )}
                </View>
                {showreelVis === 'PRIVATE' ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>
                    🔒 Hidden from public view (Visible only to you)
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.reelButton, { backgroundColor: theme.background, borderColor: theme.primary }]}
                    onPress={() => Linking.openURL(userProfile.showreelUrl).catch(() => {})}
                  >
                    <Text style={{ fontSize: 16 }}>🎬</Text>
                    <Text style={[styles.reelButtonText, { color: theme.primary }]} numberOfLines={1}>
                      {userProfile.showreelUrl}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Equipment / Kit (Requirement 9) */}
            {userProfile.gearPackage ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CAMERA & GEAR PACKAGE</Text>
                  {gearVis !== 'PUBLIC' && (
                    <View style={{ backgroundColor: gearVis === 'PRIVATE' ? '#3d1d1d' : '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: gearVis === 'PRIVATE' ? '#f87171' : '#93c5fd', fontSize: 9, fontWeight: 'bold' }}>
                        {gearVis === 'PRIVATE' ? 'PRIVATE' : 'CONNECTIONS ONLY'}
                      </Text>
                    </View>
                  )}
                </View>
                {gearVis === 'PRIVATE' ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>
                    🔒 Hidden from public view (Visible only to you)
                  </Text>
                ) : (
                  <Text style={[styles.bioText, { color: theme.text, marginTop: 6 }]}>
                    {userProfile.gearPackage}
                  </Text>
                )}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.dismissBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.dismissBtnText, { color: theme.text }]}>Close Preview</Text>
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
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privateNotice: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  shieldNotice: {
    backgroundColor: '#1c2229',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d3748',
    marginBottom: 12,
  },
  shieldNoticeText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  content: {
    paddingBottom: 36,
  },
  profileCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '900',
  },
  nameBlock: {
    flex: 1,
    marginLeft: 14,
  },
  fullName: {
    fontSize: 17,
    fontWeight: '900',
  },
  pronounText: {
    fontSize: 12,
    fontWeight: '600',
  },
  usernameText: {
    fontSize: 12,
    marginTop: 2,
  },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2215',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  locationText: {
    fontSize: 12,
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  primaryRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  primaryRoleText: {
    fontSize: 11,
    fontWeight: '900',
  },
  secondaryRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  secondaryRoleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  availPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  repLine: {
    fontSize: 13,
    marginTop: 2,
  },
  repSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19,
  },
  reelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  reelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  dismissBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
