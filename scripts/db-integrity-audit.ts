/**
 * Database Integrity Audit & Cleanup
 * Fixes: wrong countries (coordinate-based), duplicates, missing cities, non-Latin names
 * Usage: npx tsx scripts/db-integrity-audit.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// Country bounding boxes [minLat, maxLat, minLon, maxLon]
const COUNTRY_BOUNDS: Record<string, [number, number, number, number]> = {
  'Canada': [41.7, 83.1, -141.0, -52.6],
  'United States': [24.5, 49.4, -125.0, -66.9],
  'United Kingdom': [49.9, 60.8, -8.6, 1.8],
  'Ireland': [51.4, 55.4, -10.5, -5.9],
  'Germany': [47.3, 55.1, 5.9, 15.0],
  'Austria': [46.4, 49.0, 9.5, 17.2],
  'Switzerland': [45.8, 47.8, 5.9, 10.5],
  'France': [41.3, 51.1, -5.1, 9.6],
  'Belgium': [49.5, 51.5, 2.5, 6.4],
  'Netherlands': [50.8, 53.5, 3.4, 7.2],
  'Italy': [36.6, 47.1, 6.6, 18.5],
  'Spain': [27.6, 43.8, -18.2, 4.3],
  'Portugal': [32.6, 42.2, -31.3, -6.2],
  'Greece': [34.8, 41.7, 19.4, 29.6],
  'Poland': [49.0, 54.8, 14.1, 24.1],
  'Czech Republic': [48.6, 51.1, 12.1, 18.9],
  'Sweden': [55.3, 69.1, 11.1, 24.2],
  'Norway': [57.9, 71.2, 4.6, 31.1],
  'Denmark': [54.6, 57.8, 8.1, 15.2],
  'Finland': [59.8, 70.1, 20.6, 31.6],
  'Japan': [24.4, 45.5, 122.9, 153.9],
  'Australia': [-43.6, -10.7, 113.2, 153.6],
  'New Zealand': [-47.3, -34.4, 166.4, 178.5],
  'Brazil': [-33.8, 5.3, -73.9, -34.8],
  'Mexico': [14.5, 32.7, -118.5, -86.7],
  'India': [8.1, 35.5, 68.2, 97.4],
  'China': [18.2, 53.6, 73.7, 135.1],
  'South Korea': [33.1, 38.6, 124.6, 131.9],
  'Taiwan': [21.9, 25.3, 120.0, 122.0],
  'Thailand': [5.6, 20.5, 97.3, 105.6],
  'Vietnam': [8.6, 23.4, 102.1, 109.5],
  'Indonesia': [-11.0, 6.1, 95.0, 141.0],
  'Israel': [29.5, 33.3, 34.3, 35.9],
  'Turkey': [36.0, 42.1, 25.7, 44.8],
  'Russia': [41.2, 81.9, 19.6, 180.0],
  'South Africa': [-34.8, -22.1, 16.5, 32.9],
};

// Known border city corrections: city + lat/lon range → correct country
const BORDER_FIXES: { city: string; latRange: [number, number]; lonRange: [number, number]; correctCountry: string }[] = [
  { city: 'Ottawa', latRange: [45, 46], lonRange: [-76, -75], correctCountry: 'Canada' },
  { city: 'Montreal', latRange: [45, 46], lonRange: [-74, -73], correctCountry: 'Canada' },
  { city: 'Vancouver', latRange: [49, 50], lonRange: [-124, -122], correctCountry: 'Canada' },
  { city: 'Toronto', latRange: [43, 44], lonRange: [-80, -79], correctCountry: 'Canada' },
  { city: 'Calgary', latRange: [50, 52], lonRange: [-115, -113], correctCountry: 'Canada' },
  { city: 'Edmonton', latRange: [53, 54], lonRange: [-114, -113], correctCountry: 'Canada' },
  { city: 'Winnipeg', latRange: [49, 50], lonRange: [-98, -96], correctCountry: 'Canada' },
  { city: 'Quebec', latRange: [46, 47], lonRange: [-72, -71], correctCountry: 'Canada' },
  { city: 'Halifax', latRange: [44, 45], lonRange: [-64, -63], correctCountry: 'Canada' },
  { city: 'Victoria', latRange: [48, 49], lonRange: [-124, -123], correctCountry: 'Canada' },
  { city: 'London', latRange: [51, 52], lonRange: [-1, 1], correctCountry: 'United Kingdom' },
  { city: 'Dublin', latRange: [53, 54], lonRange: [-7, -6], correctCountry: 'Ireland' },
  { city: 'Birmingham', latRange: [52, 53], lonRange: [-2, -1], correctCountry: 'United Kingdom' },
  { city: 'Manchester', latRange: [53, 54], lonRange: [-3, -2], correctCountry: 'United Kingdom' },
  { city: 'Vienna', latRange: [48, 49], lonRange: [16, 17], correctCountry: 'Austria' },
  { city: 'Athens', latRange: [37, 38], lonRange: [23, 24], correctCountry: 'Greece' },
  { city: 'Strasbourg', latRange: [48, 49], lonRange: [7, 8], correctCountry: 'France' },
];

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=5&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'PlantsPack/1.0' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.address?.country || null;
  } catch { return null; }
}

function isInBounds(lat: number, lon: number, bounds: [number, number, number, number]): boolean {
  return lat >= bounds[0] && lat <= bounds[1] && lon >= bounds[2] && lon <= bounds[3];
}

async function main() {
  console.log('=== DATABASE INTEGRITY AUDIT ===\n');

  // Load all places
  let all: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('places').select('id, name, city, country, latitude, longitude, vegan_level, source, slug').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`Total places: ${all.length}\n`);

  // === STEP 1: Fix known border city misassignments ===
  console.log('--- STEP 1: Border city fixes ---');
  let borderFixes = 0;
  for (const rule of BORDER_FIXES) {
    const misassigned = all.filter(p =>
      p.city === rule.city &&
      p.country !== rule.correctCountry &&
      p.latitude >= rule.latRange[0] && p.latitude <= rule.latRange[1] &&
      p.longitude >= rule.lonRange[0] && p.longitude <= rule.lonRange[1]
    );
    if (misassigned.length > 0) {
      const ids = misassigned.map(p => p.id);
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        await sb.from('places').update({ country: rule.correctCountry }).in('id', batch);
      }
      console.log(`  ${rule.city}: ${misassigned.length} places → ${rule.correctCountry} (was ${misassigned[0].country})`);
      borderFixes += misassigned.length;
      // Update local data
      misassigned.forEach(p => { p.country = rule.correctCountry; });
    }
  }
  console.log(`  Fixed: ${borderFixes} places\n`);

  // === STEP 2: Bounding box validation for all places ===
  console.log('--- STEP 2: Bounding box validation ---');
  const outOfBounds: any[] = [];
  for (const p of all) {
    if (!p.country || !COUNTRY_BOUNDS[p.country]) continue;
    if (!isInBounds(p.latitude, p.longitude, COUNTRY_BOUNDS[p.country])) {
      outOfBounds.push(p);
    }
  }
  console.log(`  Places outside their country bounds: ${outOfBounds.length}`);

  // Reverse geocode the out-of-bounds places (max 50 to avoid rate limits)
  const toGeocode = outOfBounds.slice(0, 50);
  let geoFixes = 0;
  for (const p of toGeocode) {
    const correctCountry = await reverseGeocode(p.latitude, p.longitude);
    if (correctCountry && correctCountry !== p.country) {
      await sb.from('places').update({ country: correctCountry }).eq('id', p.id);
      console.log(`  ${p.name} (${p.city}): ${p.country} → ${correctCountry}`);
      p.country = correctCountry;
      geoFixes++;
    }
    await new Promise(r => setTimeout(r, 1100)); // Rate limit
  }
  console.log(`  Geocode-fixed: ${geoFixes}\n`);

  // === STEP 3: Fix non-Latin city ===
  console.log('--- STEP 3: Non-Latin city names ---');
  const nonLatinFixes: [string, string][] = [['제주시', 'Jeju']];
  for (const [from, to] of nonLatinFixes) {
    await sb.from('places').update({ city: to }).eq('city', from);
    console.log(`  ${from} → ${to}`);
  }

  // === STEP 4: Remove exact duplicates (user confirmed "Yes delete") ===
  console.log('\n--- STEP 4: Remove exact duplicates ---');
  const dupes: { keep: string; remove: string; name: string }[] = [];
  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (a.name.toLowerCase() === b.name.toLowerCase() && a.city === b.city &&
        Math.abs(a.latitude - b.latitude) < 0.001 && Math.abs(a.longitude - b.longitude) < 0.001) {
      // Keep the one with source 'openstreetmap', remove the other
      const keep = a.source === 'openstreetmap' ? a : b;
      const remove = a.source === 'openstreetmap' ? b : a;
      dupes.push({ keep: keep.id, remove: remove.id, name: a.name });
    }
  }
  for (const d of dupes) {
    // Delete linked posts first
    await sb.from('posts').delete().eq('place_id', d.remove);
    await sb.from('places').delete().eq('id', d.remove);
    console.log(`  Removed duplicate: ${d.name}`);
  }
  console.log(`  Removed: ${dupes.length}\n`);

  // === STEP 5: Fill missing cities ===
  console.log('--- STEP 5: Fill missing cities ---');
  const noCityPlaces = all.filter(p => !p.city || p.city.trim() === '');
  console.log(`  Places missing city: ${noCityPlaces.length}`);
  let cityFills = 0;
  for (const p of noCityPlaces.slice(0, 50)) { // Limit to 50 to avoid rate limits
    const result = await reverseGeocode(p.latitude, p.longitude);
    if (result) {
      // Nominatim returns country, we need city — use different zoom
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.latitude}&lon=${p.longitude}&zoom=12&addressdetails=1&accept-language=en`,
          { headers: { 'User-Agent': 'PlantsPack/1.0' }, signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          if (city) {
            await sb.from('places').update({ city }).eq('id', p.id);
            cityFills++;
          }
        }
      } catch {}
    }
    await new Promise(r => setTimeout(r, 1100));
  }
  console.log(`  Filled: ${cityFills}\n`);

  // === REFRESH VIEWS ===
  console.log('Refreshing materialized views...');
  await sb.rpc('refresh_directory_views');
  console.log('Done!\n');

  // === FINAL REPORT ===
  console.log('=== FINAL REPORT ===');
  console.log(`Border fixes: ${borderFixes}`);
  console.log(`Geocode fixes: ${geoFixes}`);
  console.log(`Non-Latin fixes: ${nonLatinFixes.length}`);
  console.log(`Duplicates removed: ${dupes.length}`);
  console.log(`Cities filled: ${cityFills}`);
  console.log(`Out-of-bounds remaining: ${outOfBounds.length - geoFixes} (need manual review)`);
}

main().catch(e => { console.error(e); process.exit(1); });
