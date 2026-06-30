import { useState, useRef, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, TextInput, Keyboard, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { track } from '../../src/lib/analytics';
import { geocodePlace } from '../../src/lib/geocode';
import { useNearbyPlaces, PlaceMarker } from '../../src/hooks/useNearbyPlaces';
import { PlaceBottomSheet } from '../../src/components/map/PlaceBottomSheet';
import { VeganOnlyToggle } from '../../src/components/filters/VeganOnlyToggle';
import { FilterModal } from '../../src/components/filters/FilterModal';
import { useFilterStore } from '../../src/store/filterStore';
import { colors, spacing, typography } from '../../src/constants/theme';
import { VEGAN_COLORS } from '../../src/constants/veganColors';

// MapLibre requires a native development build — not available in Expo Go
// Run: npx expo run:ios or npx expo run:android to test
let MapLibre: any;
try {
  MapLibre = require('@maplibre/maplibre-react-native');
} catch {
  MapLibre = null;
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Amsterdam default — overridden immediately once location is granted
const DEFAULT_CENTER: [number, number] = [4.9041, 52.3676];

export default function MapTab() {
  const insets = useSafeAreaInsets();
  const [selectedPlace, setSelectedPlace] = useState<PlaceMarker | null>(null);
  // Seeded to the default viewport so markers load on first render, before the
  // first onRegionDidChange fires. Replaced by real bounds once the map settles.
  const [region, setRegion] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>({
    minLng: DEFAULT_CENTER[0] - 0.25,
    maxLng: DEFAULT_CENTER[0] + 0.25,
    minLat: DEFAULT_CENTER[1] - 0.15,
    maxLat: DEFAULT_CENTER[1] + 0.15,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const activeCount = useFilterStore(
    (s) => (s.category ? 1 : 0) + (s.subcategory ? 1 : 0) + (s.petFriendly ? 1 : 0) + (s.sort !== 'vegan' ? 1 : 0),
  );
  const cameraRef = useRef<any>(null);
  // True once MapLibre has finished loading its style — imperative camera moves
  // before this are silently dropped, which is why the initial location pan was
  // being lost and the map stayed on the Amsterdam default.
  const [mapReady, setMapReady] = useState(false);
  // The user's location, captured as soon as it resolves. Applied to the camera
  // once the map is ready (the location fetch and the map load race each other).
  const pendingCenter = useRef<[number, number] | null>(null);

  const { places, loading } = useNearbyPlaces(region);

  const centerOn = useCallback((longitude: number, latitude: number, zoom = 12) => {
    cameraRef.current?.easeTo({ center: [longitude, latitude] as [number, number], zoom, duration: 600 });
    setRegion({ minLng: longitude - 0.2, maxLng: longitude + 0.2, minLat: latitude - 0.12, maxLat: latitude + 0.12 });
  }, []);

  // Resolve the user's location when the map first opens. Falls back to the
  // Amsterdam default region if permission is denied or unavailable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const { latitude, longitude } = loc.coords;
        pendingCenter.current = [longitude, latitude];
        // If the map already finished loading, apply immediately; otherwise the
        // onDidFinishLoadingMap handler will pick this up.
        if (mapReady) centerOn(longitude, latitude);
      } catch {
        // keep default region
      }
    })();
    return () => { cancelled = true; };
  }, [mapReady, centerOn]);

  // When the map finishes loading, apply any location captured while it loaded.
  const handleMapLoaded = useCallback(() => {
    setMapReady(true);
    const c = pendingCenter.current;
    if (c) centerOn(c[0], c[1]);
  }, [centerOn]);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Find a city/area by name and recenter the map there; the bounding-box
  // place query then reloads markers for the new region.
  const handleSearchLocation = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    setSearching(true);
    try {
      // Network geocoder (Nominatim) rather than expo-location's geocodeAsync,
      // which returns nothing on most Android devices.
      const results = await geocodePlace(q);
      if (results.length) {
        const { latitude, longitude } = results[0];
        centerOn(longitude, latitude);
        track('map_location_search', { query: q });
      } else {
        Alert.alert('Not found', `Couldn't find "${q}". Try a city or area name.`);
      }
    } catch {
      Alert.alert('Search failed', 'Could not look up that location. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }, [query, centerOn]);

  const handleLocateMe = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    centerOn(longitude, latitude, 13);
  }, [centerOn]);

  // v11: event is NativeSyntheticEvent<ViewStateChangeEvent>
  // bounds = [west, south, east, north]
  const handleMapRegionChange = useCallback((event: any) => {
    const bounds = event?.nativeEvent?.bounds;
    if (!bounds) return;
    setRegion({
      minLng: bounds[0],
      minLat: bounds[1],
      maxLng: bounds[2],
      maxLat: bounds[3],
    });
  }, []);

  // GeoJSON for circle-layer markers
  const geojson = {
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      id: p.id,
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      properties: {
        id: p.id,
        vegan_level: p.vegan_level ?? 'unknown',
        color: VEGAN_COLORS[p.vegan_level as keyof typeof VEGAN_COLORS] ?? VEGAN_COLORS.unknown,
      },
    })),
  };

  // v11: features are only delivered to a Source's own onPress handler, then
  // bubble up to Map's onPress. Selection therefore lives on the GeoJSONSource.
  const handleMarkerPress = useCallback((event: any) => {
    const features = event?.nativeEvent?.features ?? [];
    const placeId = features[0]?.properties?.id;
    if (!placeId) return;
    const place = places.find((p) => p.id === placeId);
    if (place) setSelectedPlace(place);
  }, [places]);

  // Map-level press fires for taps on empty map (no bubbled features) → deselect
  const handleMapPress = useCallback((event: any) => {
    const features = event?.nativeEvent?.features ?? [];
    if (features.length === 0) setSelectedPlace(null);
  }, []);

  if (!MapLibre) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="map-outline" size={64} color={colors.textLight} />
        <Text style={styles.fallbackTitle}>Map requires native build</Text>
        <Text style={styles.fallbackSub}>Run: npx expo run:ios</Text>
      </View>
    );
  }

  const { Map, GeoJSONSource, Layer, Camera, UserLocation } = MapLibre;

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={OPENFREEMAP_STYLE}
        onDidFinishLoadingMap={handleMapLoaded}
        onRegionDidChange={handleMapRegionChange}
        onPress={handleMapPress}
        attribution={false}
        logo={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: DEFAULT_CENTER, zoom: 11 }}
        />
        <UserLocation animated />
        <GeoJSONSource id="places" data={geojson} onPress={handleMarkerPress}>
          <Layer
            id="place-circles"
            type="circle"
            style={{
              circleRadius: ['interpolate', ['linear'], ['zoom'], 6, 7, 11, 11, 16, 17],
              circleColor: ['get', 'color'],
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#ffffff',
              circlePitchAlignment: 'map',
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* Search + filter controls */}
      <View style={[styles.topControls, { top: insets.top + 8 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search a city or area"
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchLocation}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.filterBar}>
          <View style={styles.toggleWrap}><VeganOnlyToggle /></View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)} accessibilityLabel="Filters">
            <Ionicons name="options-outline" size={22} color={colors.text} />
            {activeCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Add a place (suggest) */}
      <TouchableOpacity
        style={[styles.addButton, { bottom: selectedPlace ? 280 : 160 }]}
        onPress={() => router.push('/suggest-place')}
        accessibilityLabel="Suggest a place"
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Locate me button */}
      <TouchableOpacity
        style={[styles.locateButton, { bottom: selectedPlace ? 220 : 100 }]}
        onPress={handleLocateMe}
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
      >
        <Ionicons name="locate" size={22} color={colors.primary} />
      </TouchableOpacity>

      {/* Loading indicator */}
      {loading && (
        <View style={[styles.loader, { top: insets.top + 118 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Place preview bottom sheet */}
      {selectedPlace && (
        <PlaceBottomSheet
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      <FilterModal visible={filterOpen} onClose={() => setFilterOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topControls: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    gap: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: 23,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: typography.base, color: colors.text },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleWrap: { flex: 1 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  locateButton: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addButton: {
    position: 'absolute',
    right: spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  loader: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  fallbackTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  fallbackSub: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
