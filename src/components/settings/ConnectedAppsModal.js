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
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getConnectedApps,
  addConnectedApp,
  removeConnectedApp,
  launchConnectedApp,
} from '../../services/connectedAppsService';

export default function ConnectedAppsModal({ visible, onClose }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add App Modal / Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [appDeepLink, setAppDeepLink] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadApps();
      setShowAddForm(false);
      resetForm();
    }
  }, [visible, currentUser?.uid]);

  const resetForm = () => {
    setAppName('');
    setAppUrl('');
    setAppDeepLink('');
    setAppDesc('');
  };

  const loadApps = async () => {
    setLoading(true);
    try {
      const list = await getConnectedApps(currentUser?.uid);
      setApps(list || []);
    } catch (e) {
      console.warn('[ConnectedApps] Load apps error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDraftly = async () => {
    const draftlyApp = {
      name: 'Draftly',
      url: 'https://draftly.app',
      deepLink: 'draftly://',
    };
    await launchConnectedApp(draftlyApp);
  };

  const handleLaunch = async (app) => {
    const res = await launchConnectedApp(app);
    if (res?.success) {
      showToast?.({ type: 'success', title: 'App Opened', message: `Launching ${app.name}...` });
    }
  };

  const handleDelete = (app) => {
    Alert.alert(
      'Disconnect App',
      `Are you sure you want to remove "${app.name}" from your connected tools?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await removeConnectedApp(currentUser?.uid, app.id);
            setApps(updated || []);
            showToast?.({ type: 'info', message: `Disconnected ${app.name}.` });
          },
        },
      ]
    );
  };

  const handleSaveNewApp = async () => {
    const trimmedName = appName.trim();
    let trimmedUrl = appUrl.trim();
    const trimmedDeepLink = appDeepLink.trim();
    const trimmedDesc = appDesc.trim();

    if (!trimmedName) {
      Alert.alert('App Name Required', 'Please enter a name for the application or website.');
      return;
    }

    if (!trimmedUrl && !trimmedDeepLink) {
      Alert.alert(
        'Connection Link Required',
        'Please enter either a website URL (e.g. https://www.writerduet.com) or an app scheme link (e.g. finaldraft://).'
      );
      return;
    }

    // Auto-prepend https:// if URL was entered without protocol
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl) && !trimmedUrl.includes('://')) {
      trimmedUrl = `https://${trimmedUrl}`;
    }

    setIsSubmitting(true);
    try {
      const newApp = await addConnectedApp(currentUser?.uid, {
        name: trimmedName,
        url: trimmedUrl,
        deepLink: trimmedDeepLink,
        description: trimmedDesc,
      });

      setApps((prev) => [...prev, newApp]);
      showToast?.({
        type: 'success',
        title: 'App Connected',
        message: `"${trimmedName}" is now available in your production tools.`,
      });
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      Alert.alert('Could Not Connect App', err.message || 'Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: theme.text || '#ffffff' }]}>CONNECTED APPS</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary || '#9ca3af' }]}>
                Production suite extensions & external tools
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: theme.textMuted || '#6b7280', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Active Studio Suite */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary || '#9ca3af' }]}>CURRENT PLATFORM</Text>
            <View style={[styles.appCard, { backgroundColor: theme.background || '#0c0d0e', borderColor: theme.cardBorder || '#242830' }]}>
              <View style={styles.appIconBox}>
                <Text style={styles.appIconEmoji}>🎬</Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={[styles.appName, { color: theme.text || '#ffffff' }]}>FilmRoom Studio</Text>
                <Text style={[styles.appDesc, { color: theme.textMuted || '#6b7280' }]}>
                  Filmmaker collaboration, crew roster & slate pipeline
                </Text>
              </View>
              <View style={[styles.activeBadge, { backgroundColor: '#14532d30', borderColor: '#22c55e' }]}>
                <Text style={[styles.activeBadgeText, { color: theme.success || '#4ade80' }]}>✓ Active</Text>
              </View>
            </View>

            {/* Available Ecosystem Integrations */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary || '#9ca3af', marginTop: 20 }]}>
              AVAILABLE INTEGRATIONS
            </Text>

            {/* Built-in Draftly Integration Card */}
            <View style={[styles.draftlyCard, { backgroundColor: theme.background || '#0c0d0e', borderColor: theme.cardBorder || '#242830' }]}>
              <View style={styles.draftlyHeaderRow}>
                <View style={styles.appIconBox}>
                  <Text style={styles.appIconEmoji}>✍️</Text>
                </View>
                <View style={styles.appInfo}>
                  <Text style={[styles.appName, { color: theme.text || '#ffffff' }]}>Draftly</Text>
                  <Text style={[styles.appDesc, { color: theme.textMuted || '#6b7280' }]}>
                    Screenwriting & production documents
                  </Text>
                </View>
              </View>

              <Text style={[styles.draftlyDetail, { color: theme.textSecondary || '#9ca3af' }]}>
                Draftly handles professional scriptwriting, screenplay revision cycles, and Fountain document formatting.
              </Text>

              <TouchableOpacity
                style={[styles.openDraftlyBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                onPress={handleOpenDraftly}
                activeOpacity={0.8}
              >
                <Text style={styles.openDraftlyText}>Open Draftly</Text>
              </TouchableOpacity>
            </View>

            {/* Configured / Custom Connected Apps */}
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary || '#f5a623'} style={{ marginVertical: 16 }} />
            ) : (
              apps.map((app) => (
                <View
                  key={app.id}
                  style={[styles.customAppCard, { backgroundColor: theme.background || '#0c0d0e', borderColor: theme.cardBorder || '#242830' }]}
                >
                  <View style={styles.draftlyHeaderRow}>
                    <View style={styles.appIconBox}>
                      <Text style={styles.appIconEmoji}>{app.icon || (app.deepLink ? '📱' : '🌐')}</Text>
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={[styles.appName, { color: theme.text || '#ffffff' }]}>{app.name}</Text>
                      <Text style={[styles.appDesc, { color: theme.textMuted || '#6b7280' }]} numberOfLines={1}>
                        {app.deepLink || app.url}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(app)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {Boolean(app.description) && (
                    <Text style={[styles.draftlyDetail, { color: theme.textSecondary || '#9ca3af' }]}>
                      {app.description}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[styles.openDraftlyBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                    onPress={() => handleLaunch(app)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openDraftlyText}>Open {app.name}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={[styles.divider, { backgroundColor: theme.cardBorder || '#242830' }]} />

            {/* Add App Form / Entry Point */}
            {showAddForm ? (
              <View style={[styles.addFormCard, { backgroundColor: theme.background || '#0c0d0e', borderColor: theme.primary || '#f5a623' }]}>
                <Text style={[styles.formTitle, { color: theme.primary || '#f5a623' }]}>CONNECT NEW APPLICATION</Text>
                <Text style={[styles.formSubtitle, { color: theme.textSecondary || '#9ca3af' }]}>
                  Link third-party screenwriting, slate, or production tools
                </Text>

                <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af' }]}>Application / Tool Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                  placeholder="e.g. Final Draft, Notion, Highland 2"
                  placeholderTextColor={theme.textMuted || '#6b7280'}
                  value={appName}
                  onChangeText={setAppName}
                />

                <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af', marginTop: 12 }]}>
                  Website URL
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                  placeholder="https://www.writerduet.com"
                  placeholderTextColor={theme.textMuted || '#6b7280'}
                  value={appUrl}
                  onChangeText={setAppUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af', marginTop: 12 }]}>
                  App Scheme / Deep Link (Optional)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                  placeholder="e.g. finaldraft:// or highland://"
                  placeholderTextColor={theme.textMuted || '#6b7280'}
                  value={appDeepLink}
                  onChangeText={setAppDeepLink}
                  autoCapitalize="none"
                />

                <Text style={[styles.fieldLabel, { color: theme.textSecondary || '#9ca3af', marginTop: 12 }]}>
                  Workflow Description (Optional)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface || '#181b1f', color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
                  placeholder="e.g. Screenplay draft & character notes"
                  placeholderTextColor={theme.textMuted || '#6b7280'}
                  value={appDesc}
                  onChangeText={setAppDesc}
                />

                <View style={styles.formButtonRow}>
                  <TouchableOpacity
                    style={[styles.formCancelBtn, { borderColor: theme.cardBorder || '#242830' }]}
                    onPress={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                  >
                    <Text style={{ color: theme.textSecondary || '#9ca3af', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formSubmitBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                    onPress={handleSaveNewApp}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text style={{ color: '#000000', fontWeight: '800', fontSize: 13 }}>Connect App</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addAppBtn, { borderColor: theme.cardBorder || '#242830' }]}
                onPress={() => setShowAddForm(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.addAppText, { color: theme.textSecondary || '#9ca3af' }]}>+ Add App</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    paddingBottom: 32,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '850',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  appIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#181b1f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconEmoji: {
    fontSize: 20,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
  },
  appDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  activeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  draftlyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  customAppCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  draftlyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  draftlyDetail: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  openDraftlyBtn: {
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openDraftlyText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 6,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  addAppBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAppText: {
    fontSize: 14,
    fontWeight: '700',
  },
  addFormCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '850',
    letterSpacing: 0.6,
  },
  formSubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '750',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  formCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
