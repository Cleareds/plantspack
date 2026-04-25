/**
 * Shared place-pipeline library.
 * Used by import-osm-countries.ts, add-place.ts, and import-places skill.
 */
import { config } from 'dotenv'; config({ path: '.env.local' });

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OsmPlace {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

export interface PlaceRecord {
  name: string;
  category: 'eat' | 'hotel' | 'store' | 'organisation' | 'event';
  latitude: number;
  longitude: number;
  vegan_level: 'fully_vegan' | 'vegan_friendly';
  address: string;
  city: string | null;
  country: string;
  website: string | null;
  phone: string | null;
  opening_hours: string | null;
  cuisine_types: string[] | null;
  images: string[];
  main_image_url?: string | null;
  description?: string | null;
  source: string;
  source_id: string;
  slug: string;
  tags: string[];
  created_by?: string;
}

export interface GeoResult {
  lat: number;
  lng: number;
  display_name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
export const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// Chains excluded per Platonic-form-is-vegan policy
// A chain belongs on PlantsPack if the Platonic form of what it sells is plant-based.
// Excluded: animal-centric Platonic form (burger, pizza, fried chicken, steak, seafood).
export const EXCLUDED_CHAINS = new Set([
  "mcdonald's", 'mcdonalds', 'burger king', 'kfc',
  'subway', 'pizza hut', 'dominos', "domino's", 'papa johns', "papa john's",
  'little caesars', 'taco bell', 'wendy', "wendy's", 'popeyes',
  'hardees', "hardee's", "arby's", 'arbys', 'dairy queen',
  'pressbyrån', 'pressbyran', '7-eleven', '7eleven',
  'ikea restaurang', 'ikea bistro', 'biltema cafe', 'biltema café',
  'pinchos', 'texas longhorn', 'steak house', 'blackstone steakhouse',
  'hesburger', 'kotipizza',
  "t.g.i. friday's", 'fridays', 'harvester', 'hungry horse',
  "nando's", 'nandos', 'max hamburgare', 'max',
  'pizzabakeren', 'papa murphys', "papa murphy's",
]);

// Bilingual / administrative city name overrides
export const CITY_OVERRIDES: Record<string, string> = {
  // Belgium
  'bruxelles - brussel': 'Brussels', 'bruxelles': 'Brussels', 'brussel': 'Brussels',
  'liege': 'Liège', 'luik': 'Liège',
  'gent': 'Ghent', 'antwerpen': 'Antwerp', 'brugge': 'Bruges',
  'ixelles - elsene': 'Ixelles', 'saint-gilles - sint-gillis': 'Saint-Gilles',
  'schaerbeek - schaarbeek': 'Schaerbeek',
  'molenbeek-saint-jean - sint-jans-molenbeek': 'Molenbeek',
  // Germany / Austria
  'köln': 'Cologne', 'münchen': 'Munich', 'nürnberg': 'Nuremberg', 'wien': 'Vienna',
  // Netherlands
  'den haag': "The Hague", "'s-gravenhage": "The Hague",
  // South Korea
  '서울특별시': 'Seoul', '서울': 'Seoul',
  '부산광역시': 'Busan', '부산': 'Busan',
  '대구광역시': 'Daegu', '대구': 'Daegu',
  '인천광역시': 'Incheon', '인천': 'Incheon',
  '광주광역시': 'Gwangju', '광주': 'Gwangju',
  '대전광역시': 'Daejeon', '대전': 'Daejeon',
  '울산광역시': 'Ulsan', '울산': 'Ulsan',
  '세종특별자치시': 'Sejong', '세종': 'Sejong',
  '수원시': 'Suwon', '고양시': 'Goyang', '용인시': 'Yongin',
  '창원시': 'Changwon', '성남시': 'Seongnam', '시흥시': 'Siheung',
  '전주시': 'Jeonju', '제주시': 'Jeju', '제주특별자치도': 'Jeju',
  '중앙리': 'Jeju',
  // Vietnam
  'thanh pho ho chi minh': 'Ho Chi Minh City', 'ho chi minh city': 'Ho Chi Minh City',
  'thành phố hồ chí minh': 'Ho Chi Minh City',
  'thu đuc': 'Ho Chi Minh City', 'thu duc': 'Ho Chi Minh City',
  'thuan an': 'Ho Chi Minh City',
  'thanh pho ha noi': 'Hanoi', 'ha noi': 'Hanoi', 'hà nội': 'Hanoi',
  'thanh pho đa nang': 'Da Nang', 'đa nang': 'Da Nang', 'da nang': 'Da Nang',
  'phuong sa pa': 'Sapa', 'sa pa': 'Sapa',
  'phuong ngu hanh son': 'Da Nang',
  'hoi an': 'Hoi An', 'hội an': 'Hoi An',
  'can tho': 'Can Tho', 'cần thơ': 'Can Tho',
  'nha trang': 'Nha Trang', 'vung tau': 'Vung Tau',
  'da lat': 'Da Lat', 'đà lạt': 'Da Lat',
  'hue': 'Hue', 'huế': 'Hue',
  // Egypt
  'القاهرة': 'Cairo', 'الإسكندرية': 'Alexandria', 'إسكندرية': 'Alexandria',
  'الجيزة': 'Giza', 'الأقصر': 'Luxor', 'أسوان': 'Aswan',
  'شرم الشيخ': 'Sharm El Sheikh', 'الغردقة': 'Hurghada',
  // Morocco
  'الرباط': 'Rabat', 'الدار البيضاء': 'Casablanca', 'مراكش': 'Marrakesh',
  'فاس': 'Fes', 'طنجة': 'Tangier', 'أكادير': 'Agadir',
  'fes medina': 'Fes',
  // Kenya / Africa
  'nairobi city': 'Nairobi',
  'dar es salaaam': 'Dar es Salaam', 'dar es salaam': 'Dar es Salaam',
  // Hong Kong
  '尖沙咀 tsim sha tsui': 'Tsim Sha Tsui', 'tsim sha tsui': 'Tsim Sha Tsui',
  // Latin America common district → city
  'miraflores': 'Lima', 'barranco': 'Lima', 'yanahuara': 'Arequipa',
  'nunoa': 'Santiago', 'nuñoa': 'Santiago', 'providencia': 'Santiago',
  'las condes': 'Santiago',
  'ciudad satelite': 'Santa Cruz de la Sierra',
};

export const COUNTRY_NAMES: Record<string, string> = {
  // Europe
  BE: 'Belgium', NL: 'Netherlands', DE: 'Germany', GB: 'United Kingdom',
  SE: 'Sweden', FR: 'France', IT: 'Italy', ES: 'Spain', PL: 'Poland',
  AT: 'Austria', CH: 'Switzerland', DK: 'Denmark', NO: 'Norway',
  FI: 'Finland', PT: 'Portugal', CZ: 'Czech Republic', HU: 'Hungary',
  RO: 'Romania', GR: 'Greece', HR: 'Croatia', SK: 'Slovakia',
  SI: 'Slovenia', LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia',
  BG: 'Bulgaria', LU: 'Luxembourg', UA: 'Ukraine', IE: 'Ireland',
  RS: 'Serbia', BA: 'Bosnia and Herzegovina', ME: 'Montenegro',
  MK: 'North Macedonia', AL: 'Albania', MT: 'Malta', CY: 'Cyprus',
  IS: 'Iceland',
  // Americas
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil',
  AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Peru',
  UY: 'Uruguay', BO: 'Bolivia', EC: 'Ecuador', CR: 'Costa Rica',
  PA: 'Panama', GT: 'Guatemala', DO: 'Dominican Republic', CU: 'Cuba',
  // Oceania
  AU: 'Australia', NZ: 'New Zealand',
  // East Asia
  JP: 'Japan', TW: 'Taiwan', KR: 'South Korea', HK: 'Hong Kong', CN: 'China',
  // SE Asia
  TH: 'Thailand', VN: 'Vietnam', ID: 'Indonesia', PH: 'Philippines',
  MY: 'Malaysia', SG: 'Singapore', KH: 'Cambodia', MM: 'Myanmar',
  LA: 'Laos',
  // South Asia
  IN: 'India', LK: 'Sri Lanka', NP: 'Nepal', BD: 'Bangladesh', PK: 'Pakistan',
  // Middle East / Central Asia
  IL: 'Israel', AE: 'United Arab Emirates', TR: 'Turkey', LB: 'Lebanon',
  JO: 'Jordan', KW: 'Kuwait', QA: 'Qatar', SA: 'Saudi Arabia',
  // Africa
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana',
  TZ: 'Tanzania', RW: 'Rwanda', ET: 'Ethiopia', MA: 'Morocco',
  EG: 'Egypt', UG: 'Uganda', ZW: 'Zimbabwe', SN: 'Senegal',
  CI: 'Ivory Coast', CM: 'Cameroon', MU: 'Mauritius',
};

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function transliterate(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/ø/g, 'o').replace(/ł/g, 'l')
    .replace(/ß/g, 'ss').replace(/ı/g, 'i').replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe').replace(/þ/g, 'th');
}

export function toSlug(s: string): string {
  return transliterate(s)
    .replace(/&/g, 'and').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 100);
}

