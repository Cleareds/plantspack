import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
  Share,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { VeganBadge } from '../../src/components/ui/VeganBadge';
import { VerifyPrompt } from '../../src/components/places/VerifyPrompt';
import { PlaceReviews } from '../../src/components/places/PlaceReviews';
import { MoreInCity } from '../../src/components/places/MoreInCity';
import { AuthPromptModal } from '../../src/components/ui/AuthPromptModal';
import { usePlaceSaveToggle } from '../../src/hooks/useSavedPlaces';
import { useAuthStore } from '../../src/store/authStore';
import { track } from '../../src/lib/analytics';
import { recordPositiveAction } from '../../src/lib/review';
import { colors, spacing, radius, typography } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// opening_hours is stored as an OSM-format string ("Mo 12:00-23:00; Tu off; ...")
// — same as the website. Split into rows and prettify day codes for display.
const DAY_CODE: Record<string, string> = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun' };

function formatHours(oh: string | Record<string, string> | null): { label: string; value: string }[] {
  if (!oh) return [];
  if (typeof oh === 'object') {
    return Object.entries(oh).map(([day, hours]) => ({
      label: day.charAt(0).toUpperCase() + day.slice(1, 3),
      value: String(hours),
    }));
  }
  return oh
    .split(/;|\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const pretty = line
        .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (d) => DAY_CODE[d] ?? d)
        .replace(/\b(off|closed)\b/gi, 'Closed')
        .replace(/\bP[Hh]\b/g, 'Holidays')
        .replace(/\bS[Hh]\b/g, 'School holidays');
      const m = pretty.match(/^([A-Za-z][A-Za-z,\-\s]*?)\s+(.+)$/);
      return m ? { label: m[1].trim(), value: m[2].trim() } : { label: '', value: pretty };
    });
}

interface Place {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  vegan_level: string | null;
  category: string | null;
  main_image_url: string | null;
  images: string[] | null;
  website: string | null;
  phone: string | null;
  opening_hours: string | Record<string, string> | null;
  average_rating: number | null;
  review_count: number | null;
  latitude: number | null;
  longitude: number | null;
  verification_method: string | null;
  verification_level: number | null;
  is_verified: boolean | null;
  tags: string[] | null;
}

