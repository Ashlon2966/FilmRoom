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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import TalentCard from '../../components/TalentCard';
import FilterModal from '../../components/FilterModal';
import FilmmakerDetailModal from '../../components/FilmmakerDetailModal';

const PAGE_SIZE = 20;

export default function ExploreDirectoryScreen({ navigation }) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();

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
    category: 'ALL',
    role: 'All',
    representation: 'ALL',
    unionStatus: 'All',
    region: '',
    skillKeyword: '',
  });

  const [selectedFilmmaker, setSelectedFilmmaker] = useState(null);

  const isFiltered =
    activeFilters.status !== 'ALL' ||
    activeFilters.category !== 'ALL' ||
    activeFilters.role !== 'All' ||
    activeFilters.representation !== 'ALL' ||
    activeFilters.unionStatus !== 'All' ||
    activeFilters.region !== '' ||
    activeFilters.skillKeyword !== '';

  // Load first page from Firestore
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

  // Cursor-based pagination
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

  // Filter out current user and apply active filters
  const filteredList = talents.filter((t) => {
    // Exclude current user from talent directory
    if (currentUser?.uid && t.id === currentUser.uid) return false;

    // 1. Availability Status Filter
    if (activeFilters.status !== 'ALL') {
      const userStatus =
        t.availability?.status || (t.isAvailable !== false ? 'AVAILABLE' : 'BUSY');
      if (userStatus !== activeFilters.status) return false;
    }

    // 2. Category Filter
    if (activeFilters.category !== 'ALL') {
      if (t.category !== activeFilters.category) return false;
    }

    // 3. Role Filter
    if (activeFilters.role !== 'All') {
      const matchRole =
        t.role === activeFilters.role || (t.roles && t.roles.includes(activeFilters.role));
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

    // 6. Region Filter
    if (activeFilters.region) {
      const loc = (t.location || t.city || '').toLowerCase();
      if (!loc.includes(activeFilters.region.toLowerCase())) return false;
    }

    // 7. Skill / Gear / Language Keyword Filter
    if (activeFilters.skillKeyword) {
      const kw = activeFilters.skillKeyword.toLowerCase();
      const gearMatch = (t.equipment || []).some((item) => item.toLowerCase().includes(kw));
      const bioMatch = (t.bio || '').toLowerCase().includes(kw);
      const langMatch = Array.isArray(t.languages)
        ? t.languages.some((l) => l.toLowerCase().includes(kw))
        : (t.languages || '').toLowerCase().includes(kw);
      if (!gearMatch && !bioMatch && !langMatch) return false;
    }

    // Text Search Bar Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (t.fullName || t.displayName || t.name || '').toLowerCase().includes(q);
      const userMatch = (t.username || '').toLowerCase().includes(q);
      const roleMatch = (t.role || (t.roles && t.roles.join(' ')) || '').toLowerCase().includes(q);
      const bioMatch = (t.bio || '').toLowerCase().includes(q);
      if (!nameMatch && !userMatch && !roleMatch && !bioMatch) return false;
    }

    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.mainTitle, { color: theme.text }]}>
            CREW <Text style={{ color: theme.primary }}>DIRECTORY</Text>
          </Text>

          {/* Filter Trigger Button */}
          <TouchableOpacity
            style={[
              styles.filterIconBtn,
              {
                backgroundColor: isFiltered ? '#242830' : theme.card,
                borderColor: isFiltered ? theme.primary : theme.cardBorder,
              },
            ]}
            onPress={() => setIsFilterModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13 }}>🎛</Text>
            <Text
              style={[
                styles.filterBtnText,
                { color: isFiltered ? theme.primary : theme.text },
              ]}
            >
              Filter
            </Text>
            {isFiltered && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          {filteredList.length} Verified Filmmakers in Network
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name, handle, role, or craft..."
            placeholderTextColor={theme.textMuted}
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
              id: item.id,
              name: item.fullName || item.displayName || 'Filmmaker',
              username: item.username || 'crew',
              role: item.role || item.roles?.[0] || 'Filmmaker',
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
            onPressProfile={() => setSelectedFilmmaker(item)}
            onViewReel={() => setSelectedFilmmaker(item)}
            onInquire={() => setSelectedFilmmaker(item)}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
          ) : !hasMore && filteredList.length > 0 ? (
            <Text style={[styles.endText, { color: theme.textMuted }]}>
              All verified filmmakers loaded
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyIcon, { color: theme.textMuted }]}>🧭</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No filmmakers found</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {searchQuery || isFiltered
                  ? 'Try adjusting your search or active filters.'
                  : 'The directory is starting fresh. As filmmakers join FilmRoom, they will be listed here.'}
              </Text>
            </View>
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
                id: selectedFilmmaker.id,
                name: selectedFilmmaker.fullName || selectedFilmmaker.displayName || 'Filmmaker',
                username: selectedFilmmaker.username || 'crew',
                role: selectedFilmmaker.role || selectedFilmmaker.roles?.[0] || 'Filmmaker',
                category: selectedFilmmaker.category,
                department: selectedFilmmaker.department,
                isActor: selectedFilmmaker.isActor,
                ageRange: selectedFilmmaker.ageRange,
                location: selectedFilmmaker.location || selectedFilmmaker.city || 'Available Worldwide',
                languages: selectedFilmmaker.languages || [],
                unionStatus: selectedFilmmaker.unionStatus || 'Non-Union',
                availability: selectedFilmmaker.availability || {
                  status: selectedFilmmaker.isAvailable !== false ? 'AVAILABLE' : 'BUSY',
                },
                representation: selectedFilmmaker.representation || { isRepresented: false },
                bio: selectedFilmmaker.bio,
                avatar: selectedFilmmaker.photoURL,
                dayRate: selectedFilmmaker.dayRate,
                showreelUrl: selectedFilmmaker.showreelUrl,
                equipment: selectedFilmmaker.equipment || [],
                credits: selectedFilmmaker.credits || [],
              }
            : null
        }
        onClose={() => setSelectedFilmmaker(null)}
        onSendPitch={() => {
          const peer = selectedFilmmaker;
          setSelectedFilmmaker(null);
          navigation.navigate('RequestsTab', {
            screen: 'DirectMessage',
            params: {
              peerUser: {
                id: peer.id,
                fullName: peer.fullName || peer.displayName || 'Filmmaker',
                username: peer.username,
                photoURL: peer.photoURL || null,
                role: peer.role || peer.roles?.[0] || 'Filmmaker',
              },
            },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1.2 },
  filterIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
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
  sub: { fontSize: 11, marginTop: 4 },
  searchBox: { marginTop: 10, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  searchInput: { fontSize: 13 },
  endText: { textAlign: 'center', marginVertical: 20, fontSize: 11, fontStyle: 'italic' },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
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
});