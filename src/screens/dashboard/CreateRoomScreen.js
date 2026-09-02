import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import RoleBadge from '../../components/RoleBadge';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import { findUserByUsername, sendRoomInvite } from '../../services/userService';

// Roles allowed to create production rooms
const ALLOWED_CREATOR_ROLES = ['Director', 'Scriptwriter', 'Producer', 'Cinematographer'];

const AVAILABLE_ASSIGN_ROLES = [
  'Director',
  'Scriptwriter',
  'Actor',
  'Sound Designer',
  'Editor',
  'Cinematographer',
];

export default function CreateRoomScreen({ navigation }) {
  const { userProfile, currentUser } = useAuth();
  const { createRoom } = useRoom();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [genre, setGenre] = useState('');

  // Collaborator search by username
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [invitedMembers, setInvitedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user has authorization to create a room
  const userRoles = userProfile?.roles || [];
  const hasPermission = userRoles.some((role) => ALLOWED_CREATOR_ROLES.includes(role));

  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    setSearching(true);

    try {
      const foundUser = await findUserByUsername(searchUsername);
      if (!foundUser) {
        Alert.alert('Not Found', 'No filmmaker found with that username.');
      } else if (foundUser.id === currentUser.uid) {
        Alert.alert('Notice', 'You are already the owner of this room.');
      } else if (invitedMembers.some((m) => m.id === foundUser.id)) {
        Alert.alert('Notice', 'User is already in your invite queue.');
      } else {
        // Add to staging invite list with default role
        setInvitedMembers((prev) => [
          ...prev,
          { ...foundUser, assignedRole: 'Actor' },
        ]);
        setSearchUsername('');
      }
    } catch (error) {
      Alert.alert('Search Error', error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleUpdateAssignedRole = (userId, newRole) => {
    setInvitedMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, assignedRole: newRole } : m))
    );
  };

  const handleRemoveInvited = (userId) => {
    setInvitedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a project title.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the room in Firestore
      const newRoomId = await createRoom(title, logline, genre);

      // 2. Dispatch invites to searched users
      for (const member of invitedMembers) {
        await sendRoomInvite(
          newRoomId,
          title,
          { uid: currentUser.uid, displayName: userProfile?.displayName, email: currentUser.email },
          member,
          [member.assignedRole]
        );
      }

      Alert.alert('Success', 'Film Room created and invitations dispatched!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Creation Failed', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Block creation view if user lacks required department role
  if (!hasPermission) {
    return (
      <View style={[styles.deniedContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.deniedTitle, { color: theme.primary }]}>Access Restricted</Text>
        <Text style={[styles.deniedText, { color: theme.textSecondary }]}>
          Only production leads (Director, Scriptwriter, Producer, or Cinematographer) can initiate new Film Rooms.
        </Text>
        <CustomButton
          title="Back to Dashboard"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: theme.text }]}>START PRODUCTION ROOM</Text>
      <Text style={[styles.subheading, { color: theme.textSecondary }]}>
        Establish your digital slate, screenplay space, and crew channels.
      </Text>

      {/* Project Metadata Inputs */}
      <CustomInput
        label="Film Title"
        placeholder="e.g., Midnight Shadows"
        value={title}
        onChangeText={setTitle}
      />
      <CustomInput
        label="Genre"
        placeholder="e.g., Neo-Noir Sci-Fi"
        value={genre}
        onChangeText={setGenre}
      />
      <CustomInput
        label="Logline"
        placeholder="One-sentence hook summarizing the core conflict..."
        value={logline}
        onChangeText={setLogline}
        multiline
        numberOfLines={3}
      />

      {/* Collaborator Search Section */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>INVITE CONNECTIONS BY USERNAME</Text>
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <CustomInput
            placeholder="Search username without @"
            value={searchUsername}
            onChangeText={setSearchUsername}
          />
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: theme.surface }]}
          onPress={handleSearchUser}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[styles.searchBtnText, { color: theme.text }]}>Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Invited List */}
      {invitedMembers.length > 0 && (
        <View style={styles.invitedList}>
          {invitedMembers.map((member) => (
            <View key={member.id} style={[styles.invitedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: theme.text }]}>
                  @{member.username || member.email}
                </Text>
                <RoleBadge role={member.assignedRole} size="small" />
              </View>

              {/* Role Picker options */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolePickerScroll}>
                {AVAILABLE_ASSIGN_ROLES.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOptionChip,
                      member.assignedRole === role && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => handleUpdateAssignedRole(member.id, role)}
                  >
                    <Text style={styles.roleOptionText}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveInvited(member.id)}
              >
                <Text style={styles.removeBtnText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Submit Button */}
      <CustomButton
        title="LAUNCH ROOM"
        onPress={handleCreate}
        loading={isSubmitting}
        style={{ marginTop: 24, marginBottom: 40 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18 },
  heading: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  subheading: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  searchBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { fontWeight: '700', fontSize: 14 },
  invitedList: { marginVertical: 10, gap: 10 },
  invitedCard: { padding: 12, borderRadius: 8, borderWidth: 1 },
  memberInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontSize: 14, fontWeight: '700' },
  rolePickerScroll: { flexDirection: 'row', marginVertical: 8 },
  roleOptionChip: {
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  roleOptionText: { color: '#ffffff', fontSize: 10, fontWeight: '600' },
  removeBtn: { alignSelf: 'flex-end', marginTop: 4 },
  removeBtnText: { color: '#e50914', fontSize: 11, fontWeight: '700' },
  deniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  deniedTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  deniedText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});