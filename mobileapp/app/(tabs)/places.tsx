import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { MapView } from '@/src/components/map/MapView';
import { CategoryFilter } from '@/src/components/map/CategoryFilter';
import { PlaceCard } from '@/src/components/map/PlaceCard';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { usePlaces } from '@/src/hooks/usePlaces';
import { colors, spacing, typography } from '@/src/constants/theme';
import type { Place, PlaceCategory } from '@/src/types/database';

export default function PlacesScreen() {
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { places, loading } = usePlaces({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const handleMarkerPress = (place: Place) => {
    setSelectedPlace(place);
  };

  const closeBottomSheet = () => {
    setSelectedPlace(null);
  };

  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    : undefined;

  if (loading && !places.length) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Map */}
      <MapView
        places={places}
        onMarkerPress={handleMarkerPress}
        initialRegion={initialRegion}
      />

      {/* Places Count Badge */}
      <View style={styles.countBadge}>
        <Ionicons name="location" size={16} color={colors.primary[500]} />
        <Text style={styles.countText}>{places.length} places</Text>
      </View>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={selectedPlace !== null}
        transparent
        animationType="slide"
        onRequestClose={closeBottomSheet}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeBottomSheet}
        >
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.bottomSheetHandle} />
            {selectedPlace && <PlaceCard place={selectedPlace} />}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  countBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing[4],
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: spacing[2],
  },
});
