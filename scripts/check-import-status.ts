import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});
async function main() {
  const { count: total } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%');
  const { count: hasImg } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').neq('images', '{}');
  const { count: hasDesc } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').not('description', 'is', null);
  const { count: hasCity } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').not('city', 'is', null);
  const { count: hasWebsite } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').not('website', 'is', null).neq('website', '');
  const { count: fullyVegan } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').eq('vegan_level', 'fully_vegan');
  const { count: vegFriendly } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').eq('vegan_level', 'vegan_friendly');
  // By country top 10
  const { data: byCo } = await sb.from('places').select('country').like('source', 'osm-import%');
  const byCountry: Record<string,number> = {};
  for (const r of (byCo||[])) byCountry[r.country] = (byCountry[r.country]||0)+1;
  const top = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,10);

  console.log('\n=== OSM-import places status ===');
  console.log(`Total imported:      ${total}`);
  console.log(`Has city:            ${hasCity} (${Math.round(hasCity!/total!*100)}%)`);
  console.log(`Has website:         ${hasWebsite} (${Math.round(hasWebsite!/total!*100)}%)`);
  console.log(`Has image:           ${hasImg} (${Math.round(hasImg!/total!*100)}%)`);
  console.log(`Has description:     ${hasDesc} (${Math.round(hasDesc!/total!*100)}%)`);
  console.log(`fully_vegan:         ${fullyVegan} (${Math.round(fullyVegan!/total!*100)}%)`);
  console.log(`vegan_friendly:      ${vegFriendly} (${Math.round(vegFriendly!/total!*100)}%)`);
  console.log('\nTop 10 countries:');
  top.forEach(([c,n]) => console.log(`  ${c}: ${n}`));
}
main().catch(console.error);
