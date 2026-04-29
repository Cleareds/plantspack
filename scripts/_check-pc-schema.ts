import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  // Check columns without join
  const { data, error } = await sb.from('place_corrections').select('*').eq('status', 'pending').limit(5);
  console.log('Error:', error?.message || 'none');
  console.log('Columns:', data?.[0] ? Object.keys(data[0]) : 'no data');
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
