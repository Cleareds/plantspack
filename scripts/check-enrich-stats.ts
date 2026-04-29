import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});
async function main() {
  const { count: total } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%');
  const { count: withWebNoImg } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').not('website', 'is', null).neq('website', '').eq('images', '{}');
  const { count: noDesc } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').is('description', null);
  const { count: noCity } = await sb.from('places').select('*', {count: 'exact', head: true}).like('source', 'osm-import%').is('city', null);
  console.log('OSM-import total:', total);
  console.log('With website, no image:', withWebNoImg);
  console.log('No description:', noDesc);
  console.log('No city:', noCity);
}
main().catch(console.error);
