/**
 * Reverse geocode validated places missing country/city data
 * Uses Nominatim (free, 1 req/sec rate limit)
 * Supports resume via progress file
 *
 * Usage: npx tsx scripts/reverse-geocode-places.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const PROGRESS_FILE = 'scripts/geocode-progress.json';

// Non-Latin city translations
const CITY_TRANSLATIONS: Record<string, string> = {
  'กรุงเทพมหานคร': 'Bangkok', 'เทศบาลนครเชียงใหม่': 'Chiang Mai',
  'เทศบาลนครเชียงราย': 'Chiang Rai', 'เทศบาลนครภูเก็ต': 'Phuket',
  '京都市': 'Kyoto', '渋谷区': 'Shibuya', '港区': 'Minato', '新宿区': 'Shinjuku',
  '大阪市': 'Osaka', '札幌市': 'Sapporo', '福岡市': 'Fukuoka', '名古屋市': 'Nagoya',
  '横浜市': 'Yokohama', '広島市': 'Hiroshima', '仙台市': 'Sendai', '神戸市': 'Kobe',
  '臺北市': 'Taipei', '台北市': 'Taipei', '臺中市': 'Taichung', '高雄市': 'Kaohsiung',
  '上海市': 'Shanghai', '北京市': 'Beijing',
  'תל אביב-יפו': 'Tel Aviv', 'ירושלים': 'Jerusalem',
  'თბილისი': 'Tbilisi', 'القاهرة': 'Cairo', 'دبي': 'Dubai',
  '서울특별시': 'Seoul', '부산광역시': 'Busan',
};

function transliterate(s: string): string {
  if (!s) return '';
  if (CITY_TRANSLATIONS[s]) return CITY_TRANSLATIONS[s];
  // Check if contains non-Latin characters that we can't transliterate
  if (/[\u0E00-\u0E7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u10A0-\u10FF]/.test(s)) {
    // Contains Thai/CJK/Korean/Arabic/Hebrew/Georgian - can't transliterate, need translation
    return ''; // Will be filled by reverse geocoding
  }
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/ø/g, 'o').replace(/ß/g, 'ss').replace(/ı/g, 'i');
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'PlantsPack/1.0 (https://plantspack.com)' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || '';
    const country = addr.country || '';
    return { city, country };
  } catch {
    return null;
  }
}

async function main() {
  const data: any[] = JSON.parse(readFileSync('scripts/validated-places.json', 'utf-8'));
  console.log(`Total places: ${data.length}`);

  // Load progress
  let progress: Record<string, { city: string; country: string }> = {};
  if (existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log(`Resuming: ${Object.keys(progress).length} already geocoded`);
  }

  // Find places needing geocoding (no country OR non-Latin city)
  const needsGeocode = data.filter(p => {
    if (progress[p.source_id]) return false; // Already done
    if (!p.country) return true;
    if (p.city && /[\u0E00-\u0E7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF]/.test(p.city)) return true;
    return false;
  });

  console.log(`Need geocoding: ${needsGeocode.length}`);

  let geocoded = 0, failed = 0;

  for (let i = 0; i < needsGeocode.length; i++) {
    const p = needsGeocode[i];
    const result = await reverseGeocode(p.latitude, p.longitude);

    if (result && result.country) {
      progress[p.source_id] = result;
      geocoded++;
    } else {
      failed++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  [${i + 1}/${needsGeocode.length}] ${geocoded} ok, ${failed} fail`);
      writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
    }

    // Rate limit: 1 request per second
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save final progress
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
  console.log(`\nGeocoded: ${geocoded}, Failed: ${failed}`);

  // Apply results to validated data
  let updated = 0;
  for (const p of data) {
    const geo = progress[p.source_id];
    if (geo) {
      if (!p.country && geo.country) { p.country = geo.country; updated++; }
      if ((!p.city || transliterate(p.city) === '') && geo.city) { p.city = geo.city; updated++; }
    }
    // Transliterate remaining cities
    if (p.city) p.city = transliterate(p.city) || p.city;
    // Transliterate place names
    if (p.name) {
      const t = transliterate(p.name);
      // Only replace if transliteration produced a result
      if (t && t !== p.name && !/[\u0E00-\u0E7F\u4E00-\u9FFF\u3040-\u30FF]/.test(t)) {
        p.name = t;
      }
    }
  }

  // Remove places still without country
  const final = data.filter(p => p.country);
  console.log(`After geocoding: ${final.length} with country (removed ${data.length - final.length} without)`);

  writeFileSync('scripts/validated-places.json', JSON.stringify(final));
  console.log(`Updated scripts/validated-places.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
