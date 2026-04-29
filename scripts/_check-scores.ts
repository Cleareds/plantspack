import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Check city_scores view
  const { data, error } = await sb.from('city_scores')
    .select('city, country, score, grade, fully_vegan_count')
    .order('score', { ascending: false })
    .limit(5);
  console.log('city_scores top 5:', JSON.stringify(data));
  if (error) console.error('city_scores error:', error.message);
}

main().catch(console.error);
