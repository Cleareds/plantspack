import { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BAKING_INGREDIENTS } from '../../src/lib/baking-substitutes';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

export default function SubstitutesScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  // Flatten BAKING_INGREDIENTS into simple ingredient → substitute rows
  const allSubstitutes = useMemo(() => {
    return BAKING_INGREDIENTS.flatMap((ing) =>
      ing.options.map((opt) => ({
        ingredient: ing.label,
        substitute: opt.name,
        ratio: opt.bestFor.length > 0 ? `Best for: ${opt.bestFor.join(', ')}` : undefined,
      }))
    );
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return allSubstitutes;
    const q = query.toLowerCase();
    return allSubstitutes.filter(
      (s) =>
        s.ingredient.toLowerCase().includes(q) ||
        s.substitute.toLowerCase().includes(q)
    );
  }, [query, allSubstitutes]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Substitute Finder</Text>
      </View>
      <Text style={styles.subtitle}>Plant-based swaps for any ingredient</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Search egg, butter, milk, ..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item: any, i) => `${item.ingredient}-${i}`}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.row}>
            <View style={styles.ingredientBox}>
              <Text style={styles.ingredientLabel}>Instead of</Text>
              <Text style={styles.ingredient}>{item.ingredient}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            <View style={styles.substituteBox}>
              <Text style={styles.substituteLabel}>Use</Text>
              <Text style={styles.substitute}>{item.substitute}</Text>
              {item.ratio && <Text style={styles.ratio}>{item.ratio}</Text>}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No substitutes found for "{query}"</Text>
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
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: typography.base, color: colors.text },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientBox: { flex: 1 },
  ingredientLabel: { fontSize: typography.xs, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase' },
  ingredient: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  substituteBox: { flex: 1.4 },
  substituteLabel: { fontSize: typography.xs, color: colors.primary, fontWeight: '600', textTransform: 'uppercase' },
  substitute: { fontSize: typography.base, fontWeight: '700', color: colors.primary },
  ratio: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: typography.base },
});
