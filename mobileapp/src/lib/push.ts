import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from './supabase';

// Foreground presentation: show the banner even while the app is open so a push
// arriving in-app isn't silently swallowed. The SERVER sends pushes; the app
// only registers the token and routes taps.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// expo-router href the device push payload points at. The server (web
// src/lib/notifications/push.ts) sends `data: { type, entityType, entityId }`
// for transactional pushes and `{ type, url }` for broadcasts — match those.
function linkFromPushData(data: any): string | null {
  if (!data) return null;
  if (data.entityType === 'place' && data.entityId) return `/place/${data.entityId}`;
  // Broadcasts may carry an explicit link; only follow in-app routes.
  if (typeof data.url === 'string' && data.url.startsWith('/')) return data.url;
  return null;
}

function routeToData(data: any) {
  const href = linkFromPushData(data);
  if (href) router.push(href as any);
}

export type PushPermissionResult = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/**
 * Register this device for push and upsert its token for the user.
 *
 * `prompt` controls the OS permission dialog: iOS only ever shows it ONCE, so
 * we never prompt cold at launch (call with prompt:false / default) — only
 * register if permission is already granted. Prompt explicitly from a user
 * action (e.g. enabling the notifications toggle) with prompt:true.
 *
 * Returns the resulting permission status so the UI can react (e.g. offer to
 * open Settings when denied). Best-effort: no-ops on web/simulator, never throws.
 */
export async function registerForPush(
  userId: string,
  opts: { prompt?: boolean } = {},
): Promise<PushPermissionResult> {
  try {
    if (Platform.OS === 'web') return 'unsupported';

    // Android needs a channel for notifications to display.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      // Don't surface the one-shot OS dialog unless the user asked for it.
      if (!opts.prompt) return existing as PushPermissionResult;
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return status as PushPermissionResult;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    if (!projectId) return 'granted';

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return 'granted';

    await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS as 'ios' | 'android',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
    return 'granted';
  } catch {
    // Simulators throw on getExpoPushTokenAsync; never block app start on push.
    return 'undetermined';
  }
}

// Wire tap handling: a push tapped from background/foreground and one that cold-
// started the app. Returns a cleanup function. Mirrors in-app deep-link routing.
export function addPushResponseListener(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    routeToData(response.notification.request.content.data);
  });

  // Cold start: the app was launched by tapping a push.
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) routeToData(response.notification.request.content.data);
  });

  return () => sub.remove();
}
