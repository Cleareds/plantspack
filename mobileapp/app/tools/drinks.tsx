import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { VEGAN_DRINKS, DRINK_KINDS, DrinkKind, DrinkStatus } from '../../src/lib/vegan-drinks-data';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const STATUS_COLORS: Record<DrinkStatus, string> = {
  vegan: '#16a34a',
  not_vegan: '#dc2626',
  varies: '#d97706',
};
const STATUS_LABELS: Record<DrinkStatus, string> = {
  vegan: 'Vegan',
  not_vegan: 'Not Vegan',
  varies: 'Varies',
};

export default function DrinksScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [activeKind, setActiveKind] = useState<DrinkKind | null>(null);

  const results = useMemo(() => {
    return VEGAN_DRINKS.filter((drink) => {
      const matchKind = !activeKind || drink.kind === activeKind;
      const matchQuery = !query.trim() || drink.name.toLowerCase().includes(query.toLowerCase()) || (drink.brand ?? '').toLowerCase().includes(query.toLowerCase());
      return matchKind && matchQuery;
    });
  }, [query, activeKind]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Drinks Lookup</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="wine-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Search beer, wine, spirits..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Kind filters */}
      <View style={styles.kindRow}>
        <TouchableOpacity
          style={[styles.kindChip, !activeKind && styles.kindChipActive]}
          onPress={() => setActiveKind(null)}
        >
          <Text style={[styles.kindText, !activeKind && styles.kindTextActive]}>All</Text>
        </TouchableOpacity>
        {DRINK_KINDS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.kindChip, activeKind === key && styles.kindChipActive]}
            onPress={() => setActiveKind(activeKind === key ? null : key)}
          >
            <Text style={[styles.kindText, activeKind === key && styles.kindTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, i) => `${item.brand}-${i}`}
        renderItem={({ item }) => (
          <View style={styles.drinkRow}>
            <View style={styles.drinkInfo}>
              <Text style={styles.brandName}>{item.name}</Text>
              {item.note && <Text style={styles.notes}>{item.note}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '18', borderColor: STATUS_COLORS[item.status] }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No drinks found for "{query}"</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: typography.base, color: colors.text },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  kindChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  kindChipActive: {
    backgroundColor: '#b45309',
    borderColor: '#b45309',
  },
  kindText: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  kindTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  drinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  drinkInfo: { flex: 1 },
  brandName: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  notes: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: { fontSize: typography.sm, fontWeight: '700' },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: typography.base },
});
