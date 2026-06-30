import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/authStore';
import { useFilterStore } from '../src/store/filterStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { registerForPush, addPushResponseListener } from '../src/lib/push';
import { UpdateGate } from '../src/components/UpdateGate';
import { initAnalytics, track, identify, resetIdentity } from '../src/lib/analytics';
import { fetchPreferences } from '../src/lib/preferences';
import { ONBOARDING_KEY } from './onboarding';

// Pull saved account preferences and apply the ones that drive the UI
// (default vegan level -> map toggle, distance unit).
function applySavedPreferences() {
  fetchPreferences().then((p) => {
    if (p) useFilterStore.getState().applyPreferences({ default_vegan_level: p.default_vegan_level, distance_unit: p.distance_unit });
  }).catch(() => {});
}

// Adopt the signed-in user's saved "100% vegan only" preference (synced via
// user_metadata) so it follows them across devices.
function adoptPref(session: any) {
  const v = session?.user?.user_metadata?.vegan_only;
  if (typeof v === 'boolean') useFilterStore.getState().adoptVeganOnly(v);
}

// Bring notifications online for a signed-in user: register this device for
// push, prime the tab-bar unread badge, and open the realtime channel so the
// badge stays live. Idempotent — safe to call on every sign-in.
function startNotifications(userId: string) {
  registerForPush(userId);
  const store = useNotificationStore.getState();
  store.refreshUnread(userId);
  store.subscribe(userId);
}

// Route content deep links to the in-app article:
//   plantspack://learn/<slug>, plantspack://vegan/<slug>
//   https://plantspack.com/vegan/<slug>   (once universal links are verified)
// Returns true if it handled the URL.
function handleContentDeepLink(url: string): boolean {
  const m = url.match(/\/(?:vegan|learn)\/([a-z0-9-]+)/i);
  if (!m) return false;
  const slug = m[1];
  // Ignore the listing roots (/vegan, /vegan-places) — only article slugs route.
  if (!slug || slug === 'places') return false;
  router.push({ pathname: '/learn/[slug]', params: { slug } });
  return true;
}

// Complete a magic-link / OAuth redirect (tokens arrive in the URL fragment).
async function handleAuthDeepLink(url: string) {
  const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
  if (!fragment) return;
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
}

export default function RootLayout() {
  const { setSession } = useAuthStore();

  // First-launch onboarding gate + load saved filters + analytics.
  useEffect(() => {
    useFilterStore.getState().hydrate();
    initAnalytics().then(() => track('app_open', { cold_start: true }));
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => {
      if (!seen) router.replace('/onboarding');
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      adoptPref(session);
      if (session?.user) { identify(session.user.id); applySavedPreferences(); startNotifications(session.user.id); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      adoptPref(session);
      if (event === 'SIGNED_IN' && session?.user) { identify(session.user.id); applySavedPreferences(); startNotifications(session.user.id); }
      if (event === 'SIGNED_OUT') { resetIdentity(); useNotificationStore.getState().unsubscribe(); }
    });

    // Supabase only refreshes tokens while the app is foregrounded; gate the
    // internal timer on AppState per the official Expo guide.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { supabase.auth.startAutoRefresh(); track('app_open', { cold_start: false }); }
      else supabase.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();

    // Deep links — auth callbacks (magic link, OAuth) + content (/vegan, /learn).
    const route = (url: string) => { if (!handleContentDeepLink(url)) handleAuthDeepLink(url); };
    Linking.getInitialURL().then((url) => { if (url) route(url); });
    const linkSub = Linking.addEventListener('url', ({ url }) => route(url));

    // Tapped push -> same deep-link routing as the in-app list (incl. cold start).
    const removePushListener = addPushResponseListener();

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
      linkSub.remove();
      removePushListener();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="saved" options={{ headerShown: false }} />
        <Stack.Screen name="follow-city" options={{ headerShown: false }} />
        <Stack.Screen name="suggest-place" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="profile/preferences" options={{ headerShown: false }} />
        <Stack.Screen name="profile/contributions" options={{ headerShown: false }} />
        <Stack.Screen name="profile/account" options={{ headerShown: false }} />
        <Stack.Screen name="place/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="learn/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="browse/country" options={{ headerShown: false }} />
        <Stack.Screen name="browse/city" options={{ headerShown: false }} />
        <Stack.Screen name="tools/drinks" options={{ headerShown: false }} />
        <Stack.Screen name="tools/barcode" options={{ headerShown: false }} />
        <Stack.Screen name="tools/ingredient-scanner" options={{ headerShown: false }} />
        <Stack.Screen name="tools/menu-scanner" options={{ headerShown: false }} />
        <Stack.Screen name="tools/cards" options={{ headerShown: false }} />
        <Stack.Screen name="tools/ecodes" options={{ headerShown: false }} />
        <Stack.Screen name="tools/impact" options={{ headerShown: false }} />
        <Stack.Screen name="tools/substitutes" options={{ headerShown: false }} />
      </Stack>
      <UpdateGate />
    </GestureHandlerRootView>
  );
}
