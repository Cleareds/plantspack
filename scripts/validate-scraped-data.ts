/**
 * Validate, clean, and prepare all scraped OSM data for import
 *
 * Steps:
 * 1. Parse all OSM JSON files
 * 2. Normalize fields (name, address, city, country, category, subcategory)
 * 3. Assign new category + subcategory structure
 * 4. Translate non-Latin city names
 * 5. Deduplicate (by name + proximity)
 * 6. Deduplicate against existing DB
 * 7. Filter: must have name, valid coords, confidence >= 80%
 * 8. Output: validated-places.json + report
 *
 * Usage: npx tsx scripts/validate-scraped-data.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ISO country code → English name
const ISO_COUNTRIES: Record<string, string> = {
  'AD':'Andorra','AE':'United Arab Emirates','AF':'Afghanistan','AL':'Albania','AM':'Armenia',
  'AR':'Argentina','AT':'Austria','AU':'Australia','AZ':'Azerbaijan','BA':'Bosnia and Herzegovina',
  'BD':'Bangladesh','BE':'Belgium','BG':'Bulgaria','BH':'Bahrain','BN':'Brunei','BO':'Bolivia',
  'BR':'Brazil','BT':'Bhutan','BW':'Botswana','BY':'Belarus','CA':'Canada','CH':'Switzerland',
  'CL':'Chile','CN':'China','CO':'Colombia','CR':'Costa Rica','CU':'Cuba','CY':'Cyprus',
  'CZ':'Czech Republic','DE':'Germany','DK':'Denmark','DO':'Dominican Republic','DZ':'Algeria',
  'EC':'Ecuador','EE':'Estonia','EG':'Egypt','ES':'Spain','ET':'Ethiopia','FI':'Finland',
  'FJ':'Fiji','FO':'Faroe Islands','FR':'France','GA':'Gabon','GB':'United Kingdom','GE':'Georgia',
  'GH':'Ghana','GR':'Greece','GT':'Guatemala','GY':'Guyana','HK':'Hong Kong','HN':'Honduras',
  'HR':'Croatia','HU':'Hungary','ID':'Indonesia','IE':'Ireland','IL':'Israel','IN':'India',
  'IQ':'Iraq','IR':'Iran','IS':'Iceland','IT':'Italy','JM':'Jamaica','JO':'Jordan','JP':'Japan',
  'KE':'Kenya','KG':'Kyrgyzstan','KH':'Cambodia','KR':'South Korea','KW':'Kuwait','KZ':'Kazakhstan',
  'LA':'Laos','LB':'Lebanon','LI':'Liechtenstein','LK':'Sri Lanka','LT':'Lithuania','LU':'Luxembourg',
  'LV':'Latvia','MA':'Morocco','MC':'Monaco','MD':'Moldova','ME':'Montenegro','MG':'Madagascar',
  'MK':'North Macedonia','MM':'Myanmar','MN':'Mongolia','MO':'Macao','MT':'Malta','MU':'Mauritius',
  'MV':'Maldives','MX':'Mexico','MY':'Malaysia','MZ':'Mozambique','NA':'Namibia','NG':'Nigeria',
  'NI':'Nicaragua','NL':'Netherlands','NO':'Norway','NP':'Nepal','NZ':'New Zealand','OM':'Oman',
  'PA':'Panama','PE':'Peru','PH':'Philippines','PK':'Pakistan','PL':'Poland','PR':'Puerto Rico',
  'PS':'Palestine','PT':'Portugal','PY':'Paraguay','QA':'Qatar','RE':'Reunion','RO':'Romania',
  'RS':'Serbia','RU':'Russia','RW':'Rwanda','SA':'Saudi Arabia','SE':'Sweden','SG':'Singapore',
  'SI':'Slovenia','SK':'Slovakia','SN':'Senegal','SV':'El Salvador','SY':'Syria','TH':'Thailand',
  'TN':'Tunisia','TR':'Turkey','TT':'Trinidad and Tobago','TW':'Taiwan','TZ':'Tanzania',
  'UA':'Ukraine','UG':'Uganda','US':'United States','UY':'Uruguay','UZ':'Uzbekistan',
  'VE':'Venezuela','VN':'Vietnam','ZA':'South Africa','ZW':'Zimbabwe',
};

// Non-Latin city translations
const CITY_TRANSLATIONS: Record<string, string> = {
  'กรุงเทพมหานคร': 'Bangkok', 'เทศบาลนครเชียงใหม่': 'Chiang Mai',
  '京都市': 'Kyoto', '渋谷区': 'Shibuya', '港区': 'Minato', '新宿区': 'Shinjuku',
  '大阪市': 'Osaka', '札幌市': 'Sapporo', '福岡市': 'Fukuoka', '名古屋市': 'Nagoya',
  '横浜市': 'Yokohama', '広島市': 'Hiroshima', '仙台市': 'Sendai', '神戸市': 'Kobe',
  '臺北市': 'Taipei', '台北市': 'Taipei', '臺中市': 'Taichung', '高雄市': 'Kaohsiung',
  '新竹市': 'Hsinchu', '上海市': 'Shanghai', '北京市': 'Beijing',
  'תל אביב-יפו': 'Tel Aviv', 'תל אביב': 'Tel Aviv', 'ירושלים': 'Jerusalem',
  'თბილისი': 'Tbilisi', 'القاهرة': 'Cairo', 'دبي': 'Dubai',
  '서울특별시': 'Seoul', '부산광역시': 'Busan',
};

function transliterate(s: string): string {
  if (!s) return '';
  // Check manual translations first
  if (CITY_TRANSLATIONS[s]) return CITY_TRANSLATIONS[s];
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/ø/g, 'o').replace(/ß/g, 'ss').replace(/ı/g, 'i');
}

function toSlug(name: string): string {
  return transliterate(name).replace(/&/g, 'and').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Map OSM amenity/shop/tourism to our category + subcategory
function classifyPlace(tags: Record<string, string>): { category: string; subcategory: string } | null {
  const amenity = tags.amenity || '';
  const shop = tags.shop || '';
  const tourism = tags.tourism || '';

  if (amenity === 'restaurant' || amenity === 'food_court') return { category: 'eat', subcategory: 'restaurant' };
  if (amenity === 'cafe' || amenity === 'cafeteria') return { category: 'eat', subcategory: 'cafe' };
  if (amenity === 'fast_food') return { category: 'eat', subcategory: 'fast_food' };
  if (amenity === 'bar' || amenity === 'pub' || amenity === 'biergarten') return { category: 'eat', subcategory: 'bar' };
  if (amenity === 'ice_cream') return { category: 'eat', subcategory: 'ice_cream' };

  if (shop === 'bakery' || shop === 'pastry' || shop === 'confectionery') return { category: 'store', subcategory: 'bakery' };
  if (shop === 'supermarket' || shop === 'convenience' || shop === 'greengrocer') return { category: 'store', subcategory: 'grocery' };
  if (shop === 'health_food' || shop === 'organic') return { category: 'store', subcategory: 'health_food' };
  if (shop === 'deli' || shop === 'food' || shop === 'coffee' || shop === 'tea' || shop === 'alcohol') return { category: 'store', subcategory: 'specialty' };
  if (shop) return { category: 'store', subcategory: 'other_shop' };

  if (tourism === 'hotel') return { category: 'hotel', subcategory: 'hotel' };
  if (tourism === 'hostel') return { category: 'hotel', subcategory: 'hostel' };
  if (tourism === 'guest_house' || tourism === 'bed_and_breakfast') return { category: 'hotel', subcategory: 'bnb' };
  if (tourism === 'motel' || tourism === 'apartment' || tourism === 'chalet') return { category: 'hotel', subcategory: 'other_stay' };
  if (tourism) return { category: 'hotel', subcategory: 'other_stay' };

  return null; // Unclassifiable
}

function parseElement(el: any): any | null {
  const tags = el.tags || {};
  if (!tags.name) return null;

  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (!lat || !lon || lat === 0 || lon === 0) return null;

  const classification = classifyPlace(tags);
  if (!classification) return null;

  const veganLevel = tags['diet:vegan'] === 'only' ? 'fully_vegan' : 'vegan_friendly';

  // Build address
  const addrParts = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean);
  const address = addrParts.join(' ') || '';

  // City + country
  let city = tags['addr:city'] || tags['addr:suburb'] || tags['addr:town'] || tags['addr:village'] || '';
  city = transliterate(city);
  const countryCode = (tags['addr:country'] || '').toUpperCase();
  const country = ISO_COUNTRIES[countryCode] || '';

  // Cuisines
  const cuisines = tags.cuisine ? tags.cuisine.split(';').map((c: string) => c.trim()).filter(Boolean) : [];

  // Confidence scoring
  let confidence = 50; // base
  if (tags.name) confidence += 10;
  if (address) confidence += 10;
  if (city) confidence += 10;
  if (country) confidence += 5;
  if (tags.website || tags['contact:website']) confidence += 5;
  if (tags.phone || tags['contact:phone']) confidence += 3;
  if (tags.opening_hours) confidence += 5;
  if (veganLevel === 'fully_vegan') confidence += 5;
  // Cap at 100
  confidence = Math.min(100, confidence);

  return {
    name: tags.name,
    category: classification.category,
    subcategory: classification.subcategory,
    latitude: lat,
    longitude: lon,
    vegan_level: veganLevel,
    address,
    city,
    country,
    website: tags.website || tags['contact:website'] || null,
    phone: tags.phone || tags['contact:phone'] || null,
    opening_hours: tags.opening_hours || null,
    cuisine_types: cuisines.length > 0 ? cuisines : null,
    source: 'openstreetmap',
    source_id: `osm-${el.type}-${el.id}`,
    slug: toSlug(tags.name),
    confidence,
    images: [],
    tags: [],
  };
}

async function main() {
  console.log('=== PLANTSPACK DATA VALIDATION PIPELINE ===\n');

  // Step 1: Parse all OSM files
  const files = [
    'scripts/osm-fv-eat.json',
    'scripts/osm-vf-weu.json', 'scripts/osm-vf-eeu.json',
    'scripts/osm-vf-na.json', 'scripts/osm-vf-asia.json',
    'scripts/osm-vf-afr.json', 'scripts/osm-vf-oce.json',
    'scripts/osm-shops.json', 'scripts/osm-hotels.json',
  ];

  let allParsed: any[] = [];
  for (const f of files) {
    if (!existsSync(f)) { console.log(`  SKIP: ${f}`); continue; }
    const raw = JSON.parse(readFileSync(f, 'utf-8'));
    const parsed = raw.map(parseElement).filter(Boolean);
    console.log(`  ${f.split('/').pop()}: ${raw.length} raw → ${parsed.length} valid`);
    allParsed.push(...parsed);
  }
  console.log(`\nTotal parsed: ${allParsed.length}`);

  // Step 2: Deduplicate by source_id
  const bySourceId = new Map<string, any>();
  for (const p of allParsed) bySourceId.set(p.source_id, p);
  let unique = [...bySourceId.values()];
  console.log(`After source_id dedup: ${unique.length}`);

  // Step 3: Deduplicate by name + proximity (within 50m)
  const spatial: any[] = [];
  for (const p of unique) {
    const isDup = spatial.some(s =>
      s.name.toLowerCase() === p.name.toLowerCase() &&
      Math.abs(s.latitude - p.latitude) < 0.0005 &&
      Math.abs(s.longitude - p.longitude) < 0.0005
    );
    if (!isDup) spatial.push(p);
  }
  console.log(`After spatial dedup: ${spatial.length}`);

  // Step 4: Filter by confidence >= 80%
  const confident = spatial.filter(p => p.confidence >= 80);
  const lowConf = spatial.filter(p => p.confidence < 80);
  console.log(`Confidence >= 80%: ${confident.length}`);
  console.log(`Low confidence (< 80%): ${lowConf.length}`);

  // Step 5: Deduplicate against existing DB
  console.log('\nLoading existing DB places...');
  let existing: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('places').select('id, name, source_id, latitude, longitude').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    existing.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log(`Existing DB places: ${existing.length}`);

  const existingSourceIds = new Set(existing.filter(p => p.source_id).map(p => p.source_id));
  const existingCoords = existing.map(p => ({ name: p.name?.toLowerCase(), lat: p.latitude, lng: p.longitude }));

  const newPlaces = confident.filter(p => {
    if (existingSourceIds.has(p.source_id)) return false;
    return !existingCoords.some(e =>
      e.name === p.name.toLowerCase() &&
      Math.abs(e.lat - p.latitude) < 0.001 &&
      Math.abs(e.lng - p.longitude) < 0.001
    );
  });
  console.log(`New places (not in DB): ${newPlaces.length}`);

  // Step 6: Generate reports
  const byCat: Record<string, number> = {};
  const bySubcat: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byVegan: Record<string, number> = {};
  for (const p of newPlaces) {
    byCat[p.category] = (byCat[p.category] || 0) + 1;
    bySubcat[`${p.category}/${p.subcategory}`] = (bySubcat[`${p.category}/${p.subcategory}`] || 0) + 1;
    byCountry[p.country || 'Unknown'] = (byCountry[p.country || 'Unknown'] || 0) + 1;
    byVegan[p.vegan_level] = (byVegan[p.vegan_level] || 0) + 1;
  }

  console.log('\n=== NEW PLACES BREAKDOWN ===');
  console.log('\nBy category:');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nBy subcategory:');
  Object.entries(bySubcat).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nBy vegan level:');
  Object.entries(byVegan).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('\nTop 15 countries:');
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // Step 7: Save validated data
  writeFileSync('scripts/validated-places.json', JSON.stringify(newPlaces));
  writeFileSync('scripts/validated-low-confidence.json', JSON.stringify(lowConf));

  console.log(`\n=== FILES SAVED ===`);
  console.log(`  scripts/validated-places.json: ${newPlaces.length} places (ready for import)`);
  console.log(`  scripts/validated-low-confidence.json: ${lowConf.length} places (need review)`);

  // DB readiness check
  const estimatedSizeMB = Math.round((existing.length + newPlaces.length) * 2.5 / 1024);
  console.log(`\n=== DB READINESS ===`);
  console.log(`  Current DB rows: ${existing.length}`);
  console.log(`  New rows to add: ${newPlaces.length}`);
  console.log(`  Total after import: ${existing.length + newPlaces.length}`);
  console.log(`  Estimated DB size: ~${estimatedSizeMB}MB`);
  console.log(`  Free tier limit: 500MB`);
  console.log(`  STATUS: ${estimatedSizeMB < 400 ? '✅ FREE TIER OK' : '⚠️ UPGRADE TO PRO RECOMMENDED'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
