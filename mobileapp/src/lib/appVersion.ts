import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Running app version, from app.json (expo-constants). Falls back to 1.0.0.
export const RUNNING_VERSION: string =
  Constants.expoConfig?.version ?? '1.0.0';

// Compare dotted numeric versions. Returns -1 if a<b, 0 if equal, 1 if a>b.
// Missing segments are treated as 0 ("1.2" === "1.2.0").
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

export type UpdateStatus = 'ok' | 'soft' | 'forced';

export interface VersionGate {
  status: UpdateStatus;
  message: string | null;
  storeUrl: string | null;
}

interface ReleaseRow {
  latest_version: string;
  min_supported_version: string;
  store_url: string | null;
  message: string | null;
}

// Default store fallbacks if admin hasn't set an explicit URL yet.
const STORE_FALLBACK: Record<string, string> = {
  ios: 'https://apps.apple.com/app/plantspack',
  android: 'https://play.google.com/store/apps/details?id=com.plantspack.app',
};

/**
 * Reads app_release_config for this platform once on mount and decides whether
 * to prompt an update. Below min_supported_version -> 'forced' (blocking);
 * below latest_version -> 'soft' (dismissible). Fails open ('ok') on any error
 * so a config hiccup never bricks the app.
 */
export function useVersionGate(): VersionGate {
  const [gate, setGate] = useState<VersionGate>({ status: 'ok', message: null, storeUrl: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const platform = Platform.OS; // 'ios' | 'android' | 'web'
        if (platform !== 'ios' && platform !== 'android') return;
        const { data } = await supabase
          .from('app_release_config')
          .select('latest_version, min_supported_version, store_url, message')
          .eq('platform', platform)
          .maybeSingle();
        if (!data || cancelled) return;
        const row = data as ReleaseRow;
        const storeUrl = row.store_url || STORE_FALLBACK[platform];

        if (compareVersions(RUNNING_VERSION, row.min_supported_version) < 0) {
          setGate({ status: 'forced', message: row.message, storeUrl });
        } else if (compareVersions(RUNNING_VERSION, row.latest_version) < 0) {
          setGate({ status: 'soft', message: row.message, storeUrl });
        }
      } catch {
        // fail open — leave status 'ok'
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return gate;
}
