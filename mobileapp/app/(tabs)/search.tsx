import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { PlaceCard } from '../../src/components/places/PlaceCard';
import { BrowseRow } from '../../src/components/browse/BrowseRow';
import { fetchCountries, CountryRow } from '../../src/lib/directory';
import { useDebounce } from '../../src/hooks/useDebounce';
import { VeganOnlyToggle } from '../../src/components/filters/VeganOnlyToggle';
import { FilterModal } from '../../src/components/filters/FilterModal';
import { useFilterStore } from '../../src/store/filterStore';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  vegan_level: string | null;
  category: string | null;
  main_image_url: string | null;
  average_rating: number | null;
  review_count: number | null;
}

const SEARCH_LIMIT = 30;

export default function SearchTab() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 300);
  const browsing = debounced.length < 2;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const veganOnly = useFilterStore((s) => s.veganOnly);
  const category = useFilterStore((s) => s.category);
  const activeCount = useFilterStore((s) => (s.category ? 1 : 0) + (s.subcategory ? 1 : 0) + (s.petFriendly ? 1 : 0) + (s.sort !== 'vegan' ? 1 : 0));

  const [countries, setCountries] = useState<CountryRow[] | null>(null);

  // Load the country directory once (browse default).
  useEffect(() => {
    let cancelled = false;
    fetchCountries()
      .then((rows) => { if (!cancelled) setCountries(rows); })
      .catch(() => { if (!cancelled) setCountries([]); });
    return () => { cancelled = true; };
  }, []);

  // Ranked text search (debounced) via the same RPC the website uses.
  useEffect(() => {
    if (browsing) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    (async () => {
      try {
        const { data } = await supabase.rpc('search_places', {
          q: debounced,
          vl: veganOnly ? 'fully_vegan' : null,
          cat: category,
          near_lat: null,
          near_lng: null,
          result_limit: SEARCH_LIMIT,
        });
        if (!cancelled) setResults((data ?? []) as SearchResult[]);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced, browsing, veganOnly, category]);

  const totalPlaces = countries?.reduce((sum, c) => sum + c.place_count, 0) ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search places, cities, cuisines..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <View style={styles.toggleWrap}><VeganOnlyToggle /></View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)} accessibilityLabel="Filters">
          <Ionicons name="options-outline" size={20} color={colors.text} />
          {activeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {browsing ? (
        countries === null ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={countries}
            keyExtractor={(c) => c.country}
            renderItem={({ item }) => (
              <BrowseRow
                title={item.country}
                subtitle={`${item.place_count.toLocaleString()} places · ${item.city_count} ${item.city_count === 1 ? 'city' : 'cities'}`}
                accent={item.fully_vegan_count > 0 ? `${item.fully_vegan_count.toLocaleString()} fully vegan` : undefined}
                onPress={() => router.push({ pathname: '/browse/country', params: { country: item.country } })}
              />
            )}
            ListHeaderComponent={
              <View style={styles.browseHeader}>
                <Text style={styles.browseTitle}>Browse by country</Text>
                {totalPlaces > 0 && (
                  <Text style={styles.browseSub}>
                    {totalPlaces.toLocaleString()} vegan places across {countries.length} countries
                  </Text>
                )}
              </View>
            }
            contentContainerStyle={styles.browseList}
            keyboardDismissMode="on-drag"
          />
        )
      ) : searching && results.length === 0 ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={56} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No results for “{debounced}”</Text>
          <Text style={styles.emptyText}>Try a different name, city, or cuisine</Text>
          <TouchableOpacity style={styles.suggestBtn} onPress={() => router.push('/suggest-place')}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.suggestBtnText}>Suggest a place</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
        />
      )}

      <FilterModal visible={filterOpen} onClose={() => setFilterOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: typography.base, color: colors.text },
  clearBtn: { padding: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  toggleWrap: { flex: 1 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  badge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 80 },
  browseList: { paddingBottom: 80 },
  browseHeader: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  browseTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  browseSub: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center' },
  suggestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  suggestBtnText: { color: colors.primary, fontWeight: '700', fontSize: typography.sm },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
});
