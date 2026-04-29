import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Check directory_cities
  const { data: dcSample, error: dcErr } = await sb.from('directory_cities')
    .select('city, country, place_count, fully_vegan_count')
    .order('place_count', { ascending: false })
    .limit(5);
  console.log('directory_cities top 5:', JSON.stringify(dcSample));
  if (dcErr) console.error('directory_cities error:', dcErr.message);

  // Check Berlin places with vegan_level
  const { data: berlinFv } = await sb.from('places')
    .select('id, name, vegan_level')
    .ilike('city', 'Berlin')
    .eq('vegan_level', 'fully_vegan')
    .is('archived_at', null)
    .limit(3);
  console.log('Berlin fully_vegan sample:', JSON.stringify(berlinFv));
  
  // Check if archived_at filter is on places query in the API
  const { data: berlinAll } = await sb.from('places')
    .select('id, vegan_level')
    .ilike('city', 'Berlin')
    .ilike('country', 'Germany')
    .limit(5);
  console.log('Berlin places (no archived filter) vegan_levels:', berlinAll?.map(p => p.vegan_level));
}

main().catch(console.error);
