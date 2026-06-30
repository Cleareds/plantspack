import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { track } from '../../src/lib/analytics';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const TOOLS = [
  {
    id: 'barcode',
    icon: 'barcode-outline' as const,
    title: 'Barcode Scanner',
    description: 'Scan any food or cosmetics barcode',
    color: '#7c3aed',
    route: '/tools/barcode',
  },
  {
    id: 'ingredient-scanner',
    icon: 'camera-outline' as const,
    title: 'Ingredient Scanner',
    description: 'Photo of ingredients → AI checks vegan status',
    color: '#0891b2',
    route: '/tools/ingredient-scanner',
  },
  {
    id: 'menu-scanner',
    icon: 'restaurant-outline' as const,
    title: 'Menu Scanner',
    description: 'Photo a menu → AI highlights vegan dishes',
    color: '#db2777',
    route: '/tools/menu-scanner',
  },
  {
    id: 'drinks',
    icon: 'wine-outline' as const,
    title: 'Drinks Lookup',
    description: 'Is your beer or wine vegan?',
    color: '#b45309',
    route: '/tools/drinks',
  },
  {
    id: 'ecodes',
    icon: 'list-outline' as const,
    title: 'E-Numbers',
    description: 'Check if food additives are vegan',
    color: '#dc2626',
    route: '/tools/ecodes',
  },
  {
    id: 'impact',
    icon: 'earth-outline' as const,
    title: 'Impact Calculator',
    description: 'CO₂, water, and lives saved by going vegan',
    color: '#16a34a',
    route: '/tools/impact',
  },
  {
    id: 'substitutes',
    icon: 'swap-horizontal-outline' as const,
    title: 'Substitute Finder',
    description: 'Plant-based swaps for any ingredient',
    color: '#ea580c',
    route: '/tools/substitutes',
  },
  {
    id: 'cards',
    icon: 'language-outline' as const,
    title: 'Restaurant Cards',
    description: '"I\'m vegan" in 30 languages for travel',
    color: '#0d9488',
    route: '/tools/cards',
  },
];

export default function ToolsTab() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.header}>Vegan Tools</Text>
      <Text style={styles.subheader}>In-store helpers & calculators</Text>
      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={styles.card}
            onPress={() => { track('tool_opened', { tool: tool.id }); router.push(tool.route as any); }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: tool.color + '18' }]}>
              <Ionicons name={tool.icon} size={28} color={tool.color} />
            </View>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDescription}>{tool.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: 80 },
  header: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  subheader: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  toolDescription: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
