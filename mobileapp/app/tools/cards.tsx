import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, ScrollView, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RESTAURANT_CARDS, RestaurantCard, CardVariant } from '../../src/lib/cards-data';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const RTL = new Set(['ar', 'he', 'ur']);

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [variant, setVariant] = useState<CardVariant>('vegan');
  const [selected, setSelected] = useState<RestaurantCard | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RESTAURANT_CARDS;
    return RESTAURANT_CARDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.native.toLowerCase().includes(q) || c.lang.includes(q),
    );
  }, [query]);

  const title = selected ? (variant === 'gentle' && selected.titleGentle ? selected.titleGentle : selected.title) : '';
  const body = selected ? (variant === 'gentle' && selected.bodyGentle ? selected.bodyGentle : selected.body) : '';
  const isRtl = selected ? RTL.has(selected.lang) : false;
  const align = isRtl ? ('right' as const) : ('left' as const);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Restaurant Cards</Text>
      </View>

      <View style={styles.controls}>
        <Text style={styles.subtitle}>Show a waiter you&apos;re vegan, in their language.</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, variant === 'vegan' && styles.toggleActive]}
            onPress={() => setVariant('vegan')}
          >
            <Text style={[styles.toggleText, variant === 'vegan' && styles.toggleTextActive]}>Vegan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, variant === 'gentle' && styles.toggleActive]}
            onPress={() => setVariant('gentle')}
          >
            <Text style={[styles.toggleText, variant === 'gentle' && styles.toggleTextActive]}>Animal-free dining</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Search language (spanish, español, es)"
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.lang}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setSelected(item)} accessibilityRole="button">
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowNative}>{item.native}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={<Text style={styles.empty}>No language matches “{query}”.</Text>}
      />

      {/* Full card to show a waiter */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.cardScreen}>
          <View style={[styles.cardHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.cardLangLabel}>{selected?.label} / {selected?.native}</Text>
            <View style={styles.cardHeaderActions}>
              <TouchableOpacity
                onPress={() => Share.share({ message: `${title}\n\n${body}\n\n${selected?.thanks ?? ''}\n\n— via PlantsPack · plantspack.com/tools/cards` })}
                style={styles.closeBtn}
                accessibilityLabel="Share card"
              >
                <Ionicons name="share-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn} accessibilityLabel="Close">
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.cardBody}>
            <Text style={[styles.cardTitle, { textAlign: align, writingDirection: isRtl ? 'rtl' : 'ltr' }]}>{title}</Text>
            <Text style={[styles.cardText, { textAlign: align, writingDirection: isRtl ? 'rtl' : 'ltr' }]}>{body}</Text>
            <Text style={[styles.cardThanks, { textAlign: align, writingDirection: isRtl ? 'rtl' : 'ltr' }]}>{selected?.thanks}</Text>
            <Text style={styles.cardFooter}>plantspack.com</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  controls: { padding: spacing.md, gap: spacing.sm },
  subtitle: { fontSize: typography.base, color: colors.textSecondary },
  toggle: { flexDirection: 'row', backgroundColor: colors.backgroundSecondary, borderRadius: radius.full, padding: 3, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  toggleBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: typography.sm, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.backgroundSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 44,
  },
  input: { flex: 1, fontSize: typography.base, color: colors.text },
  list: { paddingBottom: 80 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  rowNative: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 1 },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl },

  cardScreen: { flex: 1, backgroundColor: colors.background },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardLangLabel: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  cardHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  closeBtn: { padding: 4 },
  cardBody: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 30, fontWeight: '800', color: colors.text, lineHeight: 38 },
  cardText: { fontSize: 21, color: colors.text, lineHeight: 31 },
  cardThanks: { fontSize: 19, fontStyle: 'italic', color: colors.textSecondary, lineHeight: 27 },
  cardFooter: { fontSize: typography.sm, color: colors.textLight, marginTop: spacing.lg },
});
