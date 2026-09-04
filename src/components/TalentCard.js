import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function TalentCard({ talent, onInquire, onViewReel, onPressProfile }) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      onPress={onPressProfile}
      activeOpacity={0.9}
    >
      {/* Top Badges Row */}
      <View style={styles.topRow}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: theme.accentGreen }]} />
          <Text style={styles.statusText}>{talent.status || 'AVAILABLE FOR HIRE'}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: '#2a2215' }]}>
          <Text style={[styles.roleText, { color: theme.primary }]}>
            {talent.role || 'Cinematographer'}
          </Text>
        </View>
      </View>

      {/* Profile Header */}
      <View style={styles.profileRow}>
        {talent.avatar ? (
          <Image source={{ uri: talent.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
            <Text style={[styles.avatarInitial, { color: theme.primary }]}>
              {talent.name ? talent.name[0] : 'F'}
            </Text>
          </View>
        )}
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: theme.text }]}>{talent.name}</Text>
          <Text style={[styles.subText, { color: theme.textSecondary }]}>
            @{talent.username} • {talent.location || 'Los Angeles, CA'}
          </Text>
        </View>
      </View>

      {/* Bio / Logline */}
      <Text style={[styles.bio, { color: theme.textSecondary }]} numberOfLines={3}>
        {talent.bio}
      </Text>

      {/* Genre Focus Chips */}
      {talent.genres && talent.genres.length > 0 && (
        <View style={styles.genresRow}>
          {talent.genres.map((g, idx) => (
            <View key={idx} style={[styles.genreChip, { backgroundColor: theme.surface }]}>
              <Text style={[styles.genreText, { color: theme.textSecondary }]}>{g}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Gear Package Highlight Box */}
      {talent.gearPackage ? (
        <View style={[styles.packageBox, { backgroundColor: theme.packageBg, borderColor: theme.packageBorder }]}>
          <Text style={[styles.packageLabel, { color: theme.packageText }]}>
            PACKAGE:{' '}
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
          onPress={onViewReel}
        >
          <Text style={[styles.outlineBtnText, { color: theme.text }]}>View Reel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.inquireBtn, { backgroundColor: theme.primary }]}
          onPress={onInquire}
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
    backgroundColor: '#121e17',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3d29',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: '#4ade80',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
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
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  genreChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  genreText: {
    fontSize: 11,
    fontWeight: '600',
  },
  packageBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 14,
  },
  packageLabel: {
    fontSize: 11,
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
    paddingVertical: 10,
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
    paddingVertical: 10,
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