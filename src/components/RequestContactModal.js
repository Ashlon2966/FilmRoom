import React, { useState } from 'react';
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

const PRODUCTION_TYPES = [
  'Feature Film',
  'Short Film',
  'Episodic / Series',
  'Commercial',
  'Indie / Doc',
];

export default function RequestContactModal({ visible, targetTalent, onClose, onSuccess }) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();

  const [projectName, setProjectName] = useState('');
  const [productionType, setProductionType] = useState('Feature Film');
  const [roleName, setRoleName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!targetTalent) return null;

  const isRepresented = !!targetTalent.representation?.isRepresented;
  const repName =
    targetTalent.representation?.agencyName || targetTalent.representation?.managerName;

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      Alert.alert('Required Field', 'Please provide a project name.');
      return;
    }
    if (!roleName.trim()) {
      Alert.alert('Required Field', 'Please specify the role or position.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required Field', 'Please include a brief professional message.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContactRequest({
        type: REQUEST_TYPES.HIRING_TO_TALENT,
        sender: {
          uid: currentUser.uid,
          name: userProfile?.fullName || userProfile?.displayName || currentUser.email,
          username: userProfile?.username || 'crew',
          role: userProfile?.role || userProfile?.roles?.[0] || 'Production Lead',
          category: userProfile?.category || 'PRODUCTION',
          photoURL: userProfile?.photoURL || null,
        },
        targetTalent: {
          uid: targetTalent.id,
          name: targetTalent.name || targetTalent.fullName || 'Filmmaker',
          username: targetTalent.username || 'crew',
          role: targetTalent.role || 'Talent',
          category: targetTalent.category || 'TALENT',
          photoURL: targetTalent.avatar || targetTalent.photoURL || null,
          representation: targetTalent.representation || null,
        },
        details: {
          projectName: projectName.trim(),
          productionType,
          roleName: roleName.trim(),
          materialLink: materialLink.trim() || null,
          message: message.trim(),
        },
      });

      Alert.alert(
        'Contact Request Dispatched',
        isRepresented
          ? `Your inquiry has been routed to official representation (${repName || 'Agency'}). You will be notified once reviewed.`
          : `Your contact request has been routed to ${targetTalent.name}. You will be notified once reviewed.`,
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
                REQUEST PROFESSIONAL CONTACT
              </Text>
              <Text style={[styles.subTitle, { color: theme.textSecondary }]}>
                Hiring inquiry for {targetTalent.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeX, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Representation Routing Banner */}
            <View
              style={[
                styles.repNoticeBox,
                {
                  backgroundColor: isRepresented ? '#141a24' : theme.surface,
                  borderColor: isRepresented ? '#2b3952' : theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.repNoticeTitle, { color: isRepresented ? '#93c5fd' : theme.text }]}>
                {isRepresented
                  ? `🏛 ROUTING: ${repName || 'OFFICIAL REPRESENTATIVE'}`
                  : '👤 ROUTING: DIRECT TO TALENT'}
              </Text>
              <Text style={[styles.repNoticeSub, { color: theme.textMuted }]}>
                {isRepresented
                  ? 'All inquiry details and material links route directly to the designated talent agent/manager. Personal contact details remain protected.'
                  : 'Inquiry routes directly to the self-represented filmmaker.'}
              </Text>
            </View>

            {/* Project Title */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>PROJECT TITLE *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Midnight Horizon, Season 2"
              placeholderTextColor={theme.textMuted}
              value={projectName}
              onChangeText={setProjectName}
            />

            {/* Production Type */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              PRODUCTION TYPE *
            </Text>
            <View style={styles.chipsRow}>
              {PRODUCTION_TYPES.map((type) => {
                const isSelected = productionType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setProductionType(type)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? '#000000' : theme.text, fontWeight: isSelected ? '800' : '600' },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Role / Position */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              ROLE / CRAFT NEEDED *
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. Lead Actor (Det. Miller), Cinematographer (A-Cam)"
              placeholderTextColor={theme.textMuted}
              value={roleName}
              onChangeText={setRoleName}
            />

            {/* Audition Sides / Deck Link */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              AUDITION SIDES / LOOKBOOK / DECK LINK (OPTIONAL)
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
              ]}
              placeholder="e.g. https://drive.google.com/..."
              placeholderTextColor={theme.textMuted}
              value={materialLink}
              onChangeText={setMaterialLink}
              autoCapitalize="none"
            />

            {/* Message / Pitch */}
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
              PROFESSIONAL INQUIRY NOTE *
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
              placeholder="Introduce the project, shooting dates/location, and why this talent was selected..."
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
                  <Text style={styles.submitBtnText}>Dispatch Contact Request</Text>
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
    height: '90%',
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
  repNoticeBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  repNoticeTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  repNoticeSub: {
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
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
