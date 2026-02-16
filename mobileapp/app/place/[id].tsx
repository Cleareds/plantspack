import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import type { Place, PlaceCategory } from '@/src/types/database';

const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  restaurant: colors.primary[500],
  cafe: '#8B4513',
  store: '#FF6B35',
  event: '#9B59B6',
  museum: '#3498DB',
  other: colors.gray[500],
};

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchPlace();
    }
  }, [id]);

  const fetchPlace = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('places')
        .select(`
          *,
          reviews:place_reviews(rating)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setPlace(data);

      // Calculate average rating
      const reviews = data.reviews || [];
      if (reviews.length > 0) {
        const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
        setAvgRating(avg);
        setReviewsCount(reviews.length);
      }

      // Check if favorited
      if (user) {
        const { data: favorite } = await supabase
          .from('favorite_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('place_id', id)
          .single();

        setIsFavorited(!!favorite);
      }
    } catch (error) {
      console.error('Error fetching place:', error);
      Alert.alert('Error', 'Failed to load place details');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to favorite places');
      return;
    }

    const previousState = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      if (isFavorited) {
        await supabase
          .from('favorite_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', id);
      } else {
        await supabase
          .from('favorite_places')
          .insert({
            user_id: user.id,
            place_id: id,
          });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsFavorited(previousState);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handleDirections = () => {
    if (!place) return;

    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (!place?.phone) return;
    Linking.openURL(`tel:${place.phone}`);
  };

  const handleWebsite = () => {
    if (!place?.website) return;
    Linking.openURL(place.website);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!place) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Place not found</Text>
      </View>
    );
  }

  const categoryColor = CATEGORY_COLORS[place.category] || colors.gray[500];

  return (
    <>
      <Stack.Screen
        options={{
          title: place.name,
          headerStyle: { backgroundColor: colors.primary[500] },
          headerTintColor: colors.text.inverse,
        }}
      />
      <ScrollView style={styles.container}>
        {/* Banner Image */}
        {place.image_url && (
          <Image
            source={{ uri: place.image_url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {place.category}
                </Text>
              </View>
              <Text style={styles.name}>{place.name}</Text>
            </View>

            <TouchableOpacity onPress={handleFavoriteToggle}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={28}
                color={isFavorited ? colors.like : colors.gray[400]}
              />
            </TouchableOpacity>
          </View>

          {/* Rating */}
          {avgRating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={20} color={colors.warning} />
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.reviewsCount}>
                ({reviewsCount} {reviewsCount === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          )}

          {/* Description */}
          {place.description && (
            <Text style={styles.description}>{place.description}</Text>
          )}

          {/* Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>

            {place.address && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={20} color={colors.primary[500]} />
                <Text style={styles.detailText}>{place.address}</Text>
              </View>
            )}

            {place.phone && (
              <TouchableOpacity style={styles.detailRow} onPress={handleCall}>
                <Ionicons name="call-outline" size={20} color={colors.primary[500]} />
                <Text style={[styles.detailText, styles.linkText]}>{place.phone}</Text>
              </TouchableOpacity>
            )}

            {place.website && (
              <TouchableOpacity style={styles.detailRow} onPress={handleWebsite}>
                <Ionicons name="globe-outline" size={20} color={colors.primary[500]} />
                <Text style={[styles.detailText, styles.linkText]} numberOfLines={1}>
                  {place.website}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Map Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                  }}
                  pinColor={categoryColor}
                />
              </MapView>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
              <Ionicons name="navigate" size={20} color={colors.text.inverse} />
              <Text style={styles.actionButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
  },
  bannerImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.gray[200],
  },
  content: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  headerLeft: {
    flex: 1,
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
  name: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  ratingText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  reviewsCount: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  description: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.6,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  detailText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    flex: 1,
  },
  linkText: {
    color: colors.primary[500],
  },
  mapContainer: {
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
  },
  actionButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
});
