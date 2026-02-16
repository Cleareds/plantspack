import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Place, PlaceCategory } from '@/src/types/database';

interface UsePlacesOptions {
  category?: PlaceCategory;
  searchTerm?: string;
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export const usePlaces = (options: UsePlacesOptions = {}) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaces();
  }, [options.category, options.searchTerm, JSON.stringify(options.bounds)]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('places')
        .select(`
          *,
          reviews:place_reviews(rating),
          favorites:favorite_places(user_id)
        `);

      // Filter by category
      if (options.category && options.category !== 'all') {
        query = query.eq('category', options.category);
      }

      // Search by name
      if (options.searchTerm) {
        query = query.ilike('name', `%${options.searchTerm}%`);
      }

      // Filter by bounds
      if (options.bounds) {
        query = query
          .gte('latitude', options.bounds.minLat)
          .lte('latitude', options.bounds.maxLat)
          .gte('longitude', options.bounds.minLng)
          .lte('longitude', options.bounds.maxLng);
      }

      const { data, error: queryError } = await query.limit(100);

      if (queryError) throw queryError;

      // Calculate average rating for each place
      const placesWithRatings = (data || []).map((place: any) => {
        const reviews = place.reviews || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
          : 0;

        return {
          ...place,
          average_rating: avgRating,
          reviews_count: reviews.length,
          is_favorited: place.favorites && place.favorites.length > 0,
        };
      });

      setPlaces(placesWithRatings);
    } catch (err: any) {
      console.error('Error fetching places:', err);
      setError(err.message || 'Failed to fetch places');
    } finally {
      setLoading(false);
    }
  };

  return {
    places,
    loading,
    error,
    refetch: fetchPlaces,
  };
};
