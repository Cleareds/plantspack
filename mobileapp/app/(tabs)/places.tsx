import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, Alert, TextInput, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { MapView } from '@/src/components/map/MapView';
import { CategoryFilter } from '@/src/components/map/CategoryFilter';
import { PlaceCard } from '@/src/components/map/PlaceCard';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { usePlaces } from '@/src/hooks/usePlaces';
import { geocodingService, type NominatimResult } from '@/src/lib/geocoding';
import { colors, spacing, typography } from '@/src/constants/theme';
import type { Place, PlaceCategory } from '@/src/types/database';

export default function PlacesScreen() {
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapViewRef = useRef<any>(null);

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

  // Search for addresses with debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setSearchLoading(true);
        const results = await geocodingService.search(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
        setSearchLoading(false);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchResultSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    setMapRegion({ latitude: lat, longitude: lon });
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
    Keyboard.dismiss();

    // Animate map to location
    if (mapViewRef.current) {
      mapViewRef.current.animateToRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setMapRegion(null);
  };

  const initialRegion = mapRegion || (userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    : undefined);

  if (loading && !places.length) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location..."
            placeholderTextColor={colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.searchResultsList}>
              {searchLoading ? (
                <View style={styles.searchLoadingContainer}>
                  <LoadingSpinner size="small" />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              ) : (
                searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.place_id}
                    style={styles.searchResultItem}
                    onPress={() => handleSearchResultSelect(result)}
                  >
                    <Ionicons name="location-outline" size={20} color={colors.primary[500]} />
                    <View style={styles.searchResultText}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>
                        {result.display_name.split(',')[0]}
                      </Text>
                      <Text style={styles.searchResultSubtitle} numberOfLines={2}>
                        {result.display_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Map */}
      <MapView
        ref={mapViewRef}
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
  searchContainer: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[4],
    right: spacing[4],
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: 14,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing[1],
  },
  searchResultsContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    marginTop: spacing[2],
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchLoadingContainer: {
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
  },
  searchLoadingText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing[2],
  },
  searchResultText: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  searchResultSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  countBadge: {
    position: 'absolute',
    top: spacing[20],
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
