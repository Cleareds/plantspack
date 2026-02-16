import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/formatters';
import type { Pack, PackCategory } from '@/src/types/database';

interface PackCardProps {
  pack: Pack & { members_count?: number; posts_count?: number };
}

const CATEGORY_COLORS: Record<PackCategory, string> = {
  recipes: '#FF6B35',
  traveling: '#3498DB',
  products: '#9B59B6',
  resources: '#2ECC71',
  lifestyle: '#E74C3C',
  other: colors.gray[500],
};

export const PackCard: React.FC<PackCardProps> = ({ pack }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/pack/${pack.id}`);
  };

  const categoryColor = CATEGORY_COLORS[pack.category] || colors.gray[500];

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
      {/* Banner Image */}
      {pack.banner_url ? (
        <Image
          source={{ uri: pack.banner_url }}
          style={styles.banner}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.banner, styles.placeholderBanner]}>
          <Ionicons name="albums" size={40} color={colors.gray[300]} />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {pack.category}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {pack.name}
        </Text>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {pack.description}
        </Text>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {formatNumber(pack.members_count || 0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.statText}>
              {formatNumber(pack.posts_count || 0)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  banner: {
    width: '100%',
    height: 120,
    backgroundColor: colors.gray[200],
  },
  placeholderBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
  },
  content: {
    padding: spacing[3],
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.base,
    marginBottom: spacing[2],
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.4,
    marginBottom: spacing[3],
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});
