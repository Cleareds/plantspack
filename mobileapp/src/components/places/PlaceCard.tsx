import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VeganBadge } from '../ui/VeganBadge';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface Place {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  vegan_level: string | null;
  category: string | null;
  main_image_url: string | null;
  average_rating?: number | null;
  review_count?: number | null;
  distance_km?: number | null;
}

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/place/${place.slug}` as any)}
      activeOpacity={0.7}
    >
      {place.main_image_url ? (
        <Image source={{ uri: place.main_image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="leaf-outline" size={24} color={colors.textLight} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
        <VeganBadge level={place.vegan_level} size="sm" />
        {(place.city || place.country) && (
          <Text style={styles.location} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            {' '}{[place.city, place.country].filter(Boolean).join(', ')}
          </Text>
        )}
        <View style={styles.meta}>
          {(place.average_rating ?? 0) > 0 && (
            <Text style={styles.rating}>⭐ {place.average_rating!.toFixed(1)}</Text>
          )}
          {(place.distance_km ?? 0) > 0 && (
            <Text style={styles.distance}>
              {place.distance_km! < 1
                ? `${Math.round(place.distance_km! * 1000)}m`
                : `${place.distance_km!.toFixed(1)}km`}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textLight} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    flexShrink: 0,
  },
  imagePlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  location: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  rating: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  distance: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  chevron: {
    flexShrink: 0,
  },
});
