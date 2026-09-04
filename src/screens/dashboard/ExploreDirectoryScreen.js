import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  query,
  limit,
  startAfter,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import TalentCard from '../../components/TalentCard';
import FilterModal from '../../components/FilterModal';
import FilmmakerDetailModal from '../../components/FilmmakerDetailModal';

const PAGE_SIZE = 20;

export default function ExploreDirectoryScreen({ navigation }) {
  const { theme } = useTheme();

  const [talents, setTalents] = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: 'ALL',
    role: 'All',
    region: '',
    skillKeyword: '',
  });

  const [selectedFilmmaker, setSelectedFilmmaker] = useState(null);

  // Check if any filter is actively applied
  const isFiltered =
    activeFilters.status !== 'ALL' ||
    activeFilters.role !== 'All' ||
    activeFilters.region !== '' ||
    activeFilters.skillKeyword !== '';

  // Load first 20 creatives from Firestore
  const fetchFirstPage = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(PAGE_SIZE));
      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTalents(list);
      setLastVisibleDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setCurrentPage(1);
    } catch (e) {
      console.error('Fetch users error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Pagination (21-40, 41-60...)
  const fetchNextPage = async () => {
    if (!lastVisibleDoc || !hasMore || loading) return;

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, startAfter(lastVisibleDoc), limit(PAGE_SIZE));
      const snap = await getDocs(q);

      if (snap.docs.length > 0) {
        const nextList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTalents((prev) => [...prev, ...nextList]);
        setLastVisibleDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
        setCurrentPage((prev) => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Fetch next page error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirstPage();
  }, []);

  // Multi-variable filtration
  const filteredList = talents.filter((t) => {
    if (activeFilters.status === 'AVAILABLE' && t.isAvailable === false) return false;
    if (activeFilters.status === 'BUSY' && t.isAvailable !== false) return false;

    if (activeFilters.role !== 'All') {
      const hasRole = t.roles && t.roles.includes(activeFilters.role);
      if (!hasRole) return false;
    }

    if (activeFilters.region) {
      const locMatch = (t.location || '').toLowerCase().includes(activeFilters.region.toLowerCase());
      if (!locMatch) return false;
    }

    if (activeFilters.skillKeyword) {
      const kw = activeFilters.skillKeyword.toLowerCase();
      const gearMatch = (t.equipment || []).some((item) => item.toLowerCase().includes(kw));
      const bioMatch = (t.bio || '').toLowerCase().includes(kw);
      if (!gearMatch && !bioMatch) return false;
    }

    const matchesSearch =
      (t.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.bio || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.username || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme?.background || '#0c0d0e' }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.mainTitle, { color: theme?.text || '#ffffff' }]}>
            Talent <Text style={{ color: theme?.primary || '#f5a623' }}>Directory</Text>
          </Text>

          {/* Filter Trigger Button with Active Indicator */}
          <TouchableOpacity
            style={[
              styles.filterIconBtn,
              {
                backgroundColor: isFiltered ? '#2a2215' : (theme?.card || '#181b1f'),
                borderColor: isFiltered ? (theme?.primary || '#f5a623') : (theme?.cardBorder || '#242830'),
              },
            ]}
            onPress={() => setIsFilterModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>🎛</Text>
            <Text
              style={[
                styles.filterBtnText,
                { color: isFiltered ? (theme?.primary || '#f5a623') : (theme?.text || '#ffffff') },
              ]}
            >
              Filter
            </Text>
            {isFiltered && <View style={[styles.activeDot, { backgroundColor: theme?.primary || '#f5a623' }]} />}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sub, { color: theme?.textSecondary || '#9ca3af' }]}>
          Page {currentPage} • Showing {filteredList.length} Creatives
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme?.card || '#181b1f', borderColor: theme?.cardBorder || '#242830' }]}>
          <TextInput
            style={[styles.searchInput, { color: theme?.text || '#ffffff' }]}
            placeholder="Search by name, handle, or skills..."
            placeholderTextColor={theme?.textMuted || '#64748b'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Talent Cards Feed */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TalentCard
            talent={{
              name: item.fullName || 'Filmmaker',
              username: item.username || 'crew',
              role: item.roles?.[0] || 'Crew',
              location: item.location || 'Worldwide',
              bio: item.bio || 'No bio listed.',
              status: item.isAvailable !== false ? 'AVAILABLE FOR HIRE' : 'MARKED AS BUSY',
              gearPackage: item.equipment?.[0] || null,
              genres: item.roles || [],
              avatar: item.photoURL,
            }}
            onPressProfile={() => setSelectedFilmmaker(item)}
            onViewReel={() => setSelectedFilmmaker(item)}
            onInquire={() =>
              navigation.navigate('MessagesTab', {
                screen: 'DirectMessage',
                params: { peerUser: { id: item.id, fullName: item.fullName, username: item.username } },
              })
            }
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator color={theme?.primary || '#f5a623'} style={{ marginVertical: 20 }} />
          ) : !hasMore ? (
            <Text style={[styles.endText, { color: theme?.textMuted || '#64748b' }]}>
              All creatives loaded (Page {currentPage})
            </Text>
          ) : null
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalOpen}
        currentFilters={activeFilters}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(filters) => setActiveFilters(filters)}
      />

      {/* Filmmaker Details Sheet */}
      <FilmmakerDetailModal
        visible={!!selectedFilmmaker}
        filmmaker={
          selectedFilmmaker
            ? {
                name: selectedFilmmaker.fullName,
                username: selectedFilmmaker.username,
                role: selectedFilmmaker.roles?.[0] || 'Crew',
                location: selectedFilmmaker.location || 'Available Worldwide',
                bio: selectedFilmmaker.bio,
                avatar: selectedFilmmaker.photoURL,
                equipment: selectedFilmmaker.equipment || [],
                credits: selectedFilmmaker.credits || [],
              }
            : null
        }
        onClose={() => setSelectedFilmmaker(null)}
        onSendPitch={() => {
          const peer = selectedFilmmaker;
          setSelectedFilmmaker(null);
          navigation.navigate('MessagesTab', {
            screen: 'DirectMessage',
            params: { peerUser: { id: peer.id, fullName: peer.fullName, username: peer.username } },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 44, paddingBottom: 10 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainTitle: { fontSize: 24, fontWeight: '900' },
  filterIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    position: 'relative',
  },
  filterBtnText: { fontSize: 12, fontWeight: '800' },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 4,
    right: 4,
  },
  sub: { fontSize: 12, marginTop: 4 },
  searchBox: { marginTop: 10, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { fontSize: 13 },
  endText: { textAlign: 'center', marginVertical: 20, fontSize: 11, fontStyle: 'italic' },
});