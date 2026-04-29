import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const { data } = await sb.rpc('refresh_directory_views');
  console.log('refresh result:', data);
  // Check if city_scores still has data
  const { data: cs } = await sb.from('city_scores').select('city, score, fv_count').order('fv_count', { ascending: false }).limit(3);
  console.log('city_scores fv_count sample:', JSON.stringify(cs));
}
main().catch(console.error);