/** Strip administrative suffixes and apply bilingual overrides. */
export function normalizeCity(city: string): string {
  const cleaned = city
    .replace(/\s+(distrikt|domkyrkodistrikt|kommun|stad|district|municipality|gemeinde|arrondissement|borough|county|parish)$/i, '')
    .trim();
  return CITY_OVERRIDES[cleaned.toLowerCase()] || cleaned;
}

export function isExcludedChain(name: string): boolean {
  return EXCLUDED_CHAINS.has(name.toLowerCase());
}

/** OSM tags → place category. */
export function mapOsmCategory(tags: Record<string, string>): 'eat' | 'hotel' | 'store' {
  if (tags.shop) return 'store';
  if (tags.tourism === 'hotel' || tags.tourism === 'hostel' || tags.tourism === 'guest_house' || tags.tourism === 'apartment') return 'hotel';
  return 'eat';
}

/** Extract vegan_level from OSM diet:vegan tag. */
export function mapVeganLevel(tags: Record<string, string>): 'fully_vegan' | 'vegan_friendly' {
  if (tags['diet:vegan'] === 'only') return 'fully_vegan';
  // Pure vegetarian-only restaurants without explicit vegan=only get vegan_friendly
  return 'vegan_friendly';
}

/** Extract default tags for import-time categorisation. */
export function buildOsmTags(category: string): string[] {
  if (category === 'store') return ['vegan shop'];
  if (category === 'hotel') return ['vegan stay'];
  return [];
}

