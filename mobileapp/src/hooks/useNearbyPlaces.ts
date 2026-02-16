import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Place } from '@/src/types/database';

interface UseNearbyPlacesOptions {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export const useNearbyPlaces = (options: UseNearbyPlacesOptions) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.latitude && options.longitude) {
      fetchNearbyPlaces();
    }
  }, [options.latitude, options.longitude, options.radiusKm]);

  const fetchNearbyPlaces = async () => {
    try {
      setLoading(true);
      setError(null);

      const radius = options.radiusKm || 10; // Default 10km

      // Calculate bounding box (rough approximation)
      const latDiff = radius / 111; // 1 degree latitude ≈ 111 km
      const lngDiff = radius / (111 * Math.cos(options.latitude * Math.PI / 180));

      const { data, error: queryError } = await supabase
        .from('places')
        .select(`
          *,
          reviews:place_reviews(rating),
          favorites:favorite_places(user_id)
        `)
        .eq('approved', true)
        .gte('latitude', options.latitude - latDiff)
        .lte('latitude', options.latitude + latDiff)
        .gte('longitude', options.longitude - lngDiff)
        .lte('longitude', options.longitude + lngDiff)
        .limit(50);

      if (queryError) throw queryError;

      // Calculate distance and filter by actual radius
      const placesWithDistance = (data || []).map((place: any) => {
        const distance = calculateDistance(
          options.latitude,
          options.longitude,
          place.latitude,
          place.longitude
        );

        const reviews = place.reviews || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
          : 0;

        return {
          ...place,
          distance,
          average_rating: avgRating,
          reviews_count: reviews.length,
          is_favorited: place.favorites && place.favorites.length > 0,
        };
      })
      .filter((place: any) => place.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance);

      setPlaces(placesWithDistance);
    } catch (err: any) {
      console.error('Error fetching nearby places:', err);
      setError(err.message || 'Failed to fetch nearby places');
    } finally {
      setLoading(false);
    }
  };

  return {
    places,
    loading,
    error,
    refetch: fetchNearbyPlaces,
  };
};

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return value * Math.PI / 180;
}
