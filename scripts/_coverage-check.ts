import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const regions: Record<string, string[]> = {
    'East Asia':    ['Japan','South Korea','China','Taiwan','Hong Kong'],
    'SE Asia':      ['Thailand','Vietnam','Indonesia','Philippines','Malaysia','Singapore','Cambodia','Myanmar'],
    'South Asia':   ['India','Sri Lanka','Nepal','Bangladesh'],
    'Africa':       ['South Africa','Nigeria','Kenya','Morocco','Egypt','Tanzania','Ghana','Ethiopia','Rwanda'],
    'Latin America':['Brazil','Mexico','Argentina','Colombia','Chile','Peru','Costa Rica','Uruguay','Bolivia','Ecuador'],
    'Oceania':      ['Australia','New Zealand'],
    'Middle East':  ['Israel','UAE','Lebanon','Jordan','Turkey'],
  };
  for (const [region, countries] of Object.entries(regions)) {
    console.log(`\n${region}:`);
    for (const c of countries) {
      const { count } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', c).is('archived_at', null);
      const { count: fv } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', c).eq('vegan_level', 'fully_vegan').is('archived_at', null);
      console.log(`  ${c.padEnd(20)} ${String(count || 0).padStart(5)} places  (${fv || 0} fully vegan)`);
    }
  }
}
main().catch(console.error);
