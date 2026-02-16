import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import type { PlaceCategory } from '@/src/types/database';

interface CategoryFilterProps {
  selectedCategory: PlaceCategory | 'all';
  onSelectCategory: (category: PlaceCategory | 'all') => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'restaurant', label: 'Restaurants', icon: 'restaurant' },
  { id: 'cafe', label: 'Cafes', icon: 'cafe' },
  { id: 'store', label: 'Stores', icon: 'storefront' },
  { id: 'event', label: 'Events', icon: 'calendar' },
  { id: 'museum', label: 'Museums', icon: 'business' },
  { id: 'other', label: 'Other', icon: 'location' },
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;

          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => onSelectCategory(category.id as PlaceCategory | 'all')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={category.icon as any}
                size={18}
                color={isSelected ? colors.text.inverse : colors.text.secondary}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
});
