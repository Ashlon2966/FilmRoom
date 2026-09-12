import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { submitContactRequest, REQUEST_TYPES } from '../services/contactRequestService';

export default function SubmitInterestModal({
  visible,
  targetLead,
  initialProject = '',
  initialRole = '',
  onClose,
  onSuccess,
}) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();

  const [roleOrDepartment, setRoleOrDepartment] = useState(
    initialRole || userProfile?.role || userProfile?.roles?.[0] || ''
  );
  const [portfolioOrReel, setPortfolioOrReel] = useState(userProfile?.showreelUrl || '');
  const [projectInterest, setProjectInterest] = useState(initialProject || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialProject) setProjectInterest(initialProject);
      if (initialRole) setRoleOrDepartment(initialRole);
    }
  }, [visible, initialProject, initialRole]);

  if (!targetLead) return null;

  const handleSubmit = async () => {
    if (!roleOrDepartment.trim()) {
      Alert.alert('Required Field', 'Please specify your craft or role for consideration.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required Field', 'Please include a brief professional introduction.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContactRequest({
        type: REQUEST_TYPES.TALENT_TO_HIRING,
        sender: {
          uid: currentUser.uid,
          name: userProfile?.fullName || userProfile?.displayName || currentUser.email,
          username: userProfile?.username || 'crew',
          role: userProfile?.role || userProfile?.roles?.[0] || 'Filmmaker',
          category: userProfile?.category || 'TALENT',
          photoURL: userProfile?.photoURL || null,
        },
        targetTalent: {
          uid: targetLead.uid || targetLead.id,
          name: targetLead.name || targetLead.fullName || 'Production Lead',
          username: targetLead.username || 'crew',
          role: targetLead.role || 'Director',
          category: targetLead.category || 'PRODUCTION',
          photoURL: targetLead.avatar || targetLead.photoURL || null,
          representation: null,
        },
        details: {
          roleOrDepartment: roleOrDepartment.trim(),
          portfolioOrReel: portfolioOrReel.trim() || null,
          projectInterest: projectInterest.trim() || null,
          message: message.trim(),
        },
      });

      Alert.alert(
        'Submission Dispatched',
        `Your professional introduction and portfolio have been routed to ${targetLead.name}. If approved, a professional connection will be established.`,
        [{ text: 'Done', onPress: () => onSuccess && onSuccess() }]
      );
      onClose();
    } catch (err) {
      Alert.alert('Submission Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>
                SUBMIT PROFESSIONAL INTEREST
              </Text>
              <Text style={[styles.subTitle, { color: theme.textSecondary }]}>
                Submit your craft for consideration to {targetLead.name} ({targetLead.role || 'Hiring Lead'})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeX, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Anti-Spam Notice */}
            <View style={[styles.noticeBox, { backgroundColor: '#14161a', borderColor: theme.cardBorder }]}>
              <Text style={[styles.noticeTitle, { color: theme.primary }]}>
                PRO COLLABORATION PROTOCOL
              </Text>
              <Text style={[styles.noticeSub, { color: theme.textMuted }]}>
                FilmRoom maintains structured, spam-free production channels. Unsolicited private messaging is restricted until your submission is reviewed and accepted.
              </Text>
            </View>

            {/* Role / Craft */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              YOUR CRAFT / ROLE FOR CONSIDERATION *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Lead Actor, Cinematographer, Film Editor"
              placeholderTextColor={theme.textMuted}
              value={roleOrDepartment}
              onChangeText={setRoleOrDepartment}
            />

            {/* Portfolio / Reel Link */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              PORTFOLIO / SHOWREEL LINK
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. https://vimeo.com/... or Google Drive"
              placeholderTextColor={theme.textMuted}
              value={portfolioOrReel}
              onChangeText={setPortfolioOrReel}
              autoCapitalize="none"
            />

            {/* Project Interest */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              PROJECT OF INTEREST (OPTIONAL)
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Feature slate, Upcoming indie drama"
              placeholderTextColor={theme.textMuted}
              value={projectInterest}
              onChangeText={setProjectInterest}
            />

            {/* Message / Cover Note */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              PROFESSIONAL COVER NOTE *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.cardBorder,
                  height: 90,
                  textAlignVertical: 'top',
                },
              ]}
              placeholder="Brief summary of your experience, notable credits, or relevant style..."
              placeholderTextColor={theme.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
            />

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: theme.cardBorder }]}
                onPress={onClose}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 12 }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Interest</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    height: '86%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeX: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noticeBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  noticeTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  noticeSub: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    paddingBottom: 20,
  },
  outlineBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  submitBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
  },
});
