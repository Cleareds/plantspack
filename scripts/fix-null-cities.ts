import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function transliterate(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/ß/g, 'ss');
}
function normalizeCity(c: string): string {
  return c.replace(/\s+(City\s+)?Municipality$/i,'').replace(/\s+(District|Kommune|Kommun|Gemeinde|Borough|County|Parish)$/i,'').replace(/^City of /i,'').replace(/^([A-Za-z]{4,})s$/,'$1').trim();
}

async function main() {
  const { data: places } = await sb.from('places').select('id, name, latitude, longitude, country').or('city.is.null,city.eq.').limit(500);
  if (!places?.length) { console.log('No null-city places found'); return; }
  console.log(`Geocoding ${places.length} null-city places...`);

  let fixed = 0;
  for (const p of places) {
    await sleep(1100);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${p.latitude}&lon=${p.longitude}&format=json&zoom=13&addressdetails=1`;
      const r = await fetch(url, { headers: { 'User-Agent': 'PlantsPack/1.0 (plantspack.com)' } });
      if (!r.ok) continue;
      const d = await r.json();
      const addr = d.address || {};
      const raw = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || '';
      const city = normalizeCity(transliterate(raw));
      if (city) {
        await sb.from('places').update({ city }).eq('id', p.id);
        console.log(`  ✅ ${p.name} (${p.country}) → ${city}`);
        fixed++;
      }
    } catch (e) { console.error(`  ❌ ${p.name}:`, (e as Error).message); }
  }
  console.log(`\nFixed ${fixed}/${places.length}`);
}
main().catch(console.error);
