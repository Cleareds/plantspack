import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const { data } = await sb.from('places').select('id, name, city, country, vegan_level, description').eq('vegan_level', 'vegan_options').is('archived_at', null);
  console.log(JSON.stringify(data, null, 2));
  console.log(`Total: ${data?.length}`);
}
main().catch(console.error);
