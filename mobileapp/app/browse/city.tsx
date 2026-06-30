import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrowseHeader } from '../../src/components/browse/BrowseHeader';
import { PlaceCard } from '../../src/components/places/PlaceCard';
import { VeganOnlyToggle } from '../../src/components/filters/VeganOnlyToggle';
import { FilterModal } from '../../src/components/filters/FilterModal';
import { fetchPlacesInCity, sortPlaces, DirectoryPlace } from '../../src/lib/directory';
import { useCityFollow } from '../../src/hooks/useFollowedCities';
import { useFilterStore } from '../../src/store/filterStore';
import { colors, spacing, typography } from '../../src/constants/theme';

export default function CityBrowseScreen() {
  const { country, city } = useLocalSearchParams<{ country: string; city: string }>();
  const [places, setPlaces] = useState<DirectoryPlace[] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { following, toggle, canFollow } = useCityFollow(city, country);

  const veganOnly = useFilterStore((s) => s.veganOnly);
  const category = useFilterStore((s) => s.category);
  const subcategory = useFilterStore((s) => s.subcategory);
  const petFriendly = useFilterStore((s) => s.petFriendly);
  const sort = useFilterStore((s) => s.sort);
  const activeCount = useFilterStore((s) => (s.category ? 1 : 0) + (s.subcategory ? 1 : 0) + (s.petFriendly ? 1 : 0) + (s.sort !== 'vegan' ? 1 : 0));

  useEffect(() => {
    if (!country || !city) return;
    let cancelled = false;
    setPlaces(null);
    fetchPlacesInCity(country, city, { veganOnly, category, subcategory, petFriendly })
      .then((rows) => { if (!cancelled) setPlaces(sortPlaces(rows, sort)); })
      .catch(() => { if (!cancelled) setPlaces([]); });
    return () => { cancelled = true; };
  }, [country, city, veganOnly, category, subcategory, petFriendly, sort]);

  const count = places?.length ?? 0;

  return (
    <View style={styles.container}>
      <BrowseHeader
        title={city ?? ''}
        subtitle={places ? `${country} · ${count.toLocaleString()} ${count === 1 ? 'place' : 'places'}` : country}
        right={canFollow ? (
          <TouchableOpacity
            onPress={toggle}
            style={styles.pin}
            accessibilityRole="button"
            accessibilityLabel={following ? 'Unpin city' : 'Pin city'}
            hitSlop={10}
          >
            <Ionicons name={following ? 'bookmark' : 'bookmark-outline'} size={22} color={following ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        ) : undefined}
      />

      <View style={styles.filterRow}>
        <View style={styles.toggleWrap}><VeganOnlyToggle /></View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)} accessibilityLabel="Filters">
          <Ionicons name="options-outline" size={20} color={colors.text} />
          {activeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {places === null ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : places.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="leaf-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>No places match these filters here</Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(p) => p.id}
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
  loader: { marginTop: spacing.xl },
  pin: { padding: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toggleWrap: { flex: 1 },
  filterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center' },
});
