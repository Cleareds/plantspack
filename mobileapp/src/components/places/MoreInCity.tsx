import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { PlaceCard } from './PlaceCard';
import { DirectoryPlace } from '../../lib/directory';
import { colors, spacing, typography } from '../../constants/theme';

interface MoreInCityProps {
  country: string | null;
  city: string | null;
  excludeId: string;
}

export function MoreInCity({ country, city, excludeId }: MoreInCityProps) {
  const [places, setPlaces] = useState<DirectoryPlace[]>([]);

  useEffect(() => {
    if (!country || !city) return;
    let cancelled = false;
    supabase
      .from('places')
      .select('id, slug, name, city, country, vegan_level, category, main_image_url, average_rating, review_count')
      .is('archived_at', null)
      .ilike('country', country)
      .ilike('city', city)
      .neq('id', excludeId)
      .order('review_count', { ascending: false, nullsFirst: false })
      .limit(6)
      .then(({ data }) => { if (!cancelled) setPlaces((data ?? []) as DirectoryPlace[]); });
    return () => { cancelled = true; };
  }, [country, city, excludeId]);

  if (!city || places.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>More in {city}</Text>
      {places.map((p) => <PlaceCard key={p.id} place={p} />)}
      <TouchableOpacity
        style={styles.seeAll}
        onPress={() => router.push({ pathname: '/browse/city', params: { country: country ?? '', city } })}
      >
        <Text style={styles.seeAllText}>See all in {city}</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 2 },
  sectionTitle: {
    fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md },
  seeAllText: { color: colors.primary, fontWeight: '600', fontSize: typography.base },
});
