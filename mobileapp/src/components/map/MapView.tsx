import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapViewComponent, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing } from '@/src/constants/theme';
import type { Place, PlaceCategory } from '@/src/types/database';

interface MapViewProps {
  places: Place[];
  onMarkerPress: (place: Place) => void;
  initialRegion?: Region;
}

const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  restaurant: colors.primary[500],
  cafe: '#8B4513',
  store: '#FF6B35',
  event: '#9B59B6',
  museum: '#3498DB',
  other: colors.gray[500],
};

export const MapView = React.forwardRef<MapViewComponent, MapViewProps>(
  ({ places, onMarkerPress, initialRegion }, ref) => {
  const internalMapRef = useRef<MapViewComponent>(null);
  const mapRef = (ref as React.RefObject<MapViewComponent>) || internalMapRef;
  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }
  );

  const handleMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your position');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setRegion(newRegion);
      (typeof mapRef === 'object' && mapRef?.current)?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
    }
  };

  return (
    <View style={styles.container}>
      <MapViewComponent
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            onPress={() => onMarkerPress(place)}
            pinColor={CATEGORY_COLORS[place.category] || colors.primary[500]}
          />
        ))}
      </MapViewComponent>

      {/* My Location Button */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={handleMyLocation}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={24} color={colors.primary[500]} />
      </TouchableOpacity>
    </View>
  );
});

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: spacing[4],
    right: spacing[4],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
