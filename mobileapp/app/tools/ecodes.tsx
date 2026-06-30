import { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { E_CODES, ECodeStatus } from '../../src/lib/e-codes';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const STATUS_COLORS: Record<ECodeStatus, string> = {
  vegan: '#16a34a',
  non_vegan: '#dc2626',
  maybe: '#d97706',
};
const STATUS_LABELS: Record<ECodeStatus, string> = {
  vegan: 'Vegan',
  non_vegan: 'Not Vegan',
  maybe: 'Maybe',
};

export default function ECodesScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return E_CODES;
    const q = query.toLowerCase();
    return E_CODES.filter(
      (e) =>
        e.code.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.note ?? '').toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>E-Numbers</Text>
      </View>
      <Text style={styles.subtitle}>Check if food additives are vegan</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Search E120, carmine, ..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.codeBox}>
              <Text style={styles.code}>{item.code}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.note && <Text style={styles.desc} numberOfLines={2}>{item.note}</Text>}
            </View>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '18', borderColor: STATUS_COLORS[item.status] }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
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
  codeBox: {
    width: 54,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.sm,
    paddingVertical: 4,
    alignItems: 'center',
    flexShrink: 0,
  },
  code: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  info: { flex: 1 },
  name: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  desc: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  badgeText: { fontSize: typography.xs, fontWeight: '700' },
});
