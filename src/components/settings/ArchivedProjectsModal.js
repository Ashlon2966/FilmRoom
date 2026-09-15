import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { restoreProject } from '../../services/backupService';
import { getCachedRooms } from '../../services/localDatabaseService';

export default function ArchivedProjectsModal({ visible, onClose }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [archivedRooms, setArchivedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (!visible || !currentUser?.uid) return;

    setLoading(true);
    const roomsRef = collection(db, 'rooms');
    const q = query(
      roomsRef,
      where('memberUids', 'array-contains', currentUser.uid),
      where('status', '==', 'ARCHIVED')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setArchivedRooms(rooms);
        setLoading(false);
      },
      async (err) => {
        console.warn('Archived rooms snapshot notice:', err.message);
        // Fallback to local SQLite cache
        try {
          const cached = await getCachedRooms();
          const localArchived = cached.filter((r) => r.status === 'ARCHIVED');
          setArchivedRooms(localArchived);
        } catch (_) {}
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [visible, currentUser?.uid]);

  const handleRestore = (room) => {
    Alert.alert(
      'Restore Project?',
      `Bring "${room.title || 'Untitled Project'}" back to active Board views with all stages and files intact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Project',
          onPress: async () => {
            setRestoringId(room.id);
            try {
              await restoreProject(room.id);
              showToast({
                type: 'success',
                title: 'Project Restored',
                message: `"${room.title || 'Project'}" has been restored to active Board views.`,
              });
            } catch (err) {
              showToast({
                type: 'error',
                message: err.message || 'Failed to restore project.',
              });
            } finally {
              setRestoringId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>ARCHIVED PROJECTS</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Safely stored projects outside active Board views
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading archives...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {archivedRooms.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Archived Projects</Text>
                  <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
                    Projects you archive from room settings will be preserved here safely with all stages, scripts, call sheets, and takes intact.
                  </Text>
                </View>
              ) : (
                archivedRooms.map((room) => {
                  const stageNum = (room.currentStage || 0) + 1;
                  const isRestoring = restoringId === room.id;

                  return (
                    <View
                      key={room.id}
                      style={[styles.projectCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                    >
                      <View style={styles.cardHeader}>
                        {room.posterUrl ? (
                          <Image source={{ uri: room.posterUrl }} style={styles.posterThumb} resizeMode="cover" />
                        ) : (
                          <View style={[styles.posterPlaceholder, { backgroundColor: theme.cardBorder }]}>
                            <Text style={styles.posterPlaceholderText}>🎬</Text>
                          </View>
                        )}
                        <View style={styles.metaCol}>
                          <Text style={[styles.projectTitle, { color: theme.text }]} numberOfLines={1}>
                            {room.title || 'Untitled Project'}
                          </Text>
                          <Text style={[styles.genreText, { color: theme.primary }]}>
                            {room.genre || room.projectType || 'Film'} • Stage {stageNum}
                          </Text>
                          {room.logline ? (
                            <Text style={[styles.loglineText, { color: theme.textMuted }]} numberOfLines={2}>
                              {room.logline}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.cardFooter}>
                        <View style={styles.badgeRow}>
                          <View style={[styles.statusBadge, { borderColor: theme.cardBorder }]}>
                            <Text style={[styles.statusBadgeText, { color: theme.textSecondary }]}>ARCHIVED</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.restoreBtn, { backgroundColor: theme.primary }]}
                          onPress={() => handleRestore(room)}
                          disabled={isRestoring}
                          activeOpacity={0.8}
                        >
                          {isRestoring ? (
                            <ActivityIndicator color="#000000" size="small" />
                          ) : (
                            <Text style={styles.restoreBtnText}>Restore to Board</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#242830',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginTop: 10,
  },
  content: {
    paddingBottom: 32,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  projectCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  posterThumb: {
    width: 52,
    height: 68,
    borderRadius: 8,
    marginRight: 12,
  },
  posterPlaceholder: {
    width: 52,
    height: 68,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: 22,
  },
  metaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  genreText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  loglineText: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#242830',
    paddingTop: 10,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '850',
    letterSpacing: 0.5,
  },
  restoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  restoreBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
});
