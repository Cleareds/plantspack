import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import type { Place, PlaceCategory } from '@/src/types/database';

interface PlaceCardProps {
  place: Place & { average_rating?: number; reviews_count?: number; distance?: number; is_favorited?: boolean };
}

const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  store: 'storefront',
  event: 'calendar',
  museum: 'business',
  other: 'location',
};

const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  restaurant: colors.primary[500],
  cafe: '#8B4513',
  store: '#FF6B35',
  event: '#9B59B6',
  museum: '#3498DB',
  other: colors.gray[500],
};

export const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState(place.is_favorited || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFavoriteToggle = async (e: any) => {
    e.stopPropagation();

    if (!user) {
      Alert.alert('Login Required', 'Please login to favorite places');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      if (isFavorited) {
        await supabase
          .from('favorite_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', place.id);
      } else {
        await supabase
          .from('favorite_places')
          .insert({
            user_id: user.id,
            place_id: place.id,
          });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsFavorited(previousState);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    router.push(`/place/${place.id}`);
  };

  const categoryIcon = CATEGORY_ICONS[place.category] || 'location';
  const categoryColor = CATEGORY_COLORS[place.category] || colors.gray[500];

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
          <Ionicons name={categoryIcon as any} size={16} color={categoryColor} />
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {place.category}
          </Text>
        </View>

        <TouchableOpacity onPress={handleFavoriteToggle} disabled={isLoading}>
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorited ? colors.like : colors.gray[400]}
          />
        </TouchableOpacity>
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={2}>
        {place.name}
      </Text>

      {/* Rating & Reviews */}
      {place.average_rating && place.average_rating > 0 ? (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color={colors.warning} />
          <Text style={styles.ratingText}>
            {place.average_rating.toFixed(1)}
          </Text>
          <Text style={styles.reviewsCount}>
            ({place.reviews_count || 0} {place.reviews_count === 1 ? 'review' : 'reviews'})
          </Text>
        </View>
      ) : (
        <Text style={styles.noReviews}>No reviews yet</Text>
      )}

      {/* Address */}
      {place.address && (
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
          <Text style={styles.address} numberOfLines={1}>
            {place.address}
          </Text>
        </View>
      )}

      {/* Distance */}
      {place.distance !== undefined && (
        <View style={styles.row}>
          <Ionicons name="navigate-outline" size={14} color={colors.text.tertiary} />
          <Text style={styles.distance}>
            {place.distance < 1
              ? `${(place.distance * 1000).toFixed(0)}m away`
              : `${place.distance.toFixed(1)}km away`}
          </Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity style={styles.detailsButton} onPress={handlePress}>
        <Text style={styles.detailsButtonText}>View Details</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary[500]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.base,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textTransform: 'capitalize',
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  reviewsCount: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  noReviews: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[1],
  },
  address: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    flex: 1,
  },
  distance: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  detailsButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary[500],
  },
});
