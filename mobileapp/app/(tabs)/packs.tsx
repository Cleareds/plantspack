import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PackCard } from '@/src/components/packs/PackCard';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { usePacks } from '@/src/hooks/usePacks';
import { colors, spacing, typography } from '@/src/constants/theme';
import type { PackCategory } from '@/src/types/database';

const CATEGORIES: Array<{ id: PackCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'traveling', label: 'Traveling' },
  { id: 'products', label: 'Products' },
  { id: 'resources', label: 'Resources' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'other', label: 'Other' },
];

export default function PacksScreen() {
  const [selectedCategory, setSelectedCategory] = useState<PackCategory | 'all'>('all');

  const { packs, loading } = usePacks({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.categoryTabs}>
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category.id;

          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryTab, isActive && styles.categoryTabActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  isActive && styles.categoryTabTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="albums-outline" size={64} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No packs found</Text>
        <Text style={styles.emptyText}>
          {selectedCategory === 'all'
            ? 'Be the first to create a pack!'
            : `No packs in ${selectedCategory} category yet`}
        </Text>
      </View>
    );
  };

  if (loading && packs.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={packs}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <PackCard pack={item} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={packs.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  categoryTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  categoryTab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
  },
  categoryTabActive: {
    backgroundColor: colors.primary[500],
  },
  categoryTabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  categoryTabTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  list: {
    paddingHorizontal: spacing[2],
    paddingTop: spacing[3],
  },
  row: {
    gap: spacing[3],
    paddingHorizontal: spacing[2],
    marginBottom: spacing[3],
  },
  cardWrapper: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
