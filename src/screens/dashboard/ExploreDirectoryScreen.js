import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  limit,
  startAfter,
  getDocs,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import TalentCard from '../../components/TalentCard';
import FilterModal from '../../components/FilterModal';
import QuickProfileModal from '../../components/QuickProfileModal';
import FilmmakerDetailModal from '../../components/FilmmakerDetailModal';
import RequestContactModal from '../../components/RequestContactModal';
import ProductionCallCard from '../../components/ProductionCallCard';
import SubmitReelModal from '../../components/SubmitReelModal';
import PostProductionCallModal from '../../components/PostProductionCallModal';
import ApplyRoleModal from '../../components/ApplyRoleModal';
import NotificationCenterModal from '../../components/NotificationCenterModal';
import { streamNotifications } from '../../services/notificationService';
import { getConnectionStatus } from '../../services/connectionService';
import { getPendingRequestBetweenUsers } from '../../services/contactRequestService';
import {
  streamSavedSearches,
  saveSearchCriteria,
  deleteSavedSearch,
} from '../../services/userService';
import {
  getRecentHistory,
  addRecentHistoryItem,
  clearRecentHistory,
} from '../../services/historyService';

const PAGE_SIZE = 20;

export default function ExploreDirectoryScreen({ navigation }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const { switchRoom } = useRoom();
  const { showToast } = useToast();

  // Active Explore Section: 'FILMMAKERS' | 'CALLS' | 'ROOMS'
  const [activeTab, setActiveTab] = useState('FILMMAKERS');

  // Filmmakers Data
  const [talents, setTalents] = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [loadingTalents, setLoadingTalents] = useState(false);
  const [hasMoreTalents, setHasMoreTalents] = useState(true);

  // Crew Calls Data
  const [productionCalls, setProductionCalls] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

  // Public Production Rooms Data
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: 'ALL',
    category: 'ALL',
    role: 'All',
    representation: 'ALL',
    unionStatus: 'All',
    region: '',
    skillKeyword: '',
  });

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState([]);
  const [saveSearchModalVisible, setSaveSearchModalVisible] = useState(false);
  const [newSearchTitle, setNewSearchTitle] = useState('');

  // Modals & Selected items
  const [quickProfileUser, setQuickProfileUser] = useState(null);
  const [detailedFilmmaker, setDetailedFilmmaker] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [submitReelVisible, setSubmitReelVisible] = useState(false);
  const [applyRoleModalVisible, setApplyRoleModalVisible] = useState(false);
  const [appliedRole, setAppliedRole] = useState('');
  const [callToEdit, setCallToEdit] = useState(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Stream in-app notifications
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = streamNotifications(currentUser.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  // Stream Saved Searches for current user
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = streamSavedSearches(currentUser.uid, (list) => {
      setSavedSearches(list);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // Determine if filters are active
  const isFiltered =
    activeFilters.status !== 'ALL' ||
    activeFilters.category !== 'ALL' ||
    activeFilters.role !== 'All' ||
    activeFilters.representation !== 'ALL' ||
    activeFilters.unionStatus !== 'All' ||
    activeFilters.region !== '' ||
    activeFilters.skillKeyword !== '';

  // Recent History State (Requirement 28 & 63)
  const [recentHistory, setRecentHistory] = useState([]);
  const [contactTargetFilmmaker, setContactTargetFilmmaker] = useState(null);

  useEffect(() => {
    getRecentHistory().then(setRecentHistory);
  }, []);

  // One-time notification permission request post-auth/setup (Requirement 2.B & 2.C)
  useEffect(() => {
    if (!currentUser?.uid) return;
    import('../../services/notificationService').then(
      ({ hasRequestedNotificationPermission, requestNotificationPermissions }) => {
        hasRequestedNotificationPermission().then((alreadyRequested) => {
          if (!alreadyRequested) {
            requestNotificationPermissions();
          }
        });
      }
    );
  }, [currentUser?.uid]);

  const handleInquireFilmmaker = async (item) => {
    if (!item) return;
    if (currentUser?.uid && item.id === currentUser.uid) {
      showToast({ type: 'info', message: 'This is your own profile.' });
      return;
    }

    try {
      // Privacy Settings: Check direct messaging permissions (Requirement 9)
      const messagingPerm = item.messagingPermissions || item.privacySettings?.messagingPermissions || 'ANYONE';
      if (messagingPerm === 'NOBODY') {
        showToast({
          type: 'warning',
          title: 'Inquiries Disabled',
          message: `${item.fullName || item.displayName || 'This filmmaker'} has disabled direct inquiries and messaging.`,
        });
        return;
      }

      if (currentUser?.uid && item.id) {
        const [conn, pendingReq] = await Promise.all([
          getConnectionStatus(currentUser.uid, item.id),
          getPendingRequestBetweenUsers(currentUser.uid, item.id),
        ]);

        if (conn.exists && conn.status === 'ACCEPTED') {
          showToast({
            type: 'info',
            title: 'Already Connected',
            message: `You are already connected with ${item.fullName || item.displayName || 'this filmmaker'}. Direct messaging is enabled.`,
          });
          navigation.navigate('RequestsTab', {
            screen: 'DirectMessage',
            params: {
              peerUser: {
                id: item.id,
                fullName: item.fullName || item.displayName || 'Filmmaker',
                username: item.username || 'crew',
                photoURL: item.photoURL || null,
                role: item.primaryRole || item.role || 'Filmmaker',
              },
            },
          });
          return;
        }

        if (messagingPerm === 'CONNECTIONS_ONLY') {
          showToast({
            type: 'warning',
            title: 'Connections Only',
            message: `${item.fullName || item.displayName || 'This filmmaker'} only accepts inquiries from confirmed connections. Send a connection request first.`,
          });
          return;
        }

        if (pendingReq) {
          showToast({
            type: 'warning',
            title: 'Request Pending',
            message: `An active collaboration request is already pending with ${item.fullName || item.displayName || 'this filmmaker'}.`,
          });
          return;
        }
      }

      setContactTargetFilmmaker(item);
    } catch (err) {
      console.warn('Inquire check error:', err);
      setContactTargetFilmmaker(item);
    }
  };

  const handleOpenFilmmaker = (item) => {
    if (!item) return;
    const title = item.fullName || item.displayName || item.name || 'Filmmaker';
    const subtitle = item.primaryRole || item.role || 'Talent';
    addRecentHistoryItem({
      id: item.id,
      type: 'PROFILE',
      title,
      subtitle,
      data: item,
    }).then(setRecentHistory);
    setQuickProfileUser(item);
  };

  const handleOpenRoom = (room) => {
    if (!room) return;
    addRecentHistoryItem({
      id: room.id,
      type: 'ROOM',
      title: room.title || 'Production Room',
      subtitle: room.genre || 'Room',
      data: room,
    }).then(setRecentHistory);
    switchRoom(room.id);
    navigation.navigate('TheBoardTab', {
      screen: 'StagePipeline',
      params: { screen: 'Stage1_Ideation' },
    });
  };

  const handleOpenCall = (call) => {
    if (!call) return;
    addRecentHistoryItem({
      id: call.id,
      type: 'CALL',
      title: call.title || 'Crew Call',
      subtitle: call.department || call.location || 'Call',
      data: call,
    }).then(setRecentHistory);
    setSelectedCall(call);
  };

  const handleReopenHistoryItem = (item) => {
    if (item.type === 'PROFILE') {
      if (item.data) {
        setQuickProfileUser(item.data);
      } else {
        setSearchQuery(item.title);
      }
    } else if (item.type === 'ROOM') {
      switchRoom(item.id);
      navigation.navigate('TheBoardTab', {
        screen: 'StagePipeline',
        params: { screen: 'Stage1_Ideation' },
      });
    } else if (item.type === 'CALL') {
      if (item.data) setSelectedCall(item.data);
      else setSearchQuery(item.title);
    } else if (item.type === 'SEARCH') {
      setSearchQuery(item.title);
    }
  };

  // 1. Fetch Filmmakers (Cursor-based)
  const fetchFirstTalentsPage = async () => {
    setLoadingTalents(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(PAGE_SIZE));
      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTalents(list);
      setLastVisibleDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreTalents(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.warn('Fetch users notice:', e.message);
    } finally {
      setLoadingTalents(false);
    }
  };

  const fetchNextTalentsPage = async () => {
    if (!lastVisibleDoc || !hasMoreTalents || loadingTalents) return;
    setLoadingTalents(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, startAfter(lastVisibleDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);

      if (snap.docs.length > 0) {
        const nextList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTalents((prev) => [...prev, ...nextList]);
        setLastVisibleDoc(snap.docs[snap.docs.length - 1]);
        setHasMoreTalents(snap.docs.length === PAGE_SIZE);
      } else {
        setHasMoreTalents(false);
      }
    } catch (e) {
      console.warn('Fetch next users notice:', e.message);
    } finally {
      setLoadingTalents(false);
    }
  };

  // 2. Stream Public Production Calls
  useEffect(() => {
    setLoadingCalls(true);
    const callsRef = collection(db, 'production_calls');
    const unsub = onSnapshot(
      callsRef,
      (snap) => {
        const calls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        calls.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setProductionCalls(calls);
        setLoadingCalls(false);
      },
      (err) => {
        console.warn('Calls stream notice:', err.message);
        setLoadingCalls(false);
      }
    );
    return () => unsub();
  }, []);

  // 3. Stream Public Production Rooms
  useEffect(() => {
    setLoadingRooms(true);
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('visibility', '==', 'PUBLIC'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPublicRooms(rooms);
        setLoadingRooms(false);
      },
      (err) => {
        console.warn('Public rooms stream notice:', err.message);
        setLoadingRooms(false);
      }
    );
    return () => unsub();
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFirstTalentsPage();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'FILMMAKERS') {
        await fetchFirstTalentsPage();
      } else if (activeTab === 'CALLS') {
        const callsRef = collection(db, 'production_calls');
        const snap = await getDocs(callsRef);
        const calls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        calls.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setProductionCalls(calls);
      } else if (activeTab === 'ROOMS') {
        const roomsRef = collection(db, 'rooms');
        const q = query(roomsRef, where('visibility', '==', 'PUBLIC'));
        const snap = await getDocs(q);
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPublicRooms(rooms);
      }
    } catch (err) {
      console.warn('Explore refresh error:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Deterministic Filtering for Filmmakers (Strictly zero AI)
  const filteredTalents = talents.filter((t) => {
    if (!t || !t.id) return false;
    if (currentUser?.uid && t.id === currentUser.uid) return false;

    // Discoverability & Privacy Master checks (Requirement 9)
    if (t.discoverability === 'HIDDEN') return false;
    if (t.publicProfile === false || t.privacySettings?.publicProfile === false) return false;
    const vis = t.visibility || t.privacySettings?.visibility || 'PUBLIC';
    if (vis === 'PRIVATE') return false;

    // 1. Availability Filter
    if (activeFilters.status !== 'ALL') {
      const status = t.availability?.status || (t.isAvailable !== false ? 'AVAILABLE' : 'BUSY');
      if (status !== activeFilters.status) return false;
    }

    // 2. Category Filter
    if (activeFilters.category !== 'ALL') {
      if (t.category !== activeFilters.category) return false;
    }

    // 3. Role Filter
    if (activeFilters.role !== 'All') {
      const matchRole =
        t.role === activeFilters.role ||
        t.primaryRole === activeFilters.role ||
        (Array.isArray(t.roles) && t.roles.includes(activeFilters.role)) ||
        (Array.isArray(t.secondaryRoles) && t.secondaryRoles.includes(activeFilters.role));
      if (!matchRole) return false;
    }

    // 4. Representation Filter
    if (activeFilters.representation !== 'ALL') {
      const isRep = !!t.representation?.isRepresented;
      if (activeFilters.representation === 'REPRESENTED' && !isRep) return false;
      if (activeFilters.representation === 'SELF' && isRep) return false;
    }

    // 5. Union Status Filter
    if (activeFilters.unionStatus !== 'All') {
      const currentUnion = t.unionStatus || 'Non-Union';
      if (currentUnion !== activeFilters.unionStatus) return false;
    }

    // 6. Region / Location Filter
    if (activeFilters.region) {
      const reg = activeFilters.region.toLowerCase();
      const loc = (t.location || t.city || t.stateRegion || t.country || '').toLowerCase();
      if (!loc.includes(reg)) return false;
    }

    // 7. Skill / Equipment Keyword Filter
    if (activeFilters.skillKeyword) {
      const kw = activeFilters.skillKeyword.toLowerCase();
      const gearMatch = (t.equipment || []).some((item) => item.toLowerCase().includes(kw));
      const bioMatch = (t.bio || '').toLowerCase().includes(kw);
      const langMatch = Array.isArray(t.languages)
        ? t.languages.some((l) => l.toLowerCase().includes(kw))
        : (t.languages || '').toLowerCase().includes(kw);
      if (!gearMatch && !bioMatch && !langMatch) return false;
    }

    // Free Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (t.fullName || t.displayName || t.name || '').toLowerCase().includes(q);
      const userMatch = (t.username || '').toLowerCase().includes(q);
      const frIdMatch = (t.filmRoomId || '').toLowerCase().includes(q);
      const roleMatch = (
        (t.primaryRole || '') +
        ' ' +
        (t.role || '') +
        ' ' +
        (t.roles || []).join(' ') +
        ' ' +
        (t.secondaryRoles || []).join(' ')
      )
        .toLowerCase()
        .includes(q);
      const locMatch = (t.location || t.city || t.stateRegion || t.country || '')
        .toLowerCase()
        .includes(q);
      const bioMatch = (t.bio || '').toLowerCase().includes(q);

      if (!nameMatch && !userMatch && !frIdMatch && !roleMatch && !locMatch && !bioMatch) {
        return false;
      }
    }

    return true;
  });

  // Filtered Crew Calls
  const filteredCalls = productionCalls.filter((call) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (call.title || '').toLowerCase().includes(q);
    const dirMatch = (call.director || '').toLowerCase().includes(q);
    const loglineMatch = (call.logline || '').toLowerCase().includes(q);
    const rolesMatch = (call.neededRoles || []).join(' ').toLowerCase().includes(q);
    const locMatch = (call.location || '').toLowerCase().includes(q);
    return titleMatch || dirMatch || loglineMatch || rolesMatch || locMatch;
  });

  // Filtered Public Rooms
  const filteredRooms = publicRooms.filter((room) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (room.title || '').toLowerCase().includes(q);
    const typeMatch = (room.projectType || '').toLowerCase().includes(q);
    const loglineMatch = (room.logline || '').toLowerCase().includes(q);
    const rolesMatch = (room.crewRequirements || [])
      .map((r) => r.role)
      .join(' ')
      .toLowerCase()
      .includes(q);
    return titleMatch || typeMatch || loglineMatch || rolesMatch;
  });

  // Save Search Criteria Handler
  const handleSaveCurrentSearch = async () => {
    if (!newSearchTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a name for this saved search.');
      return;
    }
    if (!currentUser?.uid) return;

    try {
      await saveSearchCriteria(currentUser.uid, newSearchTitle.trim(), {
        searchQuery,
        activeFilters,
      });
      setNewSearchTitle('');
      setSaveSearchModalVisible(false);
      Alert.alert('✓ Search Saved', 'Your filter set is saved for 1-tap recall.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save search.');
    }
  };

  const handleApplySavedSearch = (saved) => {
    if (saved.criteria?.searchQuery !== undefined) {
      setSearchQuery(saved.criteria.searchQuery);
    }
    if (saved.criteria?.activeFilters) {
      setActiveFilters(saved.criteria.activeFilters);
    }
  };

  const handleDeleteSavedSearch = (searchId) => {
    Alert.alert('Remove Saved Search', 'Do you want to delete this saved filter set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (currentUser?.uid) deleteSavedSearch(currentUser.uid, searchId);
        },
      },
    ]);
  };

  // Crew Call Application Flow
  const handleApplyCall = (call) => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to apply for production calls.');
      return;
    }
    if (call.createdBy === currentUser.uid) {
      Alert.alert('Your Production Call', 'You posted this crew call. Tap "Edit Call" to modify requirements or roles.');
      return;
    }
    setSelectedCall(call);
    setApplyRoleModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background || '#0c0d0e' }]}>
      {/* Top Pinned Bar */}
      <View style={[styles.header, { backgroundColor: theme.surface || '#121417', borderBottomColor: theme.cardBorder || '#242830' }]}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTitle, { color: theme.text || '#ffffff' }]}>
            DISCOVER <Text style={{ color: theme.primary || '#f5a623' }}>INDUSTRY</Text>
          </Text>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.card || '#181b1f',
                  borderColor: theme.cardBorder || '#242830',
                },
              ]}
              onPress={() => setNotificationsVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 15 }}>🔔</Text>
              {unreadNotificationCount > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: theme.primary || '#f5a623' }]}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Workspace Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'FILMMAKERS' && {
                borderBottomColor: theme.primary || '#f5a623',
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('FILMMAKERS')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'FILMMAKERS'
                      ? theme.primary || '#f5a623'
                      : theme.textSecondary || '#9ca3af',
                },
              ]}
            >
              Filmmakers ({filteredTalents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'CALLS' && {
                borderBottomColor: theme.primary || '#f5a623',
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('CALLS')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'CALLS'
                      ? theme.primary || '#f5a623'
                      : theme.textSecondary || '#9ca3af',
                },
              ]}
            >
              Crew Calls ({filteredCalls.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'ROOMS' && {
                borderBottomColor: theme.primary || '#f5a623',
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('ROOMS')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'ROOMS'
                      ? theme.primary || '#f5a623'
                      : theme.textSecondary || '#9ca3af',
                },
              ]}
            >
              Public Rooms ({filteredRooms.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Box */}
        <View style={[styles.searchBox, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text || '#ffffff' }]}
            placeholder={
              activeTab === 'FILMMAKERS'
                ? 'Search by name, handle, FR-ID, craft, or gear...'
                : activeTab === 'CALLS'
                ? 'Search crew calls by title, department, or location...'
                : 'Search public rooms by title, genre, or needed roles...'
            }
            placeholderTextColor={theme.textMuted || '#64748b'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: theme.textMuted || '#64748b', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filters & Saved Searches Bar (Filmmakers Tab Only) */}
        {activeTab === 'FILMMAKERS' && (
          <View style={styles.filterAssistContainer}>
            {/* Active filter pills */}
            {isFiltered && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {activeFilters.role !== 'All' && (
                  <View style={[styles.filterChip, { backgroundColor: '#242830' }]}>
                    <Text style={[styles.filterChipText, { color: theme.primary || '#f5a623' }]}>
                      Role: {activeFilters.role}
                    </Text>
                    <TouchableOpacity onPress={() => setActiveFilters((prev) => ({ ...prev, role: 'All' }))}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeFilters.status !== 'ALL' && (
                  <View style={[styles.filterChip, { backgroundColor: '#242830' }]}>
                    <Text style={[styles.filterChipText, { color: theme.primary || '#f5a623' }]}>
                      {activeFilters.status}
                    </Text>
                    <TouchableOpacity onPress={() => setActiveFilters((prev) => ({ ...prev, status: 'ALL' }))}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeFilters.region !== '' && (
                  <View style={[styles.filterChip, { backgroundColor: '#242830' }]}>
                    <Text style={[styles.filterChipText, { color: theme.primary || '#f5a623' }]}>
                      Region: {activeFilters.region}
                    </Text>
                    <TouchableOpacity onPress={() => setActiveFilters((prev) => ({ ...prev, region: '' }))}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activeFilters.unionStatus !== 'All' && (
                  <View style={[styles.filterChip, { backgroundColor: '#242830' }]}>
                    <Text style={[styles.filterChipText, { color: theme.primary || '#f5a623' }]}>
                      {activeFilters.unionStatus}
                    </Text>
                    <TouchableOpacity onPress={() => setActiveFilters((prev) => ({ ...prev, unionStatus: 'All' }))}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: '#331b1b', borderColor: '#ef4444', borderWidth: 1 }]}
                  onPress={() =>
                    setActiveFilters({
                      status: 'ALL',
                      category: 'ALL',
                      role: 'All',
                      representation: 'ALL',
                      unionStatus: 'All',
                      region: '',
                      skillKeyword: '',
                    })
                  }
                >
                  <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '700' }}>Reset Filters</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Recent History & Filter Section (Requirement 28) */}
            <View style={styles.recentHistoryContainer}>
              <View style={styles.historyHeaderRow}>
                <Text style={[styles.historySectionTitle, { color: theme.textSecondary || '#9ca3af' }]}>
                  RECENT HISTORY
                </Text>
                {recentHistory.length > 0 && (
                  <TouchableOpacity onPress={() => clearRecentHistory().then(() => setRecentHistory([]))}>
                    <Text style={{ fontSize: 11, color: theme.textMuted || '#64748b' }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.historyAndFilterRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: 'center', gap: 8, paddingRight: 8 }}
                  style={{ flex: 1 }}
                >
                  {recentHistory.length === 0 ? (
                    <Text style={{ fontSize: 12, color: theme.textMuted || '#64748b', fontStyle: 'italic' }}>
                      No recent history yet
                    </Text>
                  ) : (
                    recentHistory.map((h) => {
                      const icon =
                        h.type === 'PROFILE' ? '👤' : h.type === 'ROOM' ? '🎬' : h.type === 'CALL' ? '📢' : '🔍';
                      return (
                        <TouchableOpacity
                          key={`${h.type}_${h.id}`}
                          style={[
                            styles.historyPill,
                            {
                              backgroundColor: theme.card || '#181b1f',
                              borderColor: theme.cardBorder || '#242830',
                            },
                          ]}
                          onPress={() => handleReopenHistoryItem(h)}
                        >
                          <Text style={{ fontSize: 12, marginRight: 4 }}>{icon}</Text>
                          <Text
                            style={[styles.historyPillText, { color: theme.text || '#ffffff' }]}
                            numberOfLines={1}
                          >
                            {h.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                {/* Filter button positioned on the right side of History section (Requirement 28) */}
                <TouchableOpacity
                  style={[
                    styles.filterBtnInline,
                    {
                      backgroundColor: isFiltered ? '#242830' : theme.card || '#181b1f',
                      borderColor: isFiltered ? theme.primary || '#f5a623' : theme.cardBorder || '#242830',
                    },
                  ]}
                  onPress={() => setIsFilterModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12 }}>🎛</Text>
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: isFiltered ? theme.primary || '#f5a623' : theme.text || '#ffffff' },
                    ]}
                  >
                    Filter
                  </Text>
                  {isFiltered && (
                    <View style={[styles.activeDot, { backgroundColor: theme.primary || '#f5a623' }]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Main Tab Content */}
      {activeTab === 'FILMMAKERS' ? (
        <FlatList
          data={filteredTalents}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary || '#f5a623'}
              colors={[theme.primary || '#f5a623']}
            />
          }
          renderItem={({ item }) => (
            <TalentCard
              talent={{
                id: item.id,
                name: item.fullName || item.displayName || 'Filmmaker',
                username: item.username || 'crew',
                gender: item.gender,
                role: item.primaryRole || item.role || item.roles?.[0] || 'Filmmaker',
                filmRoomId: item.filmRoomId,
                category: item.category,
                department: item.department,
                isActor: item.isActor,
                ageRange: item.ageRange,
                location: item.location || item.city || 'Available Worldwide',
                languages: item.languages || [],
                unionStatus: item.unionStatus || 'Non-Union',
                availability: item.availability || {
                  status: item.isAvailable !== false ? 'AVAILABLE' : 'BUSY',
                },
                representation: item.representation || { isRepresented: false },
                bio: item.bio || '',
                gearPackage: item.equipment?.[0] || null,
                avatar: item.photoURL,
              }}
              onPressProfile={() => handleOpenFilmmaker(item)}
              onViewReel={() => {
                handleOpenFilmmaker(item);
                setDetailedFilmmaker(item);
              }}
              onInquire={() => handleInquireFilmmaker(item)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onEndReached={fetchNextTalentsPage}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingTalents ? (
              <ActivityIndicator color={theme.primary || '#f5a623'} style={{ marginVertical: 20 }} />
            ) : !hasMoreTalents && filteredTalents.length > 0 ? (
              <Text style={[styles.endText, { color: theme.textMuted || '#64748b' }]}>
                All verified filmmakers loaded
              </Text>
            ) : null
          }
          ListEmptyComponent={
            !loadingTalents ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, { color: theme.textMuted || '#64748b' }]}>🧭</Text>
                <Text style={[styles.emptyTitle, { color: theme.text || '#ffffff' }]}>No filmmakers found</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary || '#9ca3af' }]}>
                  {searchQuery || isFiltered
                    ? 'Try adjusting your search criteria or clearing filters.'
                    : 'The directory is starting fresh. As filmmakers join FilmRoom, they will appear here.'}
                </Text>
              </View>
            ) : null
          }
        />
      ) : activeTab === 'CALLS' ? (
        <FlatList
          data={filteredCalls}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary || '#f5a623'}
              colors={[theme.primary || '#f5a623']}
            />
          }
          renderItem={({ item }) => (
            <ProductionCallCard
              project={item}
              onExpressInterest={() => handleApplyCall(item)}
              onApply={() => handleApplyCall(item)}
              onEditCall={() => setCallToEdit(item)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListFooterComponent={
            loadingCalls ? (
              <ActivityIndicator color={theme.primary || '#f5a623'} style={{ marginVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            !loadingCalls ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, { color: theme.textMuted || '#64748b' }]}>📢</Text>
                <Text style={[styles.emptyTitle, { color: theme.text || '#ffffff' }]}>No Open Calls Found</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary || '#9ca3af' }]}>
                  {searchQuery
                    ? 'No production calls matched your search query.'
                    : 'No public crew calls have been posted to The Board yet.'}
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary || '#f5a623'}
              colors={[theme.primary || '#f5a623']}
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.roomCard,
                {
                  backgroundColor: theme.card || '#181b1f',
                  borderColor: theme.cardBorder || '#242830',
                },
              ]}
            >
              <View style={styles.roomHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.roomTitle, { color: theme.primary || '#f5a623' }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.roomMeta, { color: theme.textSecondary || '#9ca3af' }]}>
                    {item.projectType || 'Film'} • {Object.keys(item.members || {}).length} Crew Active
                  </Text>
                </View>
                <View style={[styles.stageBadge, { backgroundColor: '#1e3d29' }]}>
                  <Text style={styles.stageBadgeText}>
                    Stage {(item.currentStage || 0) + 1}
                  </Text>
                </View>
              </View>

              <Text style={[styles.roomLogline, { color: theme.text || '#ffffff' }]} numberOfLines={3}>
                {item.logline || 'Production underway.'}
              </Text>

              {item.crewRequirements && item.crewRequirements.length > 0 && (
                <View style={styles.neededRolesBox}>
                  <Text style={[styles.neededLabel, { color: theme.textSecondary || '#9ca3af' }]}>
                    LOOKING FOR CREW:
                  </Text>
                  <View style={styles.neededTagsWrap}>
                    {item.crewRequirements.filter(Boolean).map((req, idx) => {
                      const roleTitle = typeof req === 'string' ? req : (req?.role || 'Crew');
                      const roleQty = typeof req === 'object' && req?.quantity ? req.quantity : 1;
                      return (
                        <View key={req?.id || idx} style={[styles.neededPill, { backgroundColor: '#242830' }]}>
                          <Text style={[styles.neededPillText, { color: theme.text || '#ffffff' }]}>
                            {roleTitle} ({roleQty})
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.enterSlateBtn, { backgroundColor: theme.surface || '#121417', borderColor: theme.cardBorder || '#242830' }]}
                onPress={() => {
                  switchRoom(item.id);
                  navigation.navigate('TheBoardTab', {
                    screen: 'StagePipeline',
                    params: { screen: 'Stage1_Ideation' },
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.enterSlateText, { color: theme.primary || '#f5a623' }]}>
                  Observe Production Slate & Pipeline ➔
                </Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListFooterComponent={
            loadingRooms ? (
              <ActivityIndicator color={theme.primary || '#f5a623'} style={{ marginVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            !loadingRooms ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, { color: theme.textMuted || '#64748b' }]}>🎬</Text>
                <Text style={[styles.emptyTitle, { color: theme.text || '#ffffff' }]}>No Public Rooms</Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary || '#9ca3af' }]}>
                  {searchQuery
                    ? 'No public production rooms match your search query.'
                    : 'There are currently no public production rooms listed. Check back as new films are launched.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalOpen}
        currentFilters={activeFilters}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(filters) => setActiveFilters(filters)}
      />

      {/* Quick Profile Preview Modal */}
      <QuickProfileModal
        visible={!!quickProfileUser}
        filmmaker={quickProfileUser}
        onClose={() => setQuickProfileUser(null)}
        onViewFullProfile={() => {
          const user = quickProfileUser;
          setQuickProfileUser(null);
          setDetailedFilmmaker(user);
        }}
      />

      {/* Full Filmmaker Details Modal */}
      <FilmmakerDetailModal
        visible={!!detailedFilmmaker}
        filmmaker={
          detailedFilmmaker
            ? {
                id: detailedFilmmaker.id,
                name: detailedFilmmaker.fullName || detailedFilmmaker.displayName || 'Filmmaker',
                username: detailedFilmmaker.username || 'crew',
                filmRoomId: detailedFilmmaker.filmRoomId,
                role: detailedFilmmaker.primaryRole || detailedFilmmaker.role || detailedFilmmaker.roles?.[0] || 'Filmmaker',
                primaryRole: detailedFilmmaker.primaryRole,
                secondaryRoles: detailedFilmmaker.secondaryRoles,
                category: detailedFilmmaker.category,
                department: detailedFilmmaker.department,
                isActor: detailedFilmmaker.isActor,
                ageRange: detailedFilmmaker.ageRange,
                location: detailedFilmmaker.location || detailedFilmmaker.city || 'Available Worldwide',
                languages: detailedFilmmaker.languages || [],
                unionStatus: detailedFilmmaker.unionStatus || 'Non-Union',
                availability: detailedFilmmaker.availability || {
                  status: detailedFilmmaker.isAvailable !== false ? 'AVAILABLE' : 'BUSY',
                },
                representation: detailedFilmmaker.representation || { isRepresented: false },
                bio: detailedFilmmaker.bio,
                avatar: detailedFilmmaker.photoURL,
                dayRate: detailedFilmmaker.dayRate,
                showreelUrl: detailedFilmmaker.showreelUrl,
                equipment: detailedFilmmaker.equipment || [],
                credits: detailedFilmmaker.credits || [],
              }
            : null
        }
        onClose={() => setDetailedFilmmaker(null)}
        onSendPitch={() => {
          const peer = detailedFilmmaker;
          setDetailedFilmmaker(null);
          navigation.navigate('RequestsTab', {
            screen: 'DirectMessage',
            params: {
              peerUser: {
                id: peer.id,
                fullName: peer.fullName || peer.displayName || 'Filmmaker',
                username: peer.username,
                photoURL: peer.photoURL || null,
                role: peer.primaryRole || peer.role || peer.roles?.[0] || 'Filmmaker',
              },
            },
          });
        }}
      />

      {/* Inquiry / Request Contact Modal */}
      <RequestContactModal
        visible={!!contactTargetFilmmaker}
        targetTalent={
          contactTargetFilmmaker
            ? {
                id: contactTargetFilmmaker.id,
                name: contactTargetFilmmaker.fullName || contactTargetFilmmaker.displayName || 'Filmmaker',
                username: contactTargetFilmmaker.username || 'crew',
                role: contactTargetFilmmaker.primaryRole || contactTargetFilmmaker.role || 'Filmmaker',
                category: contactTargetFilmmaker.category || 'TALENT',
                avatar: contactTargetFilmmaker.photoURL || null,
                representation: contactTargetFilmmaker.representation || null,
              }
            : null
        }
        onClose={() => setContactTargetFilmmaker(null)}
        onSuccess={() => {
          setContactTargetFilmmaker(null);
          showToast({ type: 'success', title: 'Inquiry Sent', message: 'Your contact request has been dispatched.' });
        }}
      />

      {/* Role Selection Pop-up when applying for a specified call */}
      <ApplyRoleModal
        visible={applyRoleModalVisible}
        call={selectedCall}
        onClose={() => {
          setApplyRoleModalVisible(false);
        }}
        onSelectRole={(roleName) => {
          setApplyRoleModalVisible(false);
          setAppliedRole(roleName);
          setSubmitReelVisible(true);
        }}
      />

      {/* Crew Call Submission Modal */}
      {selectedCall && (
        <SubmitReelModal
          visible={submitReelVisible}
          targetLead={{
            uid: selectedCall.createdBy,
            name: selectedCall.director || 'Production Lead',
            role: 'Director / Production Lead',
            category: 'PRODUCTION',
          }}
          initialProject={selectedCall.title}
          initialRole={appliedRole || selectedCall.neededRoles?.[0] || ''}
          callData={selectedCall}
          onClose={() => {
            setSubmitReelVisible(false);
            setSelectedCall(null);
            setAppliedRole('');
          }}
          onSuccess={() => {
            setSubmitReelVisible(false);
            setSelectedCall(null);
            setAppliedRole('');
          }}
        />
      )}

      {/* Modal to Edit Crew Call on The Board */}
      <PostProductionCallModal
        visible={!!callToEdit}
        callToEdit={callToEdit}
        onClose={() => setCallToEdit(null)}
        onPublished={() => setCallToEdit(null)}
      />

      {/* Save Search Modal */}
      <Modal visible={saveSearchModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.saveModalCard, { backgroundColor: theme.card || '#181b1f', borderColor: theme.cardBorder || '#242830' }]}>
            <Text style={[styles.saveModalTitle, { color: theme.text || '#ffffff' }]}>
              Save Search Filter
            </Text>
            <Text style={[styles.saveModalSub, { color: theme.textSecondary || '#9ca3af' }]}>
              Give this search a name to run it anytime in one tap.
            </Text>

            <TextInput
              style={[styles.saveInput, { color: theme.text || '#ffffff', borderColor: theme.cardBorder || '#242830' }]}
              placeholder="e.g. NYC Cinematographers"
              placeholderTextColor={theme.textMuted || '#64748b'}
              value={newSearchTitle}
              onChangeText={setNewSearchTitle}
              autoFocus
            />

            <View style={styles.saveModalActions}>
              <TouchableOpacity
                style={[styles.saveCancelBtn, { borderColor: theme.cardBorder || '#242830' }]}
                onPress={() => {
                  setSaveSearchModalVisible(false);
                  setNewSearchTitle('');
                }}
              >
                <Text style={{ color: theme.textSecondary || '#9ca3af', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveConfirmBtn, { backgroundColor: theme.primary || '#f5a623' }]}
                onPress={handleSaveCurrentSearch}
              >
                <Text style={styles.saveConfirmBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* In-App Notification Center */}
      <NotificationCenterModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    position: 'relative',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 4,
    right: 4,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 12,
    borderBottomWidth: 1,
    borderColor: '#222222',
  },
  tabItem: {
    paddingVertical: 8,
    marginRight: 16,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  filterAssistContainer: {
    marginTop: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipRemove: {
    color: '#9ca3af',
    fontSize: 10,
  },
  recentHistoryContainer: {
    marginTop: 6,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historySectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historyAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 130,
  },
  historyPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  savedSearchesRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  saveBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  savedSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  savedSearchPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  endText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  roomCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  roomMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stageBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
  },
  roomLogline: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  neededRolesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#242830',
  },
  neededLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  neededTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  neededPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  neededPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  enterSlateBtn: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  enterSlateText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  saveModalCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  saveModalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  saveModalSub: {
    fontSize: 12,
    marginTop: 4,
  },
  saveInput: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  saveCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  saveConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveConfirmBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
});