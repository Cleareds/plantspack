import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  // Replicate exactly what the API does
  const { data, count, error } = await sb
    .from('place_corrections')
    .select('id, place_id, corrections, note, status, created_at, places(id, name, slug, city, country), users(id, username)', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(0, 29);
  console.log(`Error: ${error?.message || 'none'}`);
  console.log(`Count: ${count}`);
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
