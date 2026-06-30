import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrowseHeader } from '../../src/components/browse/BrowseHeader';
import { BrowseRow } from '../../src/components/browse/BrowseRow';
import { VeganOnlyToggle } from '../../src/components/filters/VeganOnlyToggle';
import { FilterModal } from '../../src/components/filters/FilterModal';
import { fetchCities, CityRow } from '../../src/lib/directory';
import { useFilterStore } from '../../src/store/filterStore';
import { colors, spacing, typography } from '../../src/constants/theme';

export default function CountryBrowseScreen() {
  const { country } = useLocalSearchParams<{ country: string }>();
  const [cities, setCities] = useState<CityRow[] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const veganOnly = useFilterStore((s) => s.veganOnly);
  const activeCount = useFilterStore((s) => (s.category ? 1 : 0) + (s.subcategory ? 1 : 0) + (s.petFriendly ? 1 : 0) + (s.sort !== 'vegan' ? 1 : 0));

  useEffect(() => {
    if (!country) return;
    let cancelled = false;
    setCities(null);
    fetchCities(country, veganOnly)
      .then((rows) => { if (!cancelled) setCities(rows); })
      .catch(() => { if (!cancelled) setCities([]); });
    return () => { cancelled = true; };
  }, [country, veganOnly]);

  return (
    <View style={styles.container}>
      <BrowseHeader
        title={country ?? ''}
        subtitle={cities ? `${cities.length} ${cities.length === 1 ? 'city' : 'cities'}` : undefined}
      />

      <View style={styles.filterRow}>
        <View style={styles.toggleWrap}><VeganOnlyToggle /></View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)} accessibilityLabel="Filters">
          <Ionicons name="options-outline" size={20} color={colors.text} />
          {activeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {cities === null ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : cities.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>{veganOnly ? 'No cities with 100% vegan places yet' : 'No cities with enough places yet'}</Text>
        </View>
      ) : (
        <FlatList
          data={cities}
          keyExtractor={(c) => c.city}
          renderItem={({ item }) => (
            <BrowseRow
              title={item.city}
              subtitle={
                veganOnly
                  ? `${item.fully_vegan_count.toLocaleString()} fully vegan`
                  : `${item.place_count.toLocaleString()} ${item.place_count === 1 ? 'place' : 'places'}`
              }
              accent={!veganOnly && item.fully_vegan_count > 0 ? `${item.fully_vegan_count} fully vegan` : undefined}
              onPress={() => router.push({ pathname: '/browse/city', params: { country: item.country, city: item.city } })}
            />
          )}
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
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toggleWrap: { flex: 1 },
  filterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  list: { paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center' },
});
