/**
 * Transliterate non-English city names, place names and descriptions to English
 * Usage: npx tsx scripts/transliterate-places.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

// Strip diacritics for Latin-script names
function transliterate(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Special characters not handled by NFD
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/ø/g, 'o').replace(/Ø/g, 'O')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i') // Turkish dotless i
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
}

// Manual translations for non-Latin script cities
const CITY_TRANSLATIONS: Record<string, string> = {
  '대전광역시': 'Daejeon',
  '서울특별시': 'Seoul',
  '부산광역시': 'Busan',
  'つくば市': 'Tsukuba',
  '大阪市': 'Osaka',
  'أبو ظبي': 'Abu Dhabi',
  // Vietnamese administrative prefixes → simplified English
  'Thành phố Hồ Chí Minh': 'Ho Chi Minh City',
  'Thành phố Hà Nội': 'Hanoi',
  'Thành phố Đà Nẵng': 'Da Nang',
  'Thành phố Cần Thơ': 'Can Tho',
  'Hà Nội': 'Hanoi',
  'Đà Nẵng': 'Da Nang',
  'Đà Lạt': 'Da Lat',
  'Huế': 'Hue',
  'Phường Hội An': 'Hoi An',
  'Phường Hội An Đông': 'Hoi An',
  'Phường Sa Pa': 'Sapa',
  'Phường Nha Trang': 'Nha Trang',
  'Phường An Hải': 'Da Nang',
  'Phường Ngũ Hành Sơn': 'Da Nang',
  'Phường Hồng Gai': 'Ha Long',
  'Phường Nam Hoa Lư': 'Ninh Binh',
  'Phường Tân Giang': 'Ha Tinh',
  'Phường Thục Phán': 'Bac Ninh',
  'Đặc khu Phú Quốc': 'Phu Quoc',
  'Xã Đồng Văn': 'Dong Van',
  'Xã Tân Dương': 'Tan Duong',
  // Spanish city translations
  'Ciudad de México': 'Mexico City',
  'Ciudad Autónoma de Buenos Aires': 'Buenos Aires',
  'Área Metropolitana de San José': 'San Jose',
  'Perímetro Urbano Bucaramanga': 'Bucaramanga',
  'Perímetro Urbano Medellín': 'Medellin',
  // Turkish
  'İstanbul': 'Istanbul',
  'Beşiktaş': 'Besiktas',
  'Beyoğlu': 'Beyoglu',
  'Çankaya': 'Ankara',
}

function translateCity(city: string): string {
  // Check manual translations first
  if (CITY_TRANSLATIONS[city]) return CITY_TRANSLATIONS[city]
  // Then try transliteration for Latin-script diacritics
  const t = transliterate(city)
  return t !== city ? t : city
}

async function main() {
  // Fetch all places
  let allPlaces: any[] = []
  let offset = 0
  while (true) {
    const { data } = await sb.from('places').select('id, city, country, name').range(offset, offset + 999)
    if (!data || data.length === 0) break
    allPlaces.push(...data)
    offset += 1000
    if (data.length < 1000) break
  }
  console.log(`Total places: ${allPlaces.length}\n`)

  // Translate cities
  let cityUpdates = 0
  const cityMap = new Map<string, string>()

  for (const p of allPlaces) {
    if (!p.city) continue
    const translated = translateCity(p.city)
    if (translated !== p.city) {
      cityMap.set(p.city, translated)
    }
  }

  console.log(`=== CITY TRANSLATIONS (${cityMap.size}) ===`)
  for (const [from, to] of cityMap) {
    console.log(`  ${from} → ${to}`)
  }

  // Apply city updates in batches
  for (const [from, to] of cityMap) {
    const { error, count } = await sb
      .from('places')
      .update({ city: to })
      .eq('city', from)
    if (error) {
      console.log(`  ERR updating city "${from}": ${error.message}`)
    } else {
      cityUpdates++
    }
  }
  console.log(`\n✅ Updated ${cityUpdates} city name groups`)

  // Transliterate place names (strip diacritics only — keep restaurant brand names recognizable)
  // We do NOT transliterate place names since "Çiğköftem" is the brand name
  // Only transliterate city/country names for directory purposes

  // Refresh materialized views
  console.log('\nRefreshing directory views...')
  const { error: refreshErr } = await sb.rpc('refresh_directory_views')
  if (refreshErr) console.log('  Refresh error:', refreshErr.message)
  else console.log('  ✅ Views refreshed')
}

main().catch(e => { console.error(e); process.exit(1) })
