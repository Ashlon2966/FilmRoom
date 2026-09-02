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

const AVAILABLE_ROLES = [
  'Director',
  'Scriptwriter',
  'Producer',
  'Cinematographer',
  'Camera Operator',
  'Actor',
  'Sound Designer',
  'Boom Operator',
  'Gaffer (Lighting)',
  'Grip (Rigging)',
  'Production Designer',
  'Editor',
  'Production Assistant (PA / Helper)',
  'Runner / General Crew',
];

export default function ProfileSetupScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pick avatar and directly request base64 from expo-image-picker
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is needed to pick an avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // Compressed for small Firestore storage footprint
      base64: true, // Directly returns the base64 string without extra file-system calls
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setAvatarPreviewUri(asset.uri);

      if (asset.base64) {
        setAvatarBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  };

  const toggleRole = (role) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter your display name.');
      return;
    }

    if (selectedRoles.length === 0) {
      Alert.alert('Required', 'Please select at least one department role.');
      return;
    }

    setIsSaving(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User session not found.');

      // Save directly into Firestore (100% Free under Firebase Spark plan)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        fullName: displayName.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        roles: selectedRoles,
        photoURL: avatarBase64 || null,
        isOnboarded: true,
      });

      // App navigation switches automatically via RootNavigator's onSnapshot listener
    } catch (error) {
      Alert.alert('Error Saving Profile', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.mainContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>SET UP YOUR PROFILE</Text>
        <Text style={styles.subtitle}>Select your film department roles and identity.</Text>

        {/* Avatar Picker */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper} activeOpacity={0.8}>
            {avatarPreviewUri ? (
              <Image source={{ uri: avatarPreviewUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>+ Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to pick an avatar</Text>
        </View>

        {/* Form Inputs */}
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Alex Vance"
          placeholderTextColor="#666"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={styles.label}>Bio / Department Experience</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Camera operator, lighting assistant, script notes..."
          placeholderTextColor="#666"
          value={bio}
          onChangeText={setBio}
          multiline
        />

        {/* Department Role Selector */}
        <Text style={styles.label}>Choose Your Roles (Select All That Apply)</Text>
        <View style={styles.rolesGrid}>
          {AVAILABLE_ROLES.map((role) => {
            const isSelected = selectedRoles.includes(role);
            return (
              <TouchableOpacity
                key={role}
                style={[styles.roleChip, isSelected && styles.roleChipActive]}
                onPress={() => toggleRole(role)}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleChipText, isSelected && styles.roleChipTextActive]}>
                  {role}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProfile}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>SAVE & ENTER STUDIO</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1f1f1f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e50914',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 6,
  },
  label: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  bioInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  roleChip: {
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  roleChipActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  roleChipText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 28,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
});