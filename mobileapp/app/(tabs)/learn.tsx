import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { INGREDIENT_ARTICLES, TRAVEL_GUIDES } from '../../src/content/vegan';
import { track } from '../../src/lib/analytics';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

type Row =
  | { kind: 'header'; key: string; label: string; sub: string }
  | { kind: 'article'; key: string; slug: string; title: string; snippet: string; verdict: string }
  | { kind: 'travel'; key: string; slug: string; title: string; snippet: string; stars: number };

const VERDICT_COLOR: Record<string, string> = {
  'usually-yes': '#16a34a', 'sometimes': '#d97706', 'usually-no': '#dc2626', 'depends': '#6b7280',
};
const VERDICT_LABEL: Record<string, string> = {
  'usually-yes': 'Usually yes', 'sometimes': 'Sometimes', 'usually-no': 'Usually no', 'depends': 'Depends',
};

export default function LearnTab() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const query = q.trim().toLowerCase();
    const match = (s: string) => !query || s.toLowerCase().includes(query);

    const answers = INGREDIENT_ARTICLES.filter((a) => a.category === 'ingredient' || a.category === 'drink')
      .filter((a) => match(a.title) || a.searchQueries.some(match));
    const reference = INGREDIENT_ARTICLES.filter((a) => a.category === 'lifestyle')
      .filter((a) => match(a.title) || a.searchQueries.some(match));
    const travel = TRAVEL_GUIDES.filter((g) => match(g.countryName) || match(g.tldr));

    const out: Row[] = [];
    if (answers.length) {
      out.push({ kind: 'header', key: 'h-answers', label: 'Is it vegan?', sub: 'Clear, sourced answers' });
      answers.forEach((a) => out.push({ kind: 'article', key: a.slug, slug: a.slug, title: a.title, snippet: a.verdictHeadline, verdict: a.verdict }));
    }
    if (travel.length) {
      out.push({ kind: 'header', key: 'h-travel', label: 'Travel guides', sub: 'Eating vegan abroad' });
      travel.forEach((g) => out.push({ kind: 'travel', key: g.countrySlug, slug: g.countrySlug, title: g.countryName, snippet: g.tldr, stars: g.vegFriendliness }));
    }
    if (reference.length) {
      out.push({ kind: 'header', key: 'h-ref', label: 'Health & reference', sub: 'Nutrition and the basics' });
      reference.forEach((a) => out.push({ kind: 'article', key: a.slug, slug: a.slug, title: a.title, snippet: a.verdictHeadline, verdict: a.verdict }));
    }
    return out;
  }, [q]);

  const open = (slug: string) => { track('learn_article_opened', { slug }); router.push({ pathname: '/learn/[slug]', params: { slug } }); };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <Text style={styles.header}>Library</Text>
        <Text style={styles.subheader}>Vegan answers, travel guides and reference - sourced, not opinion.</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput style={styles.input} placeholder="Search (honey, wine, Japan...)" placeholderTextColor={colors.textLight} value={q} onChangeText={setQ} autoCapitalize="none" />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No matches for “{q}”.</Text>}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>{item.label}</Text>
                <Text style={styles.sectionSub}>{item.sub}</Text>
              </View>
            );
          }
          return (
            <TouchableOpacity style={styles.row} onPress={() => open(item.slug)} activeOpacity={0.7}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSnippet} numberOfLines={2}>{item.snippet}</Text>
              </View>
              {item.kind === 'article' ? (
                <View style={[styles.verdict, { backgroundColor: (VERDICT_COLOR[item.verdict] ?? '#6b7280') + '18' }]}>
                  <Text style={[styles.verdictText, { color: VERDICT_COLOR[item.verdict] ?? '#6b7280' }]}>{VERDICT_LABEL[item.verdict] ?? '—'}</Text>
                </View>
              ) : (
                <View style={styles.stars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="leaf" size={11} color={i < item.stars ? colors.primary : colors.border} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  head: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  header: { fontSize: typography.xxl, fontWeight: '800', color: colors.text },
  subheader: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, backgroundColor: colors.backgroundSecondary, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 42 },
  input: { flex: 1, fontSize: typography.base, color: colors.text },
  list: { paddingBottom: 80, paddingTop: spacing.sm },
  sectionHead: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  sectionLabel: { fontSize: typography.md, fontWeight: '800', color: colors.text },
  sectionSub: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { flex: 1 },
  rowTitle: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  rowSnippet: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  verdict: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full },
  verdictText: { fontSize: typography.xs, fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 1 },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl },
});