export function extractOsmImages(tags: Record<string, string>): string[] {
  const imgs: string[] = [];
  if (tags.image?.startsWith('http')) imgs.push(tags.image);
  if (tags['contact:photo']?.startsWith('http')) imgs.push(tags['contact:photo']);
  return imgs;
}

// ─── Slug generation ─────────────────────────────────────────────────────────

/** Generate a unique slug that isn't already in usedSlugs. Mutates usedSlugs. */
export function uniqueSlug(name: string, city: string | null, countryName: string, usedSlugs: Set<string>): string {
  const base = toSlug(name);
  const withCity = toSlug(`${name}-${city || countryName}`);
  let slug = !usedSlugs.has(base) ? base
    : !usedSlugs.has(withCity) ? withCity
    : `${withCity}-${Math.random().toString(36).slice(2, 6)}`;
  usedSlugs.add(slug);
  return slug;
}

// ─── Overpass / OSM ──────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

/** Widened OSM query: vegan diet tag OR vegetarian-only OR explicit vegan cuisine. */
export function buildOsmQuery(area: string): string {
  return `[out:json][timeout:180];${area};(`
    + `node["diet:vegan"~"yes|only"](area.s);way["diet:vegan"~"yes|only"](area.s);`
    + `node["diet:vegetarian"="only"](area.s);way["diet:vegetarian"="only"](area.s);`
    + `node["cuisine"="vegan"](area.s);way["cuisine"="vegan"](area.s);`
    + `);out body center;`;
}

