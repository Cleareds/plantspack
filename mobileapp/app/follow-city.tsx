import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../src/store/authStore';
import { useFollowedCities } from '../src/hooks/useFollowedCities';
import { reverseGeocodeCity } from '../src/lib/geocode';
import { supabase } from '../src/lib/supabase';
import { track } from '../src/lib/analytics';
import { colors, spacing, radius, typography } from '../src/constants/theme';

export default function FollowCityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { cities, refetch } = useFollowedCities();
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) { router.replace('/auth'); return null; }

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location off', 'Allow location access, or type your city below.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const hit = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude);
      if (hit) { setCity(hit.city); setCountry(hit.country); }
      else Alert.alert('Couldn’t find your city', 'Please type it in below.');
    } catch {
      Alert.alert('Location error', 'Please type your city below.');
    } finally {
      setLocating(false);
    }
  };

  const pin = async () => {
    const c = city.trim(); const co = country.trim();
    if (!c || !co) { Alert.alert('City and country', 'Enter both a city and a country.'); return; }
    if (cities.some((x) => x.city.toLowerCase() === c.toLowerCase() && x.country.toLowerCase() === co.toLowerCase())) {
      Alert.alert('Already pinned', `${c} is already in your list.`); return;
    }
    setSaving(true);
    const { error } = await supabase.from('user_followed_cities').insert({ user_id: user.id, city: c, country: co });
    setSaving(false);
    if (error) { Alert.alert('Could not pin', error.message); return; }
    track('city_followed', { city: c, country: co });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCity(''); setCountry('');
    refetch();
  };

  const unpin = async (id: string) => {
    await supabase.from('user_followed_cities').delete().eq('id', id);
    refetch();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Your cities</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Pin the cities you care about and we&apos;ll notify you when a new vegan spot is added there.
        </Text>

        <TouchableOpacity style={styles.locationBtn} onPress={useMyLocation} disabled={locating}>
          {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="locate" size={18} color={colors.primary} />}
          <Text style={styles.locationText}>Use my current location</Text>
        </TouchableOpacity>

        <View style={styles.rowFields}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="City" placeholderTextColor={colors.textLight} value={city} onChangeText={setCity} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Country" placeholderTextColor={colors.textLight} value={country} onChangeText={setCountry} />
        </View>

        <TouchableOpacity style={[styles.pinBtn, saving && { opacity: 0.6 }]} onPress={pin} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.pinText}>Pin this city</Text>}
        </TouchableOpacity>

        {cities.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Pinned cities</Text>
            {cities.map((c) => (
              <View key={c.id} style={styles.cityRow}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <Text style={styles.cityText} numberOfLines={1}>{c.city}, {c.country}</Text>
                <TouchableOpacity onPress={() => unpin(c.id)} accessibilityLabel={`Unpin ${c.city}`}>
                  <Ionicons name="close-circle" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { fontSize: typography.base, color: colors.textSecondary, lineHeight: 22 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary },
  locationText: { color: colors.primary, fontWeight: '600', fontSize: typography.base },
  rowFields: { flexDirection: 'row', gap: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: typography.base, color: colors.text },
  pinBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  pinText: { color: colors.white, fontWeight: '700', fontSize: typography.md },
  sectionLabel: { fontSize: typography.md, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  cityText: { flex: 1, fontSize: typography.base, color: colors.text },
});
