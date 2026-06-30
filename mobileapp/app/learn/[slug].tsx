import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { getIngredientArticle, getTravelGuide } from '../../src/content/vegan';
import type { IngredientArticle, TravelGuide, DishEntry } from '../../src/content/vegan/types';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const TOOL_ROUTE: Record<string, string> = {
  'ingredient-scanner': '/tools/ingredient-scanner',
  'menu-scanner': '/tools/menu-scanner',
  'barcode': '/tools/barcode',
  'substitutes': '/tools/substitutes',
  'cards': '/tools/cards',
  'calculator': '/tools/impact',
  'drinks': '/tools/drinks',
};
const TOOL_LABEL: Record<string, string> = {
  'ingredient-scanner': 'Label scanner', 'menu-scanner': 'Menu scanner', 'barcode': 'Barcode scanner',
  'substitutes': 'Substitutes', 'cards': 'Restaurant cards', 'calculator': 'Impact calculator', 'drinks': 'Drinks checker',
};

const VERDICT_COLOR: Record<string, string> = { 'usually-yes': '#16a34a', 'sometimes': '#d97706', 'usually-no': '#dc2626', 'depends': '#6b7280' };
const VERDICT_LABEL: Record<string, string> = { 'usually-yes': 'Usually vegan', 'sometimes': 'Sometimes vegan', 'usually-no': 'Usually not vegan', 'depends': 'It depends' };
const DISH_COLOR: Record<string, string> = { vegan: '#16a34a', 'usually-vegan': '#16a34a', ask: '#d97706', avoid: '#dc2626' };

export default function LearnArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const article = slug ? getIngredientArticle(slug) : undefined;
  const guide = !article && slug ? getTravelGuide(slug) : undefined;

  const Header = ({ title }: { title: string }) => (
    <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={colors.text} /></TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
    </View>
  );

  if (!article && !guide) {
    return (
      <View style={styles.container}>
        <Header title="Not found" />
        <View style={styles.notFound}><Text style={styles.notFoundText}>This article isn’t available.</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={article ? article.title : guide!.countryName} />
      <ScrollView contentContainerStyle={styles.body}>
        {article ? <ArticleView a={article} /> : <GuideView g={guide!} />}
        <Text style={styles.updated}>Updated {new Date((article?.updatedAt ?? guide!.updatedAt)).toLocaleDateString()}</Text>
        <Text style={styles.disclaimer}>Sourced reference, not medical or dietary advice. Always check the specific product or venue.</Text>
      </ScrollView>
    </View>
  );
}

function ArticleView({ a }: { a: IngredientArticle }) {
  const color = VERDICT_COLOR[a.verdict] ?? '#6b7280';
  return (
    <>
      <Text style={styles.title}>{a.title}</Text>
      <View style={[styles.verdictPill, { backgroundColor: color + '18' }]}>
        <Ionicons name="leaf" size={14} color={color} />
        <Text style={[styles.verdictText, { color }]}>{VERDICT_LABEL[a.verdict] ?? a.verdict}</Text>
      </View>
      <Text style={styles.verdictHeadline}>{a.verdictHeadline}</Text>
      <Md>{a.tldr}</Md>

      {a.fullAnswer.map((p, i) => <Md key={i}>{p}</Md>)}

      {a.whatToLookFor && (
        <View style={styles.lookFor}>
          <Column title="Look for" tint="#16a34a" icon="checkmark-circle" items={a.whatToLookFor.good} />
          <Column title="Avoid" tint="#dc2626" icon="close-circle" items={a.whatToLookFor.avoid} />
        </View>
      )}

      {a.relatedTools.filter((t) => TOOL_ROUTE[t]).length > 0 && (
        <Section title="Tools that help">
          <View style={styles.toolRow}>
            {a.relatedTools.filter((t) => TOOL_ROUTE[t]).map((t) => (
              <TouchableOpacity key={t} style={styles.toolChip} onPress={() => router.push(TOOL_ROUTE[t] as any)}>
                <Ionicons name="construct-outline" size={14} color={colors.primary} />
                <Text style={styles.toolChipText}>{TOOL_LABEL[t] ?? t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>
      )}

      {a.faq.length > 0 && (
        <Section title="FAQ">
          {a.faq.map((f, i) => (
            <View key={i} style={styles.faq}>
              <Text style={styles.faqQ}>{f.question}</Text>
              <Md>{f.answer}</Md>
            </View>
          ))}
        </Section>
      )}

      {a.sources && a.sources.length > 0 && (
        <Section title="Sources">
          {a.sources.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => Linking.openURL(s.url)}><Text style={styles.sourceLink}>• {s.title}</Text></TouchableOpacity>
          ))}
        </Section>
      )}
    </>
  );
}

function GuideView({ g }: { g: TravelGuide }) {
  return (
    <>
      <Text style={styles.title}>Vegan in {g.countryName}</Text>
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => <Ionicons key={i} name="leaf" size={16} color={i < g.vegFriendliness ? colors.primary : colors.border} />)}
        <Text style={styles.starsNote}>{g.vegFriendlinessNote}</Text>
      </View>
      <Md>{g.tldr}</Md>
      {g.intro.map((p, i) => <Md key={i}>{p}</Md>)}

      {g.phrases.length > 0 && (
        <Section title="Useful phrases">
          {g.phrases.map((p, i) => (
            <View key={i} style={styles.phrase}>
              <Text style={styles.phraseEn}>{p.english}</Text>
              <Text style={styles.phraseNative}>{p.native}{p.pronunciation ? `  ·  ${p.pronunciation}` : ''}</Text>
            </View>
          ))}
        </Section>
      )}

      <Section title="Dishes">
        <DishGroup label="Safe bets" dishes={g.dishes.vegan} />
        <DishGroup label="Ask first" dishes={g.dishes.ask} />
        <DishGroup label="Avoid" dishes={g.dishes.avoid} />
      </Section>

      {g.hiddenIngredients.length > 0 && (
        <Section title="Hidden ingredients to watch">
          {g.hiddenIngredients.map((h, i) => <Text key={i} style={styles.bullet}>• {h}</Text>)}
        </Section>
      )}

      {g.tips.length > 0 && (
        <Section title="Tips">
          {g.tips.map((t, i) => <Text key={i} style={styles.bullet}>• {t}</Text>)}
        </Section>
      )}
    </>
  );
}

