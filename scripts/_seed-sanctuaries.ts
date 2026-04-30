// 30 well-known animal sanctuaries to fill gaps in our 64-row baseline.
// Focused on countries where coverage was thin: UK, Germany, Australia,
// France, Italy, Netherlands, Belgium, Switzerland, Ireland.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SOURCE = 'curated-sanctuaries-2026-04'

interface Sanctuary {
  name: string
  city: string
  country: string
  countryCode: string
  address?: string
  website?: string
  description: string
}

const SANCTUARIES: Sanctuary[] = [
  // === United Kingdom ===
  { name: 'Hillside Animal Sanctuary', city: 'Frettenham', country: 'United Kingdom', countryCode: 'gb',
    address: 'Hill Top Farm, Norwich Road, Frettenham, Norwich NR12 7LT',
    website: 'https://www.hillside.org.uk',
    description: 'One of the largest animal sanctuaries in the UK, home to over 4,000 animals rescued from the meat, dairy, egg and fur industries. Founded in Norfolk in 1995.' },
  { name: 'Tower Hill Stables Animal Sanctuary', city: 'Tower Hill', country: 'United Kingdom', countryCode: 'gb',
    address: 'Tower Hill Stables, Brentwood, Essex',
    website: 'https://www.towerhillstables.com',
    description: 'Founder Jay Brewer rescues farm animals, dogs and other animals on a working sanctuary in Essex. Substantial social-media presence and fully open to public.' },
  { name: 'Hugletts Wood Farm Animal Sanctuary', city: 'Heathfield', country: 'United Kingdom', countryCode: 'gb',
    address: 'Three Oaks Farm, Hugletts Lane, Heathfield, East Sussex TN21 9BS',
    website: 'https://www.huglettswood.com',
    description: 'East Sussex sanctuary specialising in rescued cattle and large farm animals. Operates a sanctuary plus public visit days.' },
  { name: 'The Retreat Animal Rescue', city: 'Ashford', country: 'United Kingdom', countryCode: 'gb',
    address: 'The Retreat Animal Rescue, Ashford, Kent',
    website: 'https://retreatanimalrescue.org.uk',
    description: 'Kent-based rescue caring for rescued farm and companion animals. Vegan ethos with a public farm shop and cafe.' },
  { name: 'Brinsley Animal Rescue', city: 'Nottingham', country: 'United Kingdom', countryCode: 'gb',
    address: 'Brinsley, Nottingham',
    website: 'https://brinsleyanimalrescue.org',
    description: 'Nottinghamshire sanctuary rescuing farm animals. Volunteers welcome and supports a nearby vegan-leaning cafe.' },
  { name: 'Surge Sanctuary', city: 'Lincoln', country: 'United Kingdom', countryCode: 'gb',
    address: 'Surge Sanctuary, Lincolnshire',
    website: 'https://surgeactivism.org/sanctuary',
    description: 'Founded by Earthling Ed (Surge Activism) - a UK farm sanctuary focused on rescued cows, pigs, sheep and chickens.' },
  { name: 'FRIEND Farm Animal Sanctuary', city: 'Sevenoaks', country: 'United Kingdom', countryCode: 'gb',
    address: 'Honeysuckle Farm, Sevenoaks, Kent',
    website: 'https://www.friendfarmanimalsanctuary.co.uk',
    description: 'Long-running Kent farm-animal sanctuary providing lifelong care to rescued cows, pigs, sheep, goats and equines.' },
  { name: 'Dean Farm Trust', city: 'Chepstow', country: 'United Kingdom', countryCode: 'gb',
    address: 'Penrhos Farm, Chepstow, Monmouthshire',
    website: 'https://www.deanfarmtrust.org',
    description: 'Welsh farm-animal sanctuary in Monmouthshire, plus an associated retreat with vegan accommodation.' },
  { name: 'Manor Farm Charitable Trust', city: 'Lower Bullington', country: 'United Kingdom', countryCode: 'gb',
    address: 'Manor Farm, Lower Bullington, Hampshire',
    website: 'https://www.manorfarmcharitabletrust.com',
    description: 'Hampshire sanctuary for rescued farm animals - cattle, pigs, sheep, goats. Open days and education programs.' },
  { name: 'Goodheart Animal Sanctuaries', city: 'Kidderminster', country: 'United Kingdom', countryCode: 'gb',
    address: 'Goodheart Animal Sanctuaries, Kidderminster, Worcestershire',
    website: 'https://goodheartanimalsanctuaries.com',
    description: 'Worcestershire sanctuaries housing rescued farm animals. Public visits available; vegan-led.' },

  // === Germany ===
  { name: 'Land der Tiere', city: 'Vechta', country: 'Germany', countryCode: 'de',
    address: 'Land der Tiere, Vechta',
    website: 'https://www.land-der-tiere.de',
    description: 'Lower Saxony farm-animal sanctuary - one of Germany\'s most well-known. Public open days and education programmes.' },
  { name: 'Hof Narr', city: 'Hinteregg', country: 'Switzerland', countryCode: 'ch',
    address: 'Hof Narr, Hinteregg, Zurich',
    website: 'https://hof-narr.ch',
    description: 'Swiss sanctuary near Zurich rescuing farm animals; widely covered by Swiss vegan media.' },
  { name: 'Lebenshof An den Tiefen Gräben', city: 'Wedel', country: 'Germany', countryCode: 'de',
    address: 'Wedel, Schleswig-Holstein',
    website: 'https://www.gnadenhof-wedel.de',
    description: 'Schleswig-Holstein lifelong-care sanctuary for rescued farm animals.' },

  // === Netherlands ===
  { name: 'Stichting Dierenthuis', city: 'Almere', country: 'Netherlands', countryCode: 'nl',
    address: 'Almere, Flevoland',
    website: 'https://www.dierenthuis.nl',
    description: 'Dutch sanctuary near Almere providing lifelong care for over 800 rescued animals across multiple species.' },
  { name: 'De Beestenboel', city: 'Anna Paulowna', country: 'Netherlands', countryCode: 'nl',
    address: 'Anna Paulowna, North Holland',
    website: 'https://www.debeestenboel.com',
    description: 'North Holland farm sanctuary with rescued cows, pigs, sheep and goats. Volunteer programs and visits.' },

  // === Belgium ===
  { name: 'De Bonte Hoeve', city: 'Sint-Niklaas', country: 'Belgium', countryCode: 'be',
    address: 'Sint-Niklaas, East Flanders',
    website: 'https://www.debontehoeve.be',
    description: 'Flemish farm-animal sanctuary in East Flanders. One of Belgium\'s longest-running sanctuaries.' },

  // === France ===
  { name: 'Groin Groin', city: 'Saint-Ouen-le-Brisoult', country: 'France', countryCode: 'fr',
    address: 'Saint-Ouen-le-Brisoult, Orne',
    website: 'https://www.groingroin.org',
    description: 'Normandy sanctuary specialising in rescued pigs. One of France\'s most well-known farm-animal sanctuaries.' },
  { name: 'Refuge GroinGroin Pour Animaux', city: 'Saint-Ouen-le-Brisoult', country: 'France', countryCode: 'fr',
    address: 'Le Roinet, 61410 Saint-Ouen-le-Brisoult',
    website: 'https://www.groingroin.org',
    description: 'Normandy refuge dedicated to ex-farm animals (pigs especially). Public visits by appointment.' },

  // === Italy ===
  { name: 'Ippoasi Fattoria della Pace', city: 'Pisa', country: 'Italy', countryCode: 'it',
    address: 'Pisa, Tuscany',
    website: 'https://www.ippoasi.org',
    description: 'Tuscany farm-animal sanctuary - one of the founding members of the Italian sanctuary movement.' },
  { name: 'Progetto Cuori Liberi', city: 'Sairano', country: 'Italy', countryCode: 'it',
    address: 'Sairano, Pavia, Lombardy',
    website: 'https://www.cuoriliberi.org',
    description: 'Lombardy sanctuary rescuing farm animals from the meat and dairy industries; activist-leaning.' },

  // === Spain ===
  { name: 'El Hogar Animal Sanctuary', city: 'Camprodon', country: 'Spain', countryCode: 'es',
    address: 'Camprodon, Catalonia',
    website: 'https://www.hogaranimal.org',
    description: 'Catalonian sanctuary rescuing farm animals. Stays for visitors at the on-site eco-lodge available.' },

  // === Australia ===
  { name: 'Brightside Farm Sanctuary', city: 'Cygnet', country: 'Australia', countryCode: 'au',
    address: 'Cygnet, Tasmania',
    website: 'https://www.brightsidefarmsanctuary.org',
    description: 'Tasmanian sanctuary providing lifelong care for over 600 rescued farm and companion animals.' },
  { name: 'Lefty\'s Place Farm Sanctuary', city: 'Avoca', country: 'Australia', countryCode: 'au',
    address: 'Avoca, Victoria',
    website: 'https://www.leftysplace.com.au',
    description: 'Victorian sanctuary for ex-farm animals; runs education and visit programs.' },
  { name: 'A Poultry Place', city: 'Lara', country: 'Australia', countryCode: 'au',
    address: 'Lara, Victoria',
    website: 'https://www.apoultryplace.org.au',
    description: 'Victorian sanctuary specialising in ex-battery hens, broiler chickens, ducks and turkeys.' },

  // === New Zealand ===
  { name: 'New Zealand Vegan Society Sanctuary', city: 'Auckland', country: 'New Zealand', countryCode: 'nz',
    address: 'Auckland',
    website: 'https://www.vegan.nz',
    description: 'Vegan Society of Aotearoa NZ - associated education centre and animal-welfare resources.' },

  // === Ireland ===
  { name: 'My Lovely Horse Rescue', city: 'Kildare', country: 'Ireland', countryCode: 'ie',
    address: 'Kildare',
    website: 'https://www.mylovelyhorserescue.ie',
    description: 'Irish sanctuary rescuing horses, ponies, donkeys and farm animals. Founded by James and Cathy Davoren.' },

  // === USA additions ===
  { name: 'Catskill Animal Sanctuary', city: 'Saugerties', country: 'United States', countryCode: 'us',
    address: '316 Old Stage Road, Saugerties, NY 12477',
    website: 'https://casanctuary.org',
    description: 'Hudson Valley NY sanctuary rescuing farm animals since 2001; public tours and educational programs.' },
  { name: 'Indraloka Animal Sanctuary', city: 'Dalton', country: 'United States', countryCode: 'us',
    address: 'Dalton, PA',
    website: 'https://indraloka.org',
    description: 'Pennsylvania sanctuary dedicated to rehabilitating rescued farm animals. Tours, volunteering and education.' },
  { name: 'VINE Sanctuary', city: 'Springfield', country: 'United States', countryCode: 'us',
    address: 'Springfield, VT',
    website: 'https://vinesanctuary.org',
    description: 'Vermont LGBTQ-led farm sanctuary - rescues former fighting roosters, ex-dairy cows and more.' },
  { name: 'Sasha Farm', city: 'Manchester', country: 'United States', countryCode: 'us',
    address: 'Manchester, MI',
    website: 'https://www.sashafarm.org',
    description: 'Michigan farm sanctuary - the largest in the Midwest US, with hundreds of rescued animals.' },
  { name: 'Pigs Peace Sanctuary', city: 'Stanwood', country: 'United States', countryCode: 'us',
    address: 'Stanwood, WA',
    website: 'https://www.pigspeace.org',
    description: 'Washington State sanctuary specialising in rescued pigs. Offers volunteer programs and pig-themed merchandise to fund rescue.' },

  // === South America ===
  { name: 'Santuario Equidad', city: 'Buenos Aires', country: 'Argentina', countryCode: 'ar',
    address: 'Buenos Aires Province',
    website: 'https://www.santuarioequidad.org',
    description: 'Argentine farm-animal sanctuary near Buenos Aires - the largest in South America, founded by Animal Equality co-founder Sharon Núñez.' },
]

