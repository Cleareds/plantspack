import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Global place filters, shared across Map / Search / Browse.
//
// `veganOnly` (the "100% Vegan only" toggle) is the headline preference: it
// persists locally for everyone (AsyncStorage) AND syncs to the signed-in
// user's account (Supabase user_metadata.vegan_only) so it follows them across
// devices. Secondary filters persist locally only.

const KEY = 'pp_filters_v1';

export type SortMode = 'vegan' | 'rating' | 'name';

export type DistanceUnit = 'km' | 'mi';

interface FilterState {
  veganOnly: boolean;
  category: string | null;
  subcategory: string | null;
  petFriendly: boolean;
  sort: SortMode;
  distanceUnit: DistanceUnit;

  setVeganOnly: (v: boolean) => void;
  /** Adopt a value without writing back to the account (used on sign-in). */
  adoptVeganOnly: (v: boolean) => void;
  setCategory: (c: string | null) => void;
  setSubcategory: (s: string | null) => void;
  setPetFriendly: (b: boolean) => void;
  setSort: (s: SortMode) => void;
  setDistanceUnit: (u: DistanceUnit) => void;
  /** Apply saved account preferences (default vegan level, distance unit) on boot/save. */
  applyPreferences: (p: { default_vegan_level?: string | null; distance_unit?: DistanceUnit }) => void;
  reset: () => void;
  hydrate: () => Promise<void>;
  activeCount: () => number;
}

function persist(s: Pick<FilterState, 'veganOnly' | 'category' | 'subcategory' | 'petFriendly' | 'sort' | 'distanceUnit'>) {
  AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}

export const useFilterStore = create<FilterState>((set, get) => ({
  veganOnly: false,
  category: null,
  subcategory: null,
  petFriendly: false,
  sort: 'vegan',
  distanceUnit: 'km',

  setVeganOnly: (v) => {
    set({ veganOnly: v });
    persist({ ...snapshot(get), veganOnly: v });
    // Mirror to the account so it follows the user across devices.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.auth.updateUser({ data: { vegan_only: v } }).catch(() => {});
    });
  },
  adoptVeganOnly: (v) => {
    if (get().veganOnly === v) return;
    set({ veganOnly: v });
    persist({ ...snapshot(get), veganOnly: v });
  },
  setCategory: (c) => {
    // Changing category clears a now-irrelevant subcategory.
    set({ category: c, subcategory: null });
    persist({ ...snapshot(get), category: c, subcategory: null });
  },
  setSubcategory: (s) => { set({ subcategory: s }); persist({ ...snapshot(get), subcategory: s }); },
  setPetFriendly: (b) => { set({ petFriendly: b }); persist({ ...snapshot(get), petFriendly: b }); },
  setSort: (s) => { set({ sort: s }); persist({ ...snapshot(get), sort: s }); },
  setDistanceUnit: (u) => { set({ distanceUnit: u }); persist({ ...snapshot(get), distanceUnit: u }); },
  applyPreferences: (p) => {
    const next: Partial<FilterState> = {};
    // Binary "100% vegan only" toggle maps from the default vegan level.
    if (p.default_vegan_level) next.veganOnly = p.default_vegan_level === 'fully_vegan';
    if (p.distance_unit) next.distanceUnit = p.distance_unit;
    if (Object.keys(next).length) { set(next); persist({ ...snapshot(get), ...next }); }
  },
  reset: () => {
    const next = { category: null, subcategory: null, petFriendly: false, sort: 'vegan' as SortMode };
    set(next);
    persist({ ...snapshot(get), ...next });
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) set(JSON.parse(raw));
    } catch {
      // ignore corrupt cache
    }
  },

  activeCount: () => {
    const s = get();
    return [s.category, s.subcategory, s.petFriendly || null, s.sort !== 'vegan' ? s.sort : null]
      .filter(Boolean).length;
  },
}));

function snapshot(get: () => FilterState) {
  const s = get();
  return { veganOnly: s.veganOnly, category: s.category, subcategory: s.subcategory, petFriendly: s.petFriendly, sort: s.sort, distanceUnit: s.distanceUnit };
}
