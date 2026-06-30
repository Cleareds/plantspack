import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlaceMarker } from '../../hooks/useNearbyPlaces';
import { VeganBadge } from '../ui/VeganBadge';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface PlaceBottomSheetProps {
  place: PlaceMarker;
  onClose: () => void;
}

export function PlaceBottomSheet({ place, onClose }: PlaceBottomSheetProps) {
  const handleViewDetails = () => {
    onClose();
    router.push(`/place/${place.slug}`);
  };

  return (
    <View style={styles.sheet}>
      <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={handleViewDetails} accessibilityRole="button" accessibilityLabel={`Open ${place.name}`}>
        {place.main_image_url ? (
          <Image source={{ uri: place.main_image_url }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="leaf-outline" size={28} color={colors.textLight} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
          <VeganBadge level={place.vegan_level} size="sm" />
          {place.city && (
            <Text style={styles.location} numberOfLines={1}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              {' '}{place.city}{place.country ? `, ${place.country}` : ''}
            </Text>
          )}
          {(place.average_rating ?? 0) > 0 && (
            <Text style={styles.rating}>⭐ {place.average_rating!.toFixed(1)}</Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.viewButton} onPress={handleViewDetails}>
        <Text style={styles.viewButtonText}>View Details</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.white} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  photoPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: typography.md,
    fontWeight: '700',
    color: colors.text,
  },
  location: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  rating: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  viewButtonText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: 4,
  },
});