export function buildOsmBboxQuery(s: number, w: number, n: number, e: number): string {
  const bb = `${s},${w},${n},${e}`;
  return `[out:json][timeout:180];(`
    + `node["diet:vegan"~"yes|only"](${bb});way["diet:vegan"~"yes|only"](${bb});`
    + `node["diet:vegetarian"="only"](${bb});way["diet:vegetarian"="only"](${bb});`
    + `node["cuisine"="vegan"](${bb});way["cuisine"="vegan"](${bb});`
    + `);out body center;`;
}

export async function runOverpassQuery(query: string, label: string): Promise<OsmPlace[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) { console.log(`  Retry ${attempt}/2 for ${label}...`); await sleep(60000); }
    try {
      const resp = await fetch(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PlantsPack/1.0 (plantspack.com; admin@plantspack.com)',
        },
      });
      if (resp.status === 429 || resp.status === 406) {
        console.warn(`  ⚠️  Overpass rate-limited (${resp.status}), waiting 90s...`);
        await sleep(90000);
        continue;
      }
      if (!resp.ok) { console.error(`  ❌ HTTP ${resp.status} for ${label}`); return []; }
      const data = await resp.json();
      return (data.elements || []) as OsmPlace[];
    } catch (e) {
      console.error(`  ❌ Error for ${label}:`, (e as Error).message);
    }
  }
  return [];
}

/**
 * Look up an OSM node/way near a given coordinate.
 * Returns the best-matching OSM element (within 50m) or null.
 * Used by add-place to cross-reference and merge OSM data.
 */
export async function osmLookupByCoords(lat: number, lon: number, name: string): Promise<OsmPlace | null> {
  // 0.0005° ≈ 55m at mid-latitudes
  const delta = 0.0005;
  const bb = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
  const query = `[out:json][timeout:30];(node["name"](${bb});way["name"](${bb}););out body center;`;
  try {
    const elements = await runOverpassQuery(query, `OSM lookup near ${lat.toFixed(4)},${lon.toFixed(4)}`);
    if (!elements.length) return null;
    const nameLower = transliterate(name).toLowerCase();
    // Exact name match first, then fuzzy
    return elements.find(el => transliterate(el.tags?.name || '').toLowerCase() === nameLower)
      || elements.find(el => transliterate(el.tags?.name || '').toLowerCase().includes(nameLower.slice(0, 6)))
      || null;
  } catch { return null; }
}

/**
 * Merge OSM tags into an existing place payload — fills missing phone,
 * opening_hours, website, cuisine_types without overwriting existing values.
 */
export function mergeOsmData(
  payload: Partial<PlaceRecord>,
  osmTags: Record<string, string>,
  osmId: string,
): Partial<PlaceRecord> {
  return {
    ...payload,
    phone: payload.phone || osmTags.phone || osmTags['contact:phone'] || null,
    website: payload.website || osmTags.website || osmTags['contact:website'] || null,
    opening_hours: payload.opening_hours || osmTags.opening_hours || null,
    cuisine_types: payload.cuisine_types?.length
      ? payload.cuisine_types
      : osmTags.cuisine ? osmTags.cuisine.split(';').map(c => c.trim()) : null,
    source_id: osmId,
  };
}

// ─── Nominatim geocoding ──────────────────────────────────────────────────────

const nominatimCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lon: number, delayMs = 1200): Promise<string> {
  const key = `${(lat * 100 | 0)},${(lon * 100 | 0)}`;
  if (nominatimCache.has(key)) return nominatimCache.get(key)!;
  await sleep(delayMs);
  try {
    const url = `${NOMINATIM_API}/reverse?lat=${lat}&lon=${lon}&format=json&zoom=13&addressdetails=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PlantsPack/1.0 (plantspack.com; admin@plantspack.com)' },
    });
    if (!resp.ok) { nominatimCache.set(key, ''); return ''; }
    const data = await resp.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || '';
    const result = normalizeCity(transliterate(city));
    nominatimCache.set(key, result);
    return result;
  } catch { nominatimCache.set(key, ''); return ''; }
}

export async function forwardGeocode(query: string, countryCode = 'gb'): Promise<GeoResult | null> {
  try {
    const url = `${NOMINATIM_API}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=${countryCode}&addressdetails=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PlantsPack/1.0 (plantspack.com; admin@plantspack.com)', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any[];
    if (!data?.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
  } catch { return null; }
}

// ─── Website enrichment ──────────────────────────────────────────────────────

const IMG_SKIP = /logo|favicon|sprite|icon|avatar|emoji|placeholder|\.svg(\?|$)/i;

/** Fetch up to maxBytes of a URL's HTML, streaming. */
async function fetchHtml(url: string, maxBytes = 60000): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!resp.ok || !resp.headers.get('content-type')?.includes('html')) return '';
  const reader = resp.body?.getReader();
  if (!reader) return resp.text();
  let html = '', bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    html += new TextDecoder().decode(value);
    bytes += value.length;
    if (html.includes('</head>') && bytes > 10000) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

/**
 * Scrape a hero image from a website — multi-path, multi-UA, size-ranked.
 * Returns the best raster image URL or null.
 */
export async function scrapeHeroImage(url: string): Promise<string | null> {
  const PATHS = ['', '/menu', '/menus', '/gallery', '/about', '/about-us', '/food'];
  const candidates = new Set<string>();

  for (const p of PATHS) {
    let pageUrl: string;
    try { pageUrl = new URL(p, url).toString(); } catch { continue; }
    try {
      const html = await fetchHtml(pageUrl);
      if (!html) continue;

      // og:image
      for (const re of [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      ]) {
        const m = html.match(re);
        if (m?.[1]?.trim()) { try { candidates.add(new URL(m[1], pageUrl).toString()); } catch {} }
      }
      // <img> tags
      const imgRe = /<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = imgRe.exec(html)) !== null) {
        try {
          const abs = new URL(m[1], pageUrl).toString();
          if (!IMG_SKIP.test(abs)) candidates.add(abs);
        } catch {}
      }
      break;
    } catch {}
  }

  if (candidates.size === 0) return null;

  const list = Array.from(candidates).slice(0, 20);
  const measured: { u: string; area: number }[] = [];
  for (const u of list) {
    try {
      const r = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 PlantsPack/1.0', Accept: 'image/*' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 5000) continue;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require('sharp');
        const meta = await sharp(buf).metadata();
        if (!meta.width || !meta.height) continue;
        if (meta.width < 600 || meta.height < 300) continue;
        if (meta.width / meta.height > 6 || meta.height / meta.width > 3) continue;
        measured.push({ u, area: meta.width * meta.height });
      } catch {
        measured.push({ u, area: buf.length });
      }
    } catch {}
  }
  if (!measured.length) return null;
  measured.sort((a, b) => b.area - a.area);
  return measured[0].u;
}

/**
 * Scrape a short description from a website's og:description or meta description.
 * Returns cleaned text (max 400 chars) or null.
 */
export async function scrapeDescription(url: string): Promise<string | null> {
  try {
    const html = await fetchHtml(url, 30000);
    if (!html) return null;
    // og:description
    const ogM = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{20,}?)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']{20,}?)["'][^>]+property=["']og:description["']/i);
    if (ogM?.[1]) return cleanDescription(ogM[1]);
    // meta description
    const metaM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{20,}?)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']{20,}?)["'][^>]+name=["']description["']/i);
    if (metaM?.[1]) return cleanDescription(metaM[1]);
    return null;
  } catch { return null; }
}

function cleanDescription(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim().slice(0, 400) || null as any;
}
