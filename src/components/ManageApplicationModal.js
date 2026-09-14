import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useModal } from '../context/ModalContext';
import {
  updateContactRequest,
  withdrawContactRequest,
  reapplyContactRequest,
  REQUEST_STATUS,
} from '../services/contactRequestService';

export default function ManageApplicationModal({
  visible,
  application,
  callData,
  onClose,
  onApplicationUpdated,
}) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useModal();

  const [isEditing, setIsEditing] = useState(false);
  const [role, setRole] = useState('');
  const [reelUrl, setReelUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && application) {
      setRole(application.details?.roleOrDepartment || application.details?.roleName || '');
      setReelUrl(application.details?.portfolioOrReel || '');
      setMessage(application.details?.message || '');
      setIsEditing(false);
    }
  }, [visible, application]);

  if (!application) return null;

  const status = application.status || REQUEST_STATUS.PENDING;
  const isPending = status === REQUEST_STATUS.PENDING;
  const isAccepted = status === REQUEST_STATUS.ACCEPTED;
  const isDeclined = status === REQUEST_STATUS.DECLINED;
  const isWithdrawn = status === REQUEST_STATUS.WITHDRAWN || status === REQUEST_STATUS.CANCELLED;

  const statusBadgeColor = isAccepted
    ? '#4ade80'
    : isPending
    ? '#f5a623'
    : isDeclined
    ? '#f87171'
    : '#9ca3af';

  const statusBgColor = isAccepted
    ? '#1e3d29'
    : isPending
    ? '#2a2215'
    : isDeclined
    ? '#332020'
    : '#1e2430';

  const statusLabel = isAccepted
    ? 'ACCEPTED • CONFIRMED'
    : isPending
    ? 'PENDING REVIEW'
    : isDeclined
    ? 'DECLINED'
    : 'WITHDRAWN';

  const handleOpenReel = () => {
    const url = application.details?.portfolioOrReel;
    if (!url) return;
    Linking.openURL(url).catch(() => {
      showToast({ type: 'error', message: 'Unable to open showreel URL.' });
    });
  };

  const handleSaveEdit = async () => {
    if (!role.trim()) {
      showToast({ type: 'warning', message: 'Please specify your craft or role.' });
      return;
    }
    if (!reelUrl.trim()) {
      showToast({ type: 'warning', message: 'Please provide a showreel link.' });
      return;
    }

    setLoading(true);
    try {
      const updated = await updateContactRequest(application.id, currentUser.uid, {
        roleOrDepartment: role.trim(),
        portfolioOrReel: reelUrl.trim(),
        message: message.trim(),
      });
      showToast({ type: 'success', title: 'Application Updated', message: 'Your changes have been saved.' });
      setIsEditing(false);
      if (onApplicationUpdated) onApplicationUpdated(updated);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to update application.' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = () => {
    showConfirm({
      title: 'Withdraw Application?',
      description: 'Are you sure you want to withdraw your submission for this crew call? The production lead will be notified.',
      confirmLabel: 'Withdraw Application',
      cancelLabel: 'Keep Active',
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const updated = await withdrawContactRequest(application.id, currentUser.uid);
          showToast({ type: 'info', title: 'Application Withdrawn', message: 'Your submission has been withdrawn.' });
          if (onApplicationUpdated) onApplicationUpdated(updated);
          onClose();
        } catch (err) {
          showToast({ type: 'error', message: err.message || 'Failed to withdraw application.' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleReapply = async () => {
    if (!role.trim() || !reelUrl.trim()) {
      setIsEditing(true);
      return;
    }

    setLoading(true);
    try {
      const updated = await reapplyContactRequest(application.id, currentUser.uid, {
        roleOrDepartment: role.trim(),
        portfolioOrReel: reelUrl.trim(),
        message: message.trim(),
      });
      showToast({ type: 'success', title: 'Re-Application Submitted', message: 'Your updated application has been dispatched.' });
      if (onApplicationUpdated) onApplicationUpdated(updated);
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to reapply.' });
    } finally {
      setLoading(false);
    }
  };

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
          {/* Top Bar */}
          <View style={[styles.topBar, { borderBottomColor: theme.cardBorder || '#242830' }]}>
            <View>
              <Text style={[styles.modalTag, { color: theme.primary || '#f5a623' }]}>
                CREW CALL APPLICATION
              </Text>
              <Text style={[styles.titleText, { color: theme.text || '#ffffff' }]} numberOfLines={1}>
                {callData?.title || application.details?.callTitle || 'Production Call'}
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
            {/* Status Banner */}
            <View style={[styles.statusBanner, { backgroundColor: statusBgColor, borderColor: statusBadgeColor }]}>
              <Text style={[styles.statusBannerText, { color: statusBadgeColor }]}>
                ● STATUS: {statusLabel}
              </Text>
              {application.createdAt ? (
                <Text style={[styles.statusSubText, { color: theme.textSecondary || '#9ca3af' }]}>
                  Submitted: {new Date(application.createdAt).toLocaleDateString()}
                </Text>
              ) : null}
            </View>

            {/* Application Details or Edit Form */}
            {!isEditing ? (
              <View style={styles.viewSection}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                    APPLIED CRAFT / ROLE
                  </Text>
                  <View style={[styles.fieldBox, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                    <Text style={[styles.fieldValue, { color: theme.text || '#ffffff' }]}>
                      {application.details?.roleOrDepartment || application.details?.roleName || 'Crew'}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                    SUBMITTED SHOWREEL / PORTFOLIO
                  </Text>
                  <View style={[styles.fieldBox, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                    <Text style={[styles.fieldValue, { color: theme.primary || '#f5a623' }]} numberOfLines={1}>
                      {application.details?.portfolioOrReel || 'No reel attached'}
                    </Text>
                    {application.details?.portfolioOrReel ? (
                      <TouchableOpacity onPress={handleOpenReel} style={styles.openReelBtn}>
                        <Text style={styles.openReelText}>▶ View Reel</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {application.details?.message ? (
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                      PITCH NOTE TO PRODUCTION LEAD
                    </Text>
                    <View style={[styles.fieldBox, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
                      <Text style={[styles.fieldValue, { color: theme.text || '#ffffff' }]}>
                        {application.details.message}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Lead Contact Info */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                    PRODUCTION LEAD
                  </Text>
                  <Text style={[styles.leadName, { color: theme.text || '#ffffff' }]}>
                    {callData?.director || application.targetTalent?.name || 'Production Lead'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.editSection}>
                <Text style={[styles.editPrompt, { color: theme.text || '#ffffff' }]}>
                  Update Application Details
                </Text>

                <Text style={[styles.inputLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                  Role / Position
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830', color: theme.text || '#ffffff' }]}
                  value={role}
                  onChangeText={setRole}
                  placeholder="e.g. 1st Assistant Camera, Gaffer..."
                  placeholderTextColor={theme.textMuted || '#64748b'}
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                  Showreel / Portfolio URL
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830', color: theme.text || '#ffffff' }]}
                  value={reelUrl}
                  onChangeText={setReelUrl}
                  placeholder="https://vimeo.com/... or https://..."
                  placeholderTextColor={theme.textMuted || '#64748b'}
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                  Note / Cover Message
                </Text>
                <TextInput
                  style={[styles.inputArea, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830', color: theme.text || '#ffffff' }]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Update your pitch or note..."
                  placeholderTextColor={theme.textMuted || '#64748b'}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.editBtnRow}>
                  <TouchableOpacity
                    style={[styles.cancelEditBtn, { borderColor: theme.cardBorder || '#242830' }]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={{ color: theme.textSecondary || '#9ca3af', fontWeight: 'bold' }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveEditBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                    onPress={handleSaveEdit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text style={styles.saveEditText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          {!isEditing && (
            <View style={[styles.footer, { borderTopColor: theme.cardBorder || '#242830' }]}>
              {isPending && (
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={[styles.withdrawBtn, { borderColor: '#f87171' }]}
                    onPress={handleWithdraw}
                    disabled={loading}
                  >
                    <Text style={styles.withdrawBtnText}>Withdraw</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={styles.editBtnText}>Edit Application</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(isWithdrawn || isDeclined) && (
                <TouchableOpacity
                  style={[styles.reapplyBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                  onPress={handleReapply}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.reapplyBtnText}>Reapply for this Role ➔</Text>
                  )}
                </TouchableOpacity>
              )}

              {isAccepted && (
                <View style={[styles.acceptedBox, { backgroundColor: '#1e3d29' }]}>
                  <Text style={styles.acceptedBoxText}>✓ You are confirmed for this production!</Text>
                </View>
              )}
            </View>
          )}
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
    maxHeight: '85%',
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
    paddingBottom: 25,
  },
  statusBanner: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusSubText: {
    fontSize: 11,
    marginTop: 4,
  },
  viewSection: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fieldBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  openReelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#2a2215',
    borderRadius: 4,
    marginLeft: 8,
  },
  openReelText: {
    color: '#f5a623',
    fontSize: 11,
    fontWeight: '800',
  },
  leadName: {
    fontSize: 14,
    fontWeight: '600',
  },
  editSection: {
    gap: 10,
  },
  editPrompt: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  editBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelEditBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  saveEditBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  saveEditText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  withdrawBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  withdrawBtnText: {
    color: '#f87171',
    fontWeight: '800',
    fontSize: 13,
  },
  editBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  reapplyBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reapplyBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  acceptedBox: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptedBoxText: {
    color: '#4ade80',
    fontWeight: '800',
    fontSize: 13,
  },
});
