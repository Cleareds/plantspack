import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data, error } = await sb.from('city_scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(3);
  console.log('city_scores columns:', data ? Object.keys(data[0]) : 'empty');
  console.log('city_scores top 3:', JSON.stringify(data?.map(r => ({ city: r.city, score: r.score, grade: r.grade }))));
  if (error) console.error('error:', error.message);
}

main().catch(console.error);
