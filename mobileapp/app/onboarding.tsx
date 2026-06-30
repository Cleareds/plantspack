import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { AUTH_GATE_KEY } from './auth';
import { colors, spacing, radius, typography } from '../src/constants/theme';

export const ONBOARDING_KEY = 'pp_onboarding_v1';

type Slide = { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; body: string };

const SLIDES: Slide[] = [
  { icon: 'leaf', tint: '#16a34a', title: 'Welcome to PlantsPack', body: '54,000+ vegan and vegan-friendly places across 150+ countries, all on one map.' },
  { icon: 'map', tint: '#0891b2', title: 'Find your spot', body: 'Browse the map or search by city, cuisine or name. Clear labels show how vegan each place really is.' },
  { icon: 'scan', tint: '#7c3aed', title: 'Tools for real life', body: 'Scan a menu, barcode or label with AI, check drinks and E-numbers, and carry vegan cards in 30 languages.' },
  { icon: 'book', tint: '#d97706', title: 'Learn the answers', body: 'Is it vegan? Honey, wine, E-numbers, plus travel guides and the nutrition consensus - sourced, not opinion.' },
  { icon: 'notifications', tint: '#0a6a1d', title: 'Never miss a new spot', body: 'Pin your city and we’ll let you know the moment a new vegan place is added near you.' },
  { icon: 'heart', tint: '#16a34a', title: 'Make it yours', body: 'Save places, suggest spots we’re missing, add photos and write reviews. A free account syncs it all across your devices.' },
];

const { width } = Dimensions.get('window');

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    // Land in the app, then surface the one-time sign-in gate over it (guest is
    // one tap away). Skip it if already signed in or already shown once.
    const signedIn = !!useAuthStore.getState().session;
    const gateSeen = await AsyncStorage.getItem(AUTH_GATE_KEY);
    router.replace('/(tabs)');
    if (!signedIn && !gateSeen) {
      setTimeout(() => router.push('/auth?welcome=1'), 60);
    }
  };

  const next = () => {
    if (isLast) return finish();
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TouchableOpacity style={styles.skip} onPress={finish} accessibilityRole="button">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.pager}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: s.tint + '18' }]}>
              <Ionicons name={s.icon} size={64} color={s.tint} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={next} accessibilityRole="button">
          <Text style={styles.buttonText}>{isLast ? 'Get started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skip: { alignSelf: 'flex-end', padding: spacing.md },
  skipText: { color: colors.textSecondary, fontSize: typography.base },
  pager: { flex: 1 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  iconCircle: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: typography.xxl, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: typography.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 25 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  button: { height: 54, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: typography.md },
});