function DishGroup({ label, dishes }: { label: string; dishes: DishEntry[] }) {
  if (!dishes.length) return null;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.dishGroupLabel}>{label}</Text>
      {dishes.map((d, i) => (
        <View key={i} style={styles.dish}>
          <View style={[styles.dot, { backgroundColor: DISH_COLOR[d.status] ?? '#6b7280' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dishName}>{d.name}{d.nativeName ? ` (${d.nativeName})` : ''}</Text>
            <Text style={styles.dishNote}>{d.note}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Column({ title, tint, icon, items }: { title: string; tint: string; icon: any; items: string[] }) {
  return (
    <View style={styles.col}>
      <View style={styles.colHead}><Ionicons name={icon} size={15} color={tint} /><Text style={[styles.colTitle, { color: tint }]}>{title}</Text></View>
      {items.map((it, i) => <Text key={i} style={styles.colItem}>{it}</Text>)}
    </View>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}
function Md({ children }: { children: string }) {
  return <Markdown style={mdStyles} onLinkPress={(url) => { Linking.openURL(url); return false; }}>{children}</Markdown>;
}

const mdStyles = {
  body: { fontSize: typography.base, color: colors.text, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: spacing.md },
  strong: { fontWeight: '700' as const, color: colors.text },
  link: { color: colors.primary },
  bullet_list: { marginBottom: spacing.md },
  list_item: { marginBottom: 4 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  headerTitle: { fontSize: typography.md, fontWeight: '700', color: colors.text, flex: 1 },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: typography.xxl, fontWeight: '800', color: colors.text, lineHeight: 34, marginBottom: spacing.sm },
  verdictPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, marginBottom: spacing.sm },
  verdictText: { fontSize: typography.sm, fontWeight: '800' },
  verdictHeadline: { fontSize: typography.md, fontWeight: '600', color: colors.text, marginBottom: spacing.md, lineHeight: 24 },
  lookFor: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  col: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 6 },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  colTitle: { fontSize: typography.sm, fontWeight: '800' },
  colItem: { fontSize: typography.sm, color: colors.text, lineHeight: 19 },
  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toolChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary },
  toolChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.primary },
  faq: { marginBottom: spacing.md },
  faqQ: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sourceLink: { fontSize: typography.sm, color: colors.primary, lineHeight: 22 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md, flexWrap: 'wrap' },
  starsNote: { fontSize: typography.sm, color: colors.textSecondary, marginLeft: spacing.sm, flexShrink: 1 },
  phrase: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  phraseEn: { fontSize: typography.base, color: colors.text, fontWeight: '600' },
  phraseNative: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 1 },
  dishGroupLabel: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 6 },
  dish: { flexDirection: 'row', gap: spacing.sm, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dishName: { fontSize: typography.base, color: colors.text, fontWeight: '600' },
  dishNote: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 1, lineHeight: 18 },
  bullet: { fontSize: typography.base, color: colors.text, lineHeight: 23, marginBottom: 4 },
  updated: { fontSize: typography.xs, color: colors.textLight, marginTop: spacing.xl },
  disclaimer: { fontSize: typography.xs, color: colors.textLight, marginTop: spacing.sm, lineHeight: 16 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  notFoundText: { fontSize: typography.base, color: colors.textSecondary },
});
