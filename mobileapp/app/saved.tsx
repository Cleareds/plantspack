import { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useSavedPlaces } from '../src/hooks/useSavedPlaces';
import { PlaceCard } from '../src/components/places/PlaceCard';
import { colors, spacing, typography } from '../src/constants/theme';

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { places, loading, refetch } = useSavedPlaces();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved places</Text>
      </View>

      {!user ? (
        <View style={styles.authState}>
          <Ionicons name="heart-outline" size={64} color={colors.textLight} />
          <Text style={styles.authTitle}>Save your favourites</Text>
          <Text style={styles.authText}>Sign in to bookmark vegan places and access them anywhere.</Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth')}>
            <Text style={styles.signInText}>Sign up - it&apos;s free</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {loading && places.length === 0 && <ActivityIndicator style={styles.loader} color={colors.primary} />}
          {!loading && places.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={56} color={colors.textLight} />
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyText}>Tap ♥ on any place to save it here</Text>
              <TouchableOpacity style={styles.browseButton} onPress={() => router.replace('/')}>
                <Text style={styles.browseText}>Browse the map</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={places}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PlaceCard place={item} />}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40, paddingTop: spacing.sm },
  loader: { marginTop: spacing.xl },
  authState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  authTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.text },
  authText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  signInButton: { marginTop: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12 },
  signInText: { color: colors.white, fontWeight: '600', fontSize: typography.base },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: typography.base, color: colors.textSecondary, textAlign: 'center' },
  browseButton: { marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary },
  browseText: { color: colors.primary, fontWeight: '600', fontSize: typography.base },
});