export default function PlaceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  // Notifications deep-link by place UUID, the rest of the app by slug. The
  // [slug] segment carries either; detect a UUID and query the matching column.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug ?? '');
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const { saved, toggle: toggleSave } = usePlaceSaveToggle(place?.id ?? '');

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('places')
      .select('id, slug, name, description, address, city, country, vegan_level, category, main_image_url, images, website, phone, opening_hours, average_rating, review_count, latitude, longitude, verification_method, verification_level, is_verified, tags')
      .eq(isUuid ? 'id' : 'slug', slug)
      .single()
      .then(({ data }) => {
        setPlace(data);
        setLoading(false);
        if (data) track('place_viewed', { slug, vegan_level: data.vegan_level, country: data.country });
      });
  }, [slug, isUuid]);

  const handleSave = async () => {
    if (!user) { track('save_blocked_guest', { slug }); setShowAuthModal(true); return; }
    const wasSaved = saved;
    await toggleSave();
    track(wasSaved ? 'place_unsaved' : 'place_saved', { slug });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Saving (not unsaving) is a positive signal — a good moment to ask for a rating.
    if (!wasSaved) recordPositiveAction();
  };

  const handleDirections = () => {
    if (!place?.latitude || !place?.longitude) return;
    const label = encodeURIComponent(place.name);
    const url = `maps://?daddr=${place.latitude},${place.longitude}&dirflg=d`;
    const fallback = `https://maps.google.com/?daddr=${place.latitude},${place.longitude}`;
    Linking.canOpenURL(url).then((can) => Linking.openURL(can ? url : fallback));
  };

  const handleShare = async () => {
    if (!place) return;
    await Share.share({ message: `Check out ${place.name} on PlantsPack: https://plantspack.com/place/${place.slug}` });
  };

  const photos = [place?.main_image_url, ...(place?.images ?? [])].filter(Boolean) as string[];
  const hoursRows = formatHours(place?.opening_hours ?? null);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: colors.textSecondary }}>Place not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Photo carousel */}
        {photos.length > 0 ? (
          <View>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item}-${i}`}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.photo} resizeMode="cover" />
              )}
              onMomentumScrollEnd={(e) => {
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
              }}
            />
            {photos.length > 1 && (
              <View style={styles.photoDots}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="leaf-outline" size={48} color={colors.textLight} />
          </View>
        )}

        {/* Back + save buttons overlaying photo */}
        <View style={[styles.photoOverlay, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.overlayButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.overlayRight}>
            <TouchableOpacity style={styles.overlayButton} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share this place">
              <Ionicons name="share-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayButton} onPress={handleSave} accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save this place'}>
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={22}
                color={saved ? colors.error : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.name}>{place.name}</Text>
          <VeganBadge level={place.vegan_level} />

          {place.address && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.rowText}>{place.address}</Text>
            </View>
          )}

          {(place.average_rating ?? 0) > 0 && (
            <View style={styles.row}>
              <Ionicons name="star-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.rowText}>
                {place.average_rating!.toFixed(1)}
                {(place.review_count ?? 0) > 0
                  ? ` (${place.review_count} ${place.review_count === 1 ? 'review' : 'reviews'})`
                  : ''}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            {(place.latitude && place.longitude) && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Directions</Text>
              </TouchableOpacity>
            )}
            {place.website && (
              <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(place.website!)}>
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Website</Text>
              </TouchableOpacity>
            )}
            {place.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${place.phone}`)}>
                <Ionicons name="call-outline" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Guest sign-up nudge */}
          {!user && (
            <TouchableOpacity style={styles.guestCta} onPress={() => router.push('/auth')} activeOpacity={0.85}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <View style={styles.guestCtaText}>
                <Text style={styles.guestCtaTitle}>Save it, review it, make it yours</Text>
                <Text style={styles.guestCtaSub}>Sign in free to bookmark places, write reviews and sync across devices.</Text>
              </View>
              <Text style={styles.guestCtaBtn}>Sign up</Text>
            </TouchableOpacity>
          )}

          {/* Community verification */}
          <VerifyPrompt
            placeId={place.id}
            veganLevel={place.vegan_level}
            verificationMethod={place.verification_method}
            verificationLevel={place.verification_level}
            isVerified={place.is_verified}
            tags={place.tags}
          />

          {/* Description */}
          {place.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{place.description}</Text>
            </View>
          )}

          {/* Opening hours */}
          {hoursRows.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opening hours</Text>
              {hoursRows.map((row, i) => (
                <View key={i} style={styles.hoursRow}>
                  <Text style={styles.dayLabel}>{row.label}</Text>
                  <Text style={styles.hoursText}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          <PlaceReviews placeId={place.id} />

          {/* More places in this city */}
          <MoreInCity country={place.country} city={place.city} excludeId={place.id} />

          {/* Business owner claim — handled on the website */}
          <TouchableOpacity
            style={styles.claimRow}
            onPress={() => WebBrowser.openBrowserAsync(`https://plantspack.com/place/${place.slug}?claim=1`)}
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.claimText}>Own this business? Claim it on the web</Text>
            <Ionicons name="open-outline" size={14} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AuthPromptModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Save this place"
        message="Create a free account to bookmark vegan places and access them from any device."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: { width: SCREEN_WIDTH, height: 280 },
  photoPlaceholder: {
    width: SCREEN_WIDTH,
    height: 200,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#fff' },
  photoOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayRight: { flexDirection: 'row', gap: 8 },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  details: { padding: spacing.md, gap: spacing.md },
  name: {
    fontSize: typography.xxl,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  rowText: {
    flex: 1,
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionText: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: '600',
  },
  guestCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  guestCtaText: { flex: 1 },
  guestCtaTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  guestCtaSub: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 18, marginTop: 1 },
  guestCtaBtn: { fontSize: typography.sm, fontWeight: '700', color: colors.white, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, overflow: 'hidden' },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: typography.base,
    color: colors.text,
    lineHeight: 23,
  },
  hoursRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayLabel: {
    width: 110,
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dayLabelToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  hoursText: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
  },
  hoursTextToday: {
    fontWeight: '600',
    color: colors.primary,
  },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  claimText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: '500' },
});