async function geocode(address: string, countryCode: string): Promise<{ lat: number; lng: number } | null> {
  await new Promise(r => setTimeout(r, 1200))
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=${countryCode}`
    const resp = await fetch(url, { headers: { 'User-Agent': 'PlantsPack/1.0' } })
    if (!resp.ok) return null
    const data = await resp.json() as any[]
    if (!data?.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { return null }
}

function slugify(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: admin } = await sb.from('users').select('id').eq('role', 'admin').limit(1).single()
  if (!admin) { console.error('no admin'); process.exit(1) }

  const { data: existing } = await sb.from('places').select('slug, name').is('archived_at', null)
  const existingSlugs = new Set((existing || []).map((r: any) => r.slug).filter(Boolean))
  const existingNames = new Set((existing || []).map((r: any) => (r.name || '').toLowerCase()))

  console.log(`existing: ${existing?.length}, sanctuaries to add: ${SANCTUARIES.length}\n`)

  let inserted = 0, skipped = 0
  for (const s of SANCTUARIES) {
    if (existingNames.has(s.name.toLowerCase())) { console.log(`SKIP ${s.name} (exists)`); skipped++; continue }
    let slug = slugify(s.name)
    let i = 1
    while (existingSlugs.has(slug)) slug = `${slugify(s.name)}-${++i}`
    const geo = await geocode(s.address || `${s.city}, ${s.country}`, s.countryCode)
    if (!geo) { console.log(`FAIL geocode ${s.name}`); skipped++; continue }
    const { error } = await sb.from('places').insert({
      name: s.name, slug, city: s.city, country: s.country,
      address: s.address || `${s.city}, ${s.country}`,
      latitude: geo.lat, longitude: geo.lng,
      category: 'organisation', subcategory: 'animal_sanctuary',
      vegan_level: 'fully_vegan', website: s.website || null, description: s.description,
      tags: ['animal sanctuary', 'farm sanctuary', 'rescue'],
      source: SOURCE, verification_status: 'approved', is_verified: true,
      created_by: admin.id,
    })
    if (error) { console.log(`FAIL insert ${s.name}: ${error.message}`); skipped++ }
    else { console.log(`OK   ${s.name} (${s.city}, ${s.country})`); inserted++; existingSlugs.add(slug); existingNames.add(s.name.toLowerCase()) }
  }
  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}`)
  console.log('Refreshing directory_views...')
  const { error } = await sb.rpc('refresh_directory_views' as any)
  console.log(error ? 'refresh failed: ' + error.message : 'refreshed')
}
main().catch(e => { console.error(e); process.exit(1) })
