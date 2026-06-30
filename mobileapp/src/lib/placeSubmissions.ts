import { supabase } from './supabase';

export interface PlaceSubmissionInput {
  name: string;
  category: string;
  vegan_level: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string;
  notes?: string;
  images?: string[];
}

// Insert a user-suggested place into the moderation queue. RLS enforces
// user_id = auth.uid(), so the caller must be signed in. Submissions land as
// status='pending' and are reviewed by admins on the website before going live.
export async function submitPlace(input: PlaceSubmissionInput): Promise<{ error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { error: 'You need to be signed in to suggest a place.' };

  const trim = (v?: string) => {
    const t = (v ?? '').trim();
    return t.length ? t : null;
  };

  const { error } = await supabase.from('place_submissions').insert({
    user_id: userId,
    name: input.name.trim(),
    category: input.category,
    vegan_level: input.vegan_level,
    address: trim(input.address),
    city: trim(input.city),
    country: trim(input.country),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    website: trim(input.website),
    notes: trim(input.notes),
    images: input.images && input.images.length ? input.images : null,
    source: 'mobile-suggest',
  });

  return { error: error?.message ?? null };
}
