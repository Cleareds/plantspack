import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lightweight analytics: PostHog via its HTTP capture API, no native SDK — so
// it ships over OTA with no rebuild. No-ops entirely until EXPO_PUBLIC_POSTHOG_KEY
// is set, so it's safe to ship now and drop the key in later.
//
// Returning visitors / retention come for free from PostHog's distinct_id:
// a persistent device id for guests, aliased to the user id once they sign in.

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const DEVICE_ID_KEY = 'pp_device_id';
// Real installed version from app.json, so analytics attribute to the right
// release instead of a stale hardcoded string.
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

let deviceId: string | null = null;
let distinctId: string | null = null;
let ready = false;
const queue: Array<() => void> = [];

function uuid(): string {
  // RFC4122-ish v4; device runtime, not a workflow script.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function send(event: string, properties: Record<string, any>, idOverride?: string) {
  if (!KEY) return;
  const id = idOverride ?? distinctId ?? deviceId;
  if (!id) return;
  // Fire-and-forget; never block UI or surface errors.
  fetch(`${HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: KEY,
      event,
      distinct_id: id,
      properties: { $lib: 'plantspack-mobile', platform: Platform.OS, app_version: APP_VERSION, ...properties },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}

// Load (or create) the persistent device id, then flush any early events.
export async function initAnalytics() {
  if (ready) return;
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) { id = uuid(); await AsyncStorage.setItem(DEVICE_ID_KEY, id); }
    deviceId = id;
  } catch {
    deviceId = deviceId ?? uuid();
  }
  ready = true;
  queue.splice(0).forEach((fn) => fn());
}

// Stable per-install device id (shared with the AI-scan guest quota). Ensures
// it exists even if initAnalytics hasn't run yet.
export async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) { id = uuid(); await AsyncStorage.setItem(DEVICE_ID_KEY, id); }
    deviceId = id;
    return id;
  } catch {
    return (deviceId = deviceId ?? uuid());
  }
}

export function track(event: string, properties: Record<string, any> = {}) {
  if (!ready) { queue.push(() => send(event, properties)); return; }
  send(event, properties);
}

// Link the anonymous device to a signed-in user so returning members are tracked.
export function identify(userId: string, traits: Record<string, any> = {}) {
  const run = () => {
    send('$identify', { $anon_distinct_id: deviceId, $set: traits }, userId);
    distinctId = userId;
  };
  if (!ready) { queue.push(run); return; }
  run();
}

// On sign-out, revert to the anonymous device id.
export function resetIdentity() {
  distinctId = null;
}
