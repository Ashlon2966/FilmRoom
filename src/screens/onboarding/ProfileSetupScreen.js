import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import {
  ROLE_CATEGORIES,
  INDUSTRY_ROLES,
  UNION_STATUSES,
  AVAILABILITY_STATUS,
  getRolesByCategory,
} from '../../config/rolesConfig';

export default function ProfileSetupScreen({ navigation }) {
  const { theme } = useTheme();

  // Basic Identity
  const [professionalName, setProfessionalName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState(null);

  // Professional Hierarchy
  const [selectedCategory, setSelectedCategory] = useState(ROLE_CATEGORIES.TALENT);
  const [selectedRole, setSelectedRole] = useState(getRolesByCategory(ROLE_CATEGORIES.TALENT)[0]);
  const [city, setCity] = useState('');
  const [languages, setLanguages] = useState('');
  const [unionStatus, setUnionStatus] = useState('Non-Union');
  const [ageRange, setAgeRange] = useState('');

  // Representation
  const [isRepresented, setIsRepresented] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');

  // Contact Preference
  const [contactMethod, setContactMethod] = useState('FILMROOM'); // 'FILMROOM' | 'EMAIL' | 'PHONE'
  const [publicEmail, setPublicEmail] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Pick Avatar
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is needed to upload a headshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setAvatarPreviewUri(asset.uri);
      if (asset.base64) {
        setAvatarBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    const availableRoles = getRolesByCategory(category);
    if (availableRoles.length > 0) {
      setSelectedRole(availableRoles[0]);
    }
  };

  const handleSaveProfile = async () => {
    if (!professionalName.trim()) {
      Alert.alert('Required', 'Please enter your professional name.');
      return;
    }

    if (!selectedRole) {
      Alert.alert('Required', 'Please choose your primary professional role.');
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Active session not found.');

      const languagesList = languages
        ? languages.split(',').map((l) => l.trim()).filter(Boolean)
        : ['English'];

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        fullName: professionalName.trim(),
        displayName: professionalName.trim(),
        professionalName: professionalName.trim(),
        category: selectedCategory,
        role: selectedRole.name,
        department: selectedRole.department,
        isActor: !!selectedRole.isActor,
        city: city.trim() || 'Worldwide',
        location: city.trim() || 'Worldwide',
        languages: languagesList,
        unionStatus,
        ageRange: selectedRole.isActor ? ageRange.trim() : null,
        bio: bio.trim(),
        photoURL: avatarBase64 || null,
        availability: {
          status: AVAILABILITY_STATUS.AVAILABLE,
          availableFromDate: null,
        },
        isAvailable: true,
        representation: {
          isRepresented,
          agencyName: isRepresented ? agencyName.trim() : null,
          managerName: isRepresented ? repName.trim() : null,
          managerEmail: isRepresented ? repEmail.trim() : null,
          managerUid: null,
        },
        professionalContact: {
          preferredRoute: isRepresented ? 'REPRESENTATIVE' : contactMethod,
          publicEmail: contactMethod === 'EMAIL' ? publicEmail.trim() : null,
        },
        isOnboarded: true,
      });

      // Navigation is reactive via RootNavigator listening to onSnapshot
    } catch (error) {
      Alert.alert('Save Failed', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.mainContainer, { backgroundColor: theme.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          PROFESSIONAL DOSSIER SETUP
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Define your industry role, portfolio details, and representation gateway.
        </Text>

        {/* Headshot / Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={pickImage}
            style={[
              styles.avatarWrapper,
              { backgroundColor: theme.card, borderColor: theme.primary },
            ]}
            activeOpacity={0.8}
          >
            {avatarPreviewUri ? (
              <Image source={{ uri: avatarPreviewUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>+ Headshot</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: theme.textMuted }]}>
            Professional headshot or studio logo
          </Text>
        </View>

        {/* Professional Name */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          PROFESSIONAL / STAGE NAME *
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. Christopher Nolan, Cillian Murphy"
          placeholderTextColor={theme.textMuted}
          value={professionalName}
          onChangeText={setProfessionalName}
        />

        {/* Category Selector */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          SELECT INDUSTRY PILLAR *
        </Text>
        <View style={styles.categoryRow}>
          {[
            { key: ROLE_CATEGORIES.TALENT, title: 'Talent & Crafts' },
            { key: ROLE_CATEGORIES.PRODUCTION, title: 'Production & Hiring' },
            { key: ROLE_CATEGORIES.REPRESENTATION, title: 'Representation' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryBtn,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.cardBorder,
                  },
                ]}
                onPress={() => handleCategoryChange(cat.key)}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    { color: isSelected ? '#000000' : theme.textSecondary },
                  ]}
                >
                  {cat.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Specific Role Selector */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          PRIMARY ROLE / TITLE *
        </Text>
        <View style={styles.rolesGrid}>
          {getRolesByCategory(selectedCategory).map((r) => {
            const isSelected = selectedRole?.name === r.name;
            return (
              <TouchableOpacity
                key={r.name}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.cardBorder,
                  },
                ]}
                onPress={() => setSelectedRole(r)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    {
                      color: isSelected ? '#000000' : theme.text,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {r.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location / Base City */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          PRIMARY PRODUCTION CITY / REGION
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. London, Los Angeles, Mumbai, Berlin"
          placeholderTextColor={theme.textMuted}
          value={city}
          onChangeText={setCity}
        />

        {/* Languages */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          LANGUAGES (COMMA SEPARATED)
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="e.g. English, French, Hindi"
          placeholderTextColor={theme.textMuted}
          value={languages}
          onChangeText={setLanguages}
        />

        {/* Actor-specific Age Range */}
        {selectedRole?.isActor && (
          <>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              PLAYING AGE RANGE
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. 25–35, 30–45"
              placeholderTextColor={theme.textMuted}
              value={ageRange}
              onChangeText={setAgeRange}
            />
          </>
        )}

        {/* Union Status */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          UNION AFFILIATION
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
          {UNION_STATUSES.map((u) => {
            const isSelected = unionStatus === u;
            return (
              <TouchableOpacity
                key={u}
                style={[
                  styles.unionChip,
                  {
                    backgroundColor: isSelected ? '#242830' : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setUnionStatus(u)}
              >
                <Text
                  style={[
                    styles.unionChipText,
                    { color: isSelected ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {u}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Representation Gateway */}
        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 18 }]}>
          PROFESSIONAL REPRESENTATION
        </Text>
        <View style={styles.repToggleRow}>
          <TouchableOpacity
            style={[
              styles.repToggleBtn,
              {
                backgroundColor: !isRepresented ? theme.primary : theme.surface,
                borderColor: !isRepresented ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setIsRepresented(false)}
          >
            <Text style={{ color: !isRepresented ? '#000000' : theme.textSecondary, fontWeight: '800' }}>
              Self-Represented
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.repToggleBtn,
              {
                backgroundColor: isRepresented ? theme.primary : theme.surface,
                borderColor: isRepresented ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setIsRepresented(true)}
          >
            <Text style={{ color: isRepresented ? '#000000' : theme.textSecondary, fontWeight: '800' }}>
              Agency / Managed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rep Details if Represented */}
        {isRepresented ? (
          <View style={[styles.repBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.subLabel, { color: theme.textSecondary }]}>AGENCY / MANAGEMENT CO.</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. Creative Artists Agency (CAA), WME"
              placeholderTextColor={theme.textMuted}
              value={agencyName}
              onChangeText={setAgencyName}
            />

            <Text style={[styles.subLabel, { color: theme.textSecondary }]}>MANAGER / AGENT NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. Dan Aloni"
              placeholderTextColor={theme.textMuted}
              value={repName}
              onChangeText={setRepName}
            />

            <Text style={[styles.subLabel, { color: theme.textSecondary }]}>REPRESENTATIVE INQUIRY EMAIL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. representation@agency.com"
              placeholderTextColor={theme.textMuted}
              value={repEmail}
              onChangeText={setRepEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        ) : (
          <View style={[styles.repBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.subLabel, { color: theme.textSecondary }]}>
              UNREPRESENTED INQUIRY ROUTE
            </Text>
            <View style={styles.contactMethodRow}>
              {[
                { key: 'FILMROOM', label: 'FilmRoom Request' },
                { key: 'EMAIL', label: 'Professional Email' },
              ].map((m) => {
                const isSelected = contactMethod === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.methodBtn,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setContactMethod(m.key)}
                  >
                    <Text style={{ color: isSelected ? '#000000' : theme.textSecondary, fontWeight: '700' }}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {contactMethod === 'EMAIL' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, marginTop: 10 }]}
                placeholder="public.business@studio.com"
                placeholderTextColor={theme.textMuted}
                value={publicEmail}
                onChangeText={setPublicEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          </View>
        )}

        {/* Bio / Logline */}
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          PROFESSIONAL SYNOPSIS / BIO
        </Text>
        <TextInput
          style={[styles.input, styles.bioInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="Brief professional summary, notable collaborators, or casting pitch..."
          placeholderTextColor={theme.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
          onPress={handleSaveProfile}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.submitButtonText}>INITIALIZE PROFESSIONAL DOSSIER</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 50, paddingBottom: 80 },
  headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1.2 },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 24, lineHeight: 18 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700' },
  avatarHint: { fontSize: 11, marginTop: 8 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  subLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4, marginTop: 10 },
  input: { borderRadius: 8, padding: 12, fontSize: 13, borderWidth: 1 },
  bioInput: { height: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  categoryBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  categoryBtnText: { fontSize: 11, fontWeight: '800' },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  roleChipText: { fontSize: 11 },
  horizontalChips: { flexDirection: 'row', gap: 8, marginTop: 4 },
  unionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  unionChipText: { fontSize: 11, fontWeight: '700' },
  repToggleRow: { flexDirection: 'row', gap: 8 },
  repToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  repBox: { padding: 14, borderRadius: 8, borderWidth: 1, marginTop: 10 },
  contactMethodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  submitButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  submitButtonText: { color: '#000000', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});