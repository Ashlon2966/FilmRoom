import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function RoomDetailsModal({ visible, roomData, onClose }) {
  const { theme } = useTheme();

  if (!roomData) return null;

  const title = roomData.title || 'Production Room';
  const genre = roomData.genre || 'Drama';
  const projectType = roomData.projectType || 'Short Film';
  const logline = roomData.logline || null;
  const synopsis = roomData.synopsis || roomData.description || null;
  const location = roomData.location || null;
  const status = roomData.status || 'ACTIVE';
  const visibility = roomData.visibility || 'PUBLIC';
  const posterUrl = roomData.posterUrl || null;
  const crewRequirements = Array.isArray(roomData.crewRequirements) ? roomData.crewRequirements : [];

  const formattedStartDate = roomData.shootStartDate ? String(roomData.shootStartDate) : null;
  const formattedEndDate = roomData.shootEndDate ? String(roomData.shootEndDate) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.topBar}>
            <View>
              <Text style={[styles.modalTag, { color: theme.primary || '#f5a623' }]}>
                PRODUCTION DOSSIER • VIEW ONLY
              </Text>
              <Text style={[styles.titleText, { color: theme.text || '#ffffff' }]} numberOfLines={1}>
                {title.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.closeText, { color: theme.textSecondary || '#9ca3af' }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Poster & Quick Info */}
            <View style={styles.heroRow}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.posterImage} resizeMode="cover" />
              ) : (
                <View style={[styles.posterPlaceholder, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                  <Text style={{ fontSize: 32 }}>🎬</Text>
                </View>
              )}

              <View style={styles.heroMeta}>
                <View style={styles.badgeRow}>
                  <View style={[styles.pill, { backgroundColor: status === 'ACTIVE' ? '#1e3d29' : '#2a2215' }]}>
                    <Text style={[styles.pillText, { color: status === 'ACTIVE' ? '#4ade80' : '#f5a623' }]}>
                      {status}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: '#1e2430' }]}>
                    <Text style={[styles.pillText, { color: '#60a5fa' }]}>{projectType}</Text>
                  </View>
                </View>

                <Text style={[styles.genreText, { color: theme.textSecondary || '#9ca3af' }]}>
                  Genre: <Text style={{ color: theme.text || '#ffffff', fontWeight: '600' }}>{genre}</Text>
                </Text>

                <Text style={[styles.visibilityText, { color: theme.textMuted || '#64748b' }]}>
                  Visibility: {visibility}
                </Text>

                {location ? (
                  <Text style={[styles.locationText, { color: theme.textSecondary || '#9ca3af' }]}>
                    📍 {location}
                  </Text>
                ) : null}

                {formattedStartDate ? (
                  <Text style={[styles.dateText, { color: theme.primary || '#f5a623' }]}>
                    🗓 Shoot: {formattedStartDate} {formattedEndDate ? `→ ${formattedEndDate}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Logline */}
            {logline ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                  LOGLINE
                </Text>
                <View style={[styles.infoBox, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                  <Text style={[styles.infoText, { color: theme.text || '#ffffff' }]}>{logline}</Text>
                </View>
              </View>
            ) : null}

            {/* Synopsis */}
            {synopsis ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                  SYNOPSIS / TREATMENT
                </Text>
                <View style={[styles.infoBox, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                  <Text style={[styles.infoText, { color: theme.text || '#ffffff' }]}>{synopsis}</Text>
                </View>
              </View>
            ) : null}

            {/* Crew Requirements */}
            {crewRequirements.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                  CREW CALLS / ROLES NEEDED ({crewRequirements.length})
                </Text>
                <View style={styles.crewList}>
                  {crewRequirements.map((req, idx) => (
                    <View
                      key={req.id || idx}
                      style={[
                        styles.crewItem,
                        { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.crewRole, { color: theme.text || '#ffffff' }]}>
                          {req.role || req.title || 'Crew'}
                        </Text>
                        <Text style={[styles.crewDept, { color: theme.textSecondary || '#9ca3af' }]}>
                          Dept: {req.department || 'Production'}
                        </Text>
                      </View>
                      <View style={[styles.qtyBadge, { backgroundColor: '#2a2215' }]}>
                        <Text style={[styles.qtyText, { color: theme.primary || '#f5a623' }]}>
                          Qty: {req.quantity || 1}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom Close Button */}
          <View style={[styles.footer, { borderTopColor: theme.cardBorder || '#242830' }]}>
            <TouchableOpacity
              style={[styles.dismissBtn, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.dismissBtnText, { color: theme.text || '#ffffff' }]}>Close Dossier</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#242830',
  },
  modalTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  body: {
    padding: 20,
    paddingBottom: 30,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  posterImage: {
    width: 90,
    height: 135,
    borderRadius: 8,
    backgroundColor: '#0c0d0e',
  },
  posterPlaceholder: {
    width: 90,
    height: 135,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  genreText: {
    fontSize: 13,
  },
  visibilityText: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  infoBox: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  crewList: {
    gap: 8,
  },
  crewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  crewRole: {
    fontSize: 14,
    fontWeight: '700',
  },
  crewDept: {
    fontSize: 11,
    marginTop: 2,
  },
  qtyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  dismissBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
