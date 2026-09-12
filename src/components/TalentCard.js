import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AVAILABILITY_CONFIG, AVAILABILITY_STATUS } from '../config/rolesConfig';

export default function TalentCard({ talent, onInquire, onViewReel, onPressProfile }) {
  const { theme } = useTheme();

  // Resolve 4-state availability
  let availKey = AVAILABILITY_STATUS.AVAILABLE;
  let availDate = null;

  if (talent.availability) {
    if (typeof talent.availability === 'object') {
      availKey = talent.availability.status || AVAILABILITY_STATUS.AVAILABLE;
      availDate = talent.availability.availableFromDate || null;
    } else if (typeof talent.availability === 'string') {
      availKey = talent.availability;
    }
  } else if (talent.isAvailable === false) {
    availKey = AVAILABILITY_STATUS.BUSY;
  }

  const availCfg = AVAILABILITY_CONFIG[availKey] || AVAILABILITY_CONFIG[AVAILABILITY_STATUS.AVAILABLE];
  const availLabel =
    availKey === AVAILABILITY_STATUS.AVAILABLE_FROM && availDate
      ? `Avail: ${availDate}`
      : availCfg.shortLabel;

  // Representation status
  const isRepresented = talent.representation?.isRepresented;
  const repName = talent.representation?.agencyName || talent.representation?.managerName;

  // Union & Age Range
  const unionStatus = talent.unionStatus && talent.unionStatus !== 'Non-Union' ? talent.unionStatus : null;
  const ageRange = talent.ageRange;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      onPress={onPressProfile}
      activeOpacity={0.9}
    >
      {/* Top Badges Row: 4-State Availability + Role & Union Badges */}
      <View style={styles.topRow}>
        <View style={[styles.statusPill, { backgroundColor: availCfg.bgColor, borderColor: availCfg.color + '55' }]}>
          <View style={[styles.statusDot, { backgroundColor: availCfg.color }]} />
          <Text style={[styles.statusText, { color: availCfg.color }]}>
            {availLabel.toUpperCase()}
          </Text>
        </View>

        <View style={styles.topRightBadges}>
          {unionStatus ? (
            <View style={[styles.unionBadge, { backgroundColor: '#18202c', borderColor: '#2b3952' }]}>
              <Text style={styles.unionText}>{unionStatus}</Text>
            </View>
          ) : null}

          <View style={[styles.roleBadge, { backgroundColor: '#2a2215', borderColor: theme.primary + '44' }]}>
            <Text style={[styles.roleText, { color: theme.primary }]}>
              {talent.role || 'Filmmaker'}
            </Text>
          </View>
        </View>
      </View>

      {/* Profile Header */}
      <View style={styles.profileRow}>
        {talent.avatar ? (
          <Image source={{ uri: talent.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
            <Text style={[styles.avatarInitial, { color: theme.primary }]}>
              {talent.name ? talent.name[0].toUpperCase() : 'F'}
            </Text>
          </View>
        )}
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {talent.name}
          </Text>
          <Text style={[styles.subText, { color: theme.textSecondary }]} numberOfLines={1}>
            @{talent.username || 'crew'} • 📍 {talent.location || 'Worldwide'}
            {ageRange ? ` • Age ${ageRange}` : ''}
          </Text>
        </View>
      </View>

      {/* Representation Gateway Strip */}
      <View
        style={[
          styles.repStrip,
          {
            backgroundColor: isRepresented ? '#161922' : '#14161a',
            borderColor: isRepresented ? '#2f3b52' : theme.cardBorder,
          },
        ]}
      >
        <Text style={[styles.repText, { color: isRepresented ? '#93c5fd' : theme.textMuted }]}>
          {isRepresented
            ? `🏛 Rep: ${repName || 'Agency / Management'}`
            : '👤 Self-Represented'}
        </Text>
      </View>

      {/* Bio / Logline */}
      {talent.bio ? (
        <Text style={[styles.bio, { color: theme.textSecondary }]} numberOfLines={2}>
          {talent.bio}
        </Text>
      ) : null}

      {/* Languages or Key Crafts */}
      {talent.languages && talent.languages.length > 0 && (
        <View style={styles.languagesRow}>
          <Text style={[styles.langPrefix, { color: theme.textMuted }]}>Languages:</Text>
          <Text style={[styles.langText, { color: theme.textSecondary }]} numberOfLines={1}>
            {Array.isArray(talent.languages) ? talent.languages.join(', ') : talent.languages}
          </Text>
        </View>
      )}

      {/* Gear Package Highlight Box */}
      {talent.gearPackage ? (
        <View style={[styles.packageBox, { backgroundColor: theme.packageBg, borderColor: theme.packageBorder }]}>
          <Text style={[styles.packageLabel, { color: theme.packageText }]}>
            KIT/CREDIT:{' '}
            <Text style={[styles.packageValue, { color: theme.text }]}>
              {talent.gearPackage}
            </Text>
          </Text>
        </View>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: theme.cardBorder }]}
          onPress={onViewReel || onPressProfile}
          activeOpacity={0.8}
        >
          <Text style={[styles.outlineBtnText, { color: theme.text }]}>View Portfolio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inquireBtn, { backgroundColor: theme.primary }]}
          onPress={onInquire}
          activeOpacity={0.85}
        >
          <Text style={styles.inquireBtnText}>Inquire</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  topRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  unionText: {
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 8,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
  },
  repStrip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  repText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bio: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  languagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  langPrefix: {
    fontSize: 11,
    fontWeight: '700',
  },
  langText: {
    fontSize: 11,
    flex: 1,
  },
  packageBox: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  packageLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  packageValue: {
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14161a',
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inquireBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquireBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
});