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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { submitContactRequest, REQUEST_TYPES } from '../services/contactRequestService';
import { ACTOR_ROLE_POSITIONS } from './PostProductionCallModal';
import { CORE_PROFESSIONAL_ROLES } from '../config/rolesConfig';
import FilmRoomDropdown from './FilmRoomDropdown';

const PRODUCTION_TYPES = [
  'Feature Film',
  'Short Film',
  'Episodic / Series',
  'Commercial',
  'Indie / Doc',
];
import { DateRangePickerField } from './CinemaDatePicker';
import { useToast } from '../context/ToastContext';

export default function RequestContactModal({ visible, targetTalent, onClose, onSuccess }) {
  const { theme } = useTheme();
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [inquiryCategory, setInquiryCategory] = useState('CREW'); // 'CREW' | 'CASTING'
  const [projectName, setProjectName] = useState('');
  const [productionType, setProductionType] = useState('Feature Film');
  const [roleName, setRoleName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [rolePosition, setRolePosition] = useState('Main Actor / Lead');
  const [characterDescription, setCharacterDescription] = useState('');
  const [draftScriptUrl, setDraftScriptUrl] = useState('');
  const [shootStartDate, setShootStartDate] = useState('');
  const [shootEndDate, setShootEndDate] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Fetch current user's active and inactive projects (excluding completed & archived)
  useEffect(() => {
    if (visible && currentUser?.uid) {
      setLoadingProjects(true);
      const q = query(
        collection(db, 'rooms'),
        where('memberUids', 'array-contains', currentUser.uid)
      );
      getDocs(q)
        .then((snap) => {
          const eligible = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => r && r.status !== 'COMPLETED' && r.status !== 'ARCHIVED');
          setUserProjects(eligible);
          if (eligible.length > 0 && !projectName) {
            setProjectName(eligible[0].title || '');
            if (eligible[0].projectType) setProductionType(eligible[0].projectType);
          }
        })
        .catch((err) => {
          console.warn('Error fetching user projects for inquiry:', err.message);
        })
        .finally(() => setLoadingProjects(false));
    }
  }, [visible, currentUser?.uid]);

  useEffect(() => {
    if (visible && targetTalent) {
      const isActor =
        targetTalent?.category === 'ACTOR' ||
        targetTalent?.role?.toLowerCase()?.includes('actor') ||
        targetTalent?.roles?.some?.((r) => r?.toLowerCase()?.includes('actor'));
      setInquiryCategory(isActor ? 'CASTING' : 'CREW');
      setRoleName(targetTalent?.primaryRole || targetTalent?.role || '');
      setCharacterName('');
      setRolePosition('Main Actor / Lead');
      setCharacterDescription('');
      setDraftScriptUrl('');
      setShootStartDate('');
      setShootEndDate('');
      setMaterialLink('');
      setMessage('');
      setIsSubmitting(false);
    }
  }, [visible, targetTalent]);

  if (!targetTalent) return null;

  const isRepresented = !!targetTalent.representation?.isRepresented;
  const repName =
    targetTalent.representation?.agencyName || targetTalent.representation?.managerName;

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      showToast({ type: 'warning', message: 'Please select or enter a project title.' });
      return;
    }

    const isCasting = inquiryCategory === 'CASTING';
    const activeRole = isCasting
      ? (characterName.trim() ? `${characterName.trim()} (${rolePosition})` : roleName.trim())
      : roleName.trim();

    if (!activeRole) {
      showToast({ type: 'warning', message: isCasting ? 'Please specify the character / role name.' : 'Please select or enter the craft role needed.' });
      return;
    }
    if (!message.trim()) {
      showToast({ type: 'warning', message: 'Please include a brief professional message.' });
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
          roleName: activeRole,
          materialLink: materialLink.trim() || null,
          shootDates: shootStartDate && shootEndDate ? `${shootStartDate} – ${shootEndDate}` : (shootStartDate || null),
          message: message.trim(),
          isActorCall: isCasting,
          rolePosition: isCasting ? rolePosition : null,
          characterName: isCasting ? (characterName.trim() || null) : null,
          characterDescription: isCasting ? (characterDescription.trim() || null) : null,
          scriptUrl: isCasting && draftScriptUrl.trim() ? draftScriptUrl.trim() : null,
          scriptShared: false,
          scriptSharePending: false,
        },
      });

      showToast({ type: 'success', message: 'Contact request sent' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || "Couldn't send request" });
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

            {/* Inquiry Scope Toggle: Crew/Craft vs Casting/Actor */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>INQUIRY TYPE</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: inquiryCategory === 'CREW' ? theme.primary : theme.surface,
                    borderColor: inquiryCategory === 'CREW' ? theme.primary : theme.cardBorder,
                  },
                ]}
                onPress={() => setInquiryCategory('CREW')}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: inquiryCategory === 'CREW' ? '#000000' : theme.text, fontWeight: '800' },
                  ]}
                >
                  🎥 Crew & Department Position
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: inquiryCategory === 'CASTING' ? '#8b5cf6' : theme.surface,
                    borderColor: inquiryCategory === 'CASTING' ? '#8b5cf6' : theme.cardBorder,
                  },
                ]}
                onPress={() => setInquiryCategory('CASTING')}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: inquiryCategory === 'CASTING' ? '#ffffff' : theme.text, fontWeight: '800' },
                  ]}
                >
                  🎭 Casting / Actor Call
                </Text>
              </TouchableOpacity>
            </View>

            {/* Project Title Controlled Dropdown */}
            <FilmRoomDropdown
              label="Project Title *"
              options={userProjects.map((p) => ({
                label: p.title || 'Untitled Project',
                value: p.title || 'Untitled Project',
                icon: '🎬',
                description: `${p.genre || 'Production'} • Status: ${p.status || 'ACTIVE'}`,
              }))}
              selectedValue={projectName}
              onSelect={(val) => {
                setProjectName(val);
                const matched = userProjects.find((p) => p.title === val);
                if (matched && matched.projectType) {
                  setProductionType(matched.projectType);
                }
              }}
              placeholder={
                loadingProjects
                  ? 'Loading your productions...'
                  : userProjects.length > 0
                  ? 'Select from your FilmRoom projects...'
                  : 'Enter or select project title...'
              }
              allowCustom={true}
              customPlaceholder="Enter custom / new project title..."
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

            {/* Role / Character Name & Position */}
            {inquiryCategory === 'CASTING' ? (
              <>
                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                  CHARACTER / ROLE NAME *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                  ]}
                  placeholder="e.g. Detective Marcus Vance"
                  placeholderTextColor={theme.textMuted}
                  value={characterName}
                  onChangeText={setCharacterName}
                />

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                  ROLE POSITION
                </Text>
                <View style={styles.chipsRow}>
                  {ACTOR_ROLE_POSITIONS.map((pos) => {
                    const isSelected = rolePosition === pos;
                    return (
                      <TouchableOpacity
                        key={pos}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surface,
                            borderColor: isSelected ? theme.primary : theme.cardBorder,
                          },
                        ]}
                        onPress={() => setRolePosition(pos)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isSelected ? '#000000' : theme.text, fontWeight: isSelected ? '800' : '600' },
                          ]}
                        >
                          {pos}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                  CHARACTER BREAKDOWN & TRAITS
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: theme.cardBorder,
                      height: 70,
                      textAlignVertical: 'top',
                    },
                  ]}
                  placeholder="Describe character motivations, demeanor, accent, or background..."
                  placeholderTextColor={theme.textMuted}
                  value={characterDescription}
                  onChangeText={setCharacterDescription}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>
                  DRAFT SCRIPT / SIDES LINK (PROTECTED)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, color: theme.text, borderColor: theme.cardBorder },
                  ]}
                  placeholder="e.g. https://drive.google.com/sides.pdf"
                  placeholderTextColor={theme.textMuted}
                  value={draftScriptUrl}
                  onChangeText={setDraftScriptUrl}
                  autoCapitalize="none"
                />
                <View
                  style={[
                    styles.repNoticeBox,
                    {
                      backgroundColor: '#1f1b13',
                      borderColor: '#d97706',
                      marginTop: 8,
                      marginBottom: 4,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '900', letterSpacing: 0.5 }}>
                    🔒 SCRIPT PRIVACY SAFEGUARD
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, lineHeight: 15 }}>
                    The draft script will remain locked until the actor accepts the role. Once the actor confirms acceptance, you will be prompted to share the draft script with them.
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Controlled Role Dropdown with custom option */}
                <FilmRoomDropdown
                  label="Role / Craft Needed *"
                  options={CORE_PROFESSIONAL_ROLES.map((r) => ({
                    label: r.label,
                    value: r.label,
                    icon: r.icon,
                    description: `Department: ${r.department}`,
                  }))}
                  selectedValue={roleName}
                  onSelect={(val) => setRoleName(val)}
                  placeholder="Select craft role..."
                  allowCustom={true}
                  customPlaceholder="Specify custom craft or position..."
                />
              </>
            )}

            {/* Projected Shoot Dates Range with To Date >= From Date validation */}
            <DateRangePickerField
              label="Projected Shoot Window (Optional)"
              startDate={shootStartDate}
              endDate={shootEndDate}
              onChangeRange={({ startDate: s, endDate: e }) => {
                if (s && e) {
                  const d1 = new Date(s);
                  const d2 = new Date(e);
                  if (d2 < d1) {
                    showToast({ type: 'warning', message: 'To Date must be on or after From Date.' });
                    return;
                  }
                }
                if (s !== undefined) setShootStartDate(s);
                if (e !== undefined) setShootEndDate(e);
              }}
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
