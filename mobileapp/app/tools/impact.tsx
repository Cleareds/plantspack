import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

// Per-year constants (Poore & Nemecek 2018, Scarborough 2023)
const PER_MEAL = {
  animals: 1 / 28,      // ~1 animal life per 28 meals
  co2_kg: 1.5,          // kg CO2e saved per meal vs avg omnivore
  water_liters: 422,    // liters saved per meal
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toString();
}

export default function ImpactScreen() {
  const insets = useSafeAreaInsets();
  const [years, setYears] = useState(1);
  const [mealsPerDay, setMealsPerDay] = useState(3);

  const totalMeals = years * 365 * mealsPerDay;
  const animals = Math.floor(totalMeals * PER_MEAL.animals);
  const co2 = totalMeals * PER_MEAL.co2_kg;
  const water = totalMeals * PER_MEAL.water_liters;

  const STATS = [
    { emoji: '🐮', value: formatNumber(animals), label: 'animal lives', color: '#16a34a' },
    { emoji: '🌍', value: `${formatNumber(co2)} kg`, label: 'CO₂ saved', color: '#0891b2' },
    { emoji: '💧', value: `${formatNumber(water)} L`, label: 'water saved', color: '#7c3aed' },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Impact Calculator</Text>
      </View>

      <Text style={styles.subtitle}>See the difference your vegan diet makes</Text>

      {/* Sliders */}
      <View style={styles.card}>
        <SliderRow
          label="Years vegan"
          value={years}
          min={1} max={30}
          onChange={setYears}
        />
        <SliderRow
          label="Meals per day"
          value={mealsPerDay}
          min={1} max={5}
          onChange={setMealsPerDay}
        />
        <Text style={styles.totalMeals}>{formatNumber(totalMeals)} total vegan meals</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {STATS.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { borderTopColor: stat.color, borderTopWidth: 3 }]}>
            <Text style={styles.statEmoji}>{stat.emoji}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={() => Share.share({
        message: `In ${years} year${years > 1 ? 's' : ''} vegan (${formatNumber(totalMeals)} meals) I've saved about ${formatNumber(animals)} animal lives, ${formatNumber(co2)} kg CO₂, and ${formatNumber(water)} L of water. 🌱\n\nCalculate yours on PlantsPack: https://plantspack.com/tools/calculator`,
      })}>
        <Ionicons name="share-outline" size={18} color={colors.white} />
        <Text style={styles.shareText}>Share my impact</Text>
      </TouchableOpacity>

      <Text style={styles.citation}>
        Based on Poore & Nemecek (2018) and Scarborough et al. (2023). Individual results vary by diet composition.
      </Text>
    </ScrollView>
  );
}

function SliderRow({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}: <Text style={styles.sliderValue}>{value}</Text></Text>
      <View style={styles.sliderButtons}>
        <TouchableOpacity
          style={styles.sliderBtn}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={20} color={value <= min ? colors.textLight : colors.text} />
        </TouchableOpacity>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${((value - min) / (max - min)) * 100}%` }]} />
        </View>
        <TouchableOpacity
          style={styles.sliderBtn}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Ionicons name="add" size={20} color={value >= max ? colors.textLight : colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 60 },
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
    fontSize: typography.base,
    color: colors.textSecondary,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  card: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  totalMeals: {
    textAlign: 'center',
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  sliderRow: { gap: 8 },
  sliderLabel: { fontSize: typography.base, color: colors.text, fontWeight: '500' },
  sliderValue: { fontWeight: '700', color: colors.primary },
  sliderButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statEmoji: { fontSize: 32 },
  statValue: { fontSize: typography.xl, fontWeight: '800' },
  statLabel: { fontSize: typography.xs, color: colors.textSecondary, textAlign: 'center' },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, marginHorizontal: spacing.md, marginTop: spacing.lg,
    paddingVertical: 14, borderRadius: radius.md,
  },
  shareText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
  citation: {
    fontSize: typography.xs,
    color: colors.textLight,
    padding: spacing.md,
    textAlign: 'center',
    lineHeight: 16,
  },
});
