import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const { count: withDesc } = await sb.from('places').select('*', { count: 'exact', head: true })
    .eq('vegan_level', 'vegan_friendly').is('archived_at', null).not('description', 'is', null);
  const { count: noDesc } = await sb.from('places').select('*', { count: 'exact', head: true })
    .eq('vegan_level', 'vegan_friendly').is('archived_at', null).is('description', null);
  console.log(`vegan_friendly with description: ${withDesc}`);
  console.log(`vegan_friendly without description: ${noDesc}`);
  console.log(`Total vegan_friendly: ${(withDesc||0) + (noDesc||0)}`);
}
main().catch(console.error);
