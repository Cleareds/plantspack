import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  // Check corrections table
  const { data: corrections, count: cCount } = await sb.from('place_corrections').select('id, place_id, corrections, note, status, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(10);
  console.log(`\nplace_corrections (all statuses): ${cCount}`);
  corrections?.forEach(c => console.log(`  [${c.status}] ${JSON.stringify(c.corrections).slice(0,100)} ${c.created_at}`));
  
  // Check places with report tags
  const tagTypes = ['community_report:permanently_closed','community_report:hours_wrong','community_report:not_fully_vegan','community_report:not_vegan_friendly','community_report:non_vegan_chain','community_report:vegan_friendly_chain','community_report:few_vegan_options'];
  console.log('\nReport tags on places:');
  for (const tag of tagTypes) {
    const { count } = await sb.from('places').select('*', { count: 'exact', head: true }).contains('tags', [tag]);
    if (count) console.log(`  ${tag}: ${count}`);
  }
}
main().catch(console.error);
