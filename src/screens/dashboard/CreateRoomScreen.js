import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import BackButton from '../../components/BackButton';

export default function CreateRoomScreen({ navigation }) {
  const { currentUser, userProfile } = useAuth();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [logline, setLogline] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!title.trim() || !genre.trim() || !logline.trim()) {
      Alert.alert('Required Fields', 'Please provide a title, genre, and logline.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'rooms'), {
        title: title.trim(),
        genre: genre.trim(),
        logline: logline.trim(),
        creatorId: currentUser.uid,
        creatorEmail: currentUser.email,
        memberUids: [currentUser.uid],
        members: {
          [currentUser.uid]: {
            displayName: userProfile?.fullName || currentUser.email,
            roles: userProfile?.roles || ['Director'],
            joinedAt: new Date().toISOString(),
          },
        },
        currentStage: 0,
        createdAt: serverTimestamp(),
      });

      navigation.goBack();
    } catch (e) {
      Alert.alert('Error Creating Room', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme?.background || '#0c0d0e' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Top-Left Close (✕) Header */}
        <View style={styles.headerRow}>
          <BackButton isClose={true} />
          <Text style={[styles.screenTitle, { color: theme?.text || '#ffffff' }]}>
            START PRODUCTION ROOM
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme?.textSecondary || '#9ca3af' }]}>
          Establish your digital slate, screenplay space, and crew channels.
        </Text>

        <CustomInput
          label="Film Title"
          placeholder="e.g. Apex Drift"
          value={title}
          onChangeText={setTitle}
        />

        <CustomInput
          label="Genre"
          placeholder="e.g. Neo-Noir, Psychological Thriller"
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

        <CustomButton
          title="INITIALIZE ROOM & SLATE"
          onPress={handleCreateRoom}
          loading={loading}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingTop: 44, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  screenTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 0.8 },
  subtitle: { fontSize: 12, marginBottom: 20, lineHeight: 17 },
});