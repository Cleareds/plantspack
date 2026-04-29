import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MERGES = [
  // Germany
  { from: 'München', to: 'Munich', country: 'Germany' },
  { from: 'Munchen', to: 'Munich', country: 'Germany' },
  { from: 'Koln', to: 'Cologne', country: 'Germany' },
  // Spain
  { from: 'Sevilla', to: 'Seville', country: 'Spain' },
  // Portugal
  { from: 'Lisboa', to: 'Lisbon', country: 'Portugal' },
  // Netherlands
  { from: 'Den Haag', to: 'The Hague', country: 'Netherlands' },
  // Belgium
  { from: 'Antwerpen', to: 'Antwerp', country: 'Belgium' },
  { from: 'Gent', to: 'Ghent', country: 'Belgium' },
  { from: 'Brugge', to: 'Bruges', country: 'Belgium' },
  // Switzerland
  { from: 'Luzern', to: 'Lucerne', country: 'Switzerland' },
  // Czech Republic
  { from: 'Praha', to: 'Prague', country: 'Czech Republic' },
  // Poland
  { from: 'Warszawa', to: 'Warsaw', country: 'Poland' },
  { from: 'Wrocław', to: 'Wroclaw', country: 'Poland' },
  { from: 'Białystok', to: 'Bialystok', country: 'Poland' },
  // Romania
  { from: 'București', to: 'Bucharest', country: 'Romania' },
  { from: 'Constanța', to: 'Constanta', country: 'Romania' },
  // Turkey
  { from: 'İzmir', to: 'Izmir', country: 'Turkey' },
  { from: 'Kadıköy', to: 'Istanbul', country: 'Turkey' },
  { from: 'Kaş', to: 'Kas', country: 'Turkey' },
  // Israel
  { from: 'Tel-Aviv', to: 'Tel Aviv', country: 'Israel' },
  { from: "Be'er-Sheva", to: 'Beersheba', country: 'Israel' },
  // Vietnam
  { from: 'Hà Nội', to: 'Hanoi', country: 'Vietnam' },
  { from: 'Hội An Ward', to: 'Hoi An', country: 'Vietnam' },
  { from: 'Huế', to: 'Hue', country: 'Vietnam' },
  { from: 'Hải Phòng', to: 'Hai Phong', country: 'Vietnam' },
  { from: 'Phú Quốc', to: 'Phu Quoc', country: 'Vietnam' },
  { from: 'Buôn Ma Thuột', to: 'Buon Ma Thuot', country: 'Vietnam' },
  { from: 'Phường Mũi Né', to: 'Mui Ne', country: 'Vietnam' },
  // South Korea
  { from: '제주시', to: 'Jeju City', country: 'South Korea' },
  // Malta
  { from: 'Gżira', to: 'Gzira', country: 'Malta' },
]

async function main() {
  for (const { from, to, country } of MERGES) {
    if (from === to) continue
    const { data } = await sb.from('places').select('id').eq('city', from).eq('country', country).is('archived_at', null)
    const n = data?.length ?? 0
    if (n === 0) continue
    const { error } = await sb.from('places').update({ city: to }).eq('city', from).eq('country', country)
    console.log(`${country}: "${from}" → "${to}": ${error ? error.message : `OK (${n})`}`)
  }

  // Fix garbled Chinese city (桂林 = Guilin)
  const { data: guilin } = await sb.from('places').select('id').ilike('city', '%桂林%').is('archived_at', null)
  if (guilin?.length) {
    await sb.from('places').update({ city: 'Guilin' }).ilike('city', '%桂林%')
    console.log(`China: 桂林 → Guilin (${guilin.length})`)
  }

  // Fix garbled Japanese city (中央区 = Chuo Ward - check what city these actually are)
  const { data: chuo } = await sb.from('places').select('id,name,address').eq('city', '中央区').is('archived_at', null)
  if (chuo?.length) {
    console.log('Japan 中央区 places:', chuo.map(p => `${p.name} | ${p.address}`))
    // Will fix manually after seeing the addresses
  }

  const { error } = await sb.rpc('refresh_directory_views')
  console.log('\nRefreshed views:', error ?? 'OK')
}
main()
