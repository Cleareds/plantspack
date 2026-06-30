import { supabase } from './supabase';

// User preferences live in the shared `user_preferences` table (same as web).
// A trigger creates the row on signup, so we update; upsert covers edge cases.

export const ALLERGEN_OPTIONS = [
  'gluten', 'soy', 'nuts', 'peanuts', 'sesame', 'mustard',
  'celery', 'lupin', 'sulphites', 'corn', 'nightshades', 'coconut',
] as const;

export type VeganLevelPref = 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options' | null;

export interface UserPreferences {
  default_vegan_level: VeganLevelPref;
  allergens: string[];
  distance_unit: 'km' | 'mi';
  theme: 'system' | 'light' | 'dark';
  push_notifications: boolean;
  email_notifications: boolean;
  // Opt-in for promotional/announcement OS push. Defaults OFF — explicit
  // consent is required before sending marketing push (App Store 4.5.4).
  push_announcements: boolean;
}

const DEFAULTS: UserPreferences = {
  default_vegan_level: null,
  allergens: [],
  distance_unit: 'km',
  theme: 'system',
  push_notifications: true,
  email_notifications: true,
  push_announcements: false,
};

export async function fetchPreferences(): Promise<UserPreferences | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('user_preferences')
    .select('default_vegan_level, allergens, distance_unit, theme, push_notifications, email_notifications, push_announcements')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  return { ...DEFAULTS, ...(data ?? {}), allergens: data?.allergens ?? [] };
}

export async function savePreferences(patch: Partial<UserPreferences>): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: 'Not signed in' };
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: auth.user.id, ...patch }, { onConflict: 'user_id' });
  return { error: error?.message ?? null };
}
