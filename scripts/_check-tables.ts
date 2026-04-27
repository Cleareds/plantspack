import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

  // Count places per country from OSM source
  const allCountries: Record<string,number> = {};
  let offset = 0;
  while (true) {
    const { data } = await sb.from('places').select('country, source').range(offset, offset + 999);
    if (!data?.length) break;
    for (const p of data) {
      if (p.source?.includes('osm') || p.source === 'openstreetmap') {
        allCountries[p.country] = (allCountries[p.country] || 0) + 1;
      }
    }
    offset += 1000;
    if (data.length < 1000) break;
  }

  const sorted = Object.entries(allCountries).sort((a, b) => b[1] - a[1]);
  console.log(`Countries with OSM places (${sorted.length} total):`);
  sorted.forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  console.log(`\nTotal OSM places: ${sorted.reduce((s, [,n]) => s + n, 0)}`);
}
main().catch(console.error);
