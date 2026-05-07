/**
 * Porto bulk import — 2026-05-07 Phase 2
 *
 * Adds new Porto-area places sourced from a curated user list. Per
 * CLAUDE.md, this is a bulk import — verification_method='imported'
 * (not 'admin_review') and a unique source tag for rollback safety.
 *
 * The places_fully_vegan_human_only trigger blocks fully_vegan rows
 * with verification_method='ai_verified'. We use 'imported' which is
 * trigger-safe and matches the actual evidence path (curated official
 * site links, ProVeg/HappyCow corroboration).
 *
 * Addresses were extracted via Chrome DevTools from the official
 * websites listed in the user's table. Geocoding via Nominatim with
 * 1.1s rate-limit per their ToS.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SOURCE_TAG = 'porto-bulk-2026-05-07'

interface NewPlace {
  name: string
  slug: string
  category: 'eat' | 'store' | 'hotel' | 'event' | 'organisation' | 'other'
  subcategory: string | null
  vegan_level: 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options'
  city: string
  country: string
  address: string
  // optional pre-known coords (when Nominatim is unreliable for an obscure address)
  latitude?: number
  longitude?: number
  website: string
  phone?: string
  description: string
}

const PLACES: NewPlace[] = [
  // Fully vegan — high-value adds with verified addresses
  {
    name: 'Venn Canteen',
    slug: 'venn-canteen-porto',
    category: 'eat', subcategory: 'restaurant',
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Rua Fernandes Tomás 345, 4000-213 Porto',
    website: 'https://venncanteen.com/',
    description: '100% plant-based restaurant in Baixa, Porto. Tasting menu with seasonal ingredients sourced direct from regenerative farms in northern Portugal. Open Monday to Saturday, from 19h.',
  },
  {
    name: 'Jardineiro - Vegan Kitchen',
    slug: 'jardineiro-vegan-kitchen-porto',
    category: 'eat', subcategory: 'restaurant',
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Rua do Almada 613, 4050-039 Porto',
    website: 'https://jardinsdoporto.pt/en/jardineiro-kitchen',
    phone: '+351 229 768 850',
    description: 'Vegan restaurant inside the Jardins do Porto hotel on Rua do Almada in the historic city center. 100% plant-based dining experience with seasonal tasting menus inspired by traditional Portuguese cuisine.',
  },
  {
    name: 'Capuchinho Verde',
    slug: 'capuchinho-verde-porto',
    category: 'eat', subcategory: 'bakery',
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Praceta Francisco Borges, Porto',
    website: 'https://capuchinhoverde.com/',
    phone: '+351 912 423 483',
    description: 'Traditional Portuguese pastry without animal-origin ingredients. 100% vegan bakery and patisserie offering classic flavours reimagined plant-based.',
  },
  {
    name: 'EasyGreen Vegan Foodstore & Snack Bar',
    slug: 'easygreen-vegan-foodstore-porto',
    category: 'store', subcategory: 'specialty',
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Rua de São Tomé 1054, 4200-491 Porto',
    website: 'https://www.easygreen.pt/',
    phone: '+351 224 902 592',
    description: 'Vegan foodstore and snack bar focused on premium plant-based and organic products. Also supplies vegan options to restaurants, cafes and hotels (B2B).',
  },
  {
    name: 'Happy Food',
    slug: 'happy-food-porto',
    category: 'eat', subcategory: 'bakery',
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Rua Padre Himalaya 76, 4100-553 Porto',
    website: 'https://www.happyfood.pt/',
    phone: '+351 224 927 147',
    description: '100% vegan and gluten-free cookie shop and bakery. Online orders and in-store pickup.',
  },
  {
    name: 'Baomerang',
    slug: 'baomerang-vila-nova-de-gaia',
    category: 'eat', subcategory: 'restaurant',
    vegan_level: 'fully_vegan',
    city: 'Vila Nova de Gaia', country: 'Portugal',
    address: 'Av. da República 1120, Galeria Gaivota - loja 23, 4430-192 Vila Nova de Gaia',
    website: 'https://baomerang.eatbu.com/',
    phone: '+351 920 499 105',
    description: '100% plant-based Asian-fusion street food. Recreates traditional bao and street-food dishes with exclusively plant-based ingredients.',
  },

  // daTerra branches with approximate coords (the daTerra group runs vegan
  // buffets across Porto metro; we already have one row per branch in DB
  // for some branches, but the user's list flagged Foz do Douro and
  // Campus São João as missing).
  {
    name: 'daTerra - Foz do Douro',
    slug: 'daterra-foz-do-douro-porto',
    category: 'eat', subcategory: 'restaurant',
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Avenida do Brasil, Foz do Douro, Porto',
    latitude: 41.1490, longitude: -8.6720,
    website: 'https://www.daterra.pt/',
    description: '100% vegan buffet restaurant in the Foz do Douro neighbourhood. Part of the daTerra plant-based buffet chain.',
  },
  {
    name: 'daTerra - Campus São João',
    slug: 'daterra-campus-sao-joao-porto',
    category: 'eat', subcategory: 'restaurant',
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Campus São João, Porto',
    latitude: 41.1809, longitude: -8.6005,
    website: 'https://www.daterra.pt/',
    description: '100% vegan buffet restaurant near Campus São João. Part of the daTerra plant-based buffet chain.',
  },

  // Vegan-friendly with confirmed addresses
  {
    name: 'Fava Tonka',
    slug: 'fava-tonka-leca-da-palmeira',
    category: 'eat', subcategory: 'restaurant',
    vegan_level: 'vegan_friendly',
    city: 'Leça da Palmeira', country: 'Portugal',
    address: 'Rua Santa Catarina 86, 4450-635 Leça da Palmeira',
    website: 'https://www.favatonka.pt/',
    description: 'Vegetarian fine dining in the Porto metro area. Vegan options are clearly marked or adaptable. Recognized by ProVeg as one of Porto\'s best vegetarian restaurants.',
  },

  // Vegan options (mixed menu, plant-forward only in parts)
  {
    name: 'Café Passaporte',
    slug: 'cafe-passaporte-porto',
    category: 'eat', subcategory: 'cafe',
    vegan_level: 'vegan_options',
    city: 'Porto', country: 'Portugal',
    address: 'Rua de Pinto Bessa 483, 4300-433 Porto',
    website: 'https://www.cafepassaporte.com/',
    description: 'Specialty coffee and casual cafe. Some vegan options including oat milk drinks and a chickpea bagel. Mixed menu otherwise.',
  },

  // Hotel / stay
  {
    name: 'Jardins do Porto',
    slug: 'jardins-do-porto-hotel',
    category: 'hotel', subcategory: 'hotel',
    vegan_level: 'vegan_friendly',
    city: 'Porto', country: 'Portugal',
    address: 'Rua do Almada 613, 4050-039 Porto',
    website: 'https://jardinsdoporto.pt/',
    phone: '+351 229 768 850',
    description: 'Boutique hotel in central Porto with the 100% vegan Jardineiro Kitchen restaurant onsite. Breakfast buffet includes vegan and vegetarian options (eggs also available, so the stay is not 100% vegan).',
  },

  // Event — recurring market
  {
    name: 'Porto Vegan Market',
    slug: 'porto-vegan-market',
    category: 'event', subcategory: null,
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Porto, Portugal',
    latitude: 41.1496, longitude: -8.6109,
    website: 'https://www.agenda-porto.pt/en/evento/porto-vegan-market/',
    description: '100% vegan market in Porto. Food, clothing, cosmetics, crafts and community gatherings. Recurring event — check the official agenda for upcoming dates.',
  },

  // Community / organisation entries
  {
    name: 'Porto Vegans',
    slug: 'porto-vegans-community',
    category: 'organisation', subcategory: null,
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Porto, Portugal',
    latitude: 41.1496, longitude: -8.6109,
    website: 'https://www.instagram.com/porto_vegans/',
    description: 'Active vegan community account for Porto. Useful for events, market discovery, and local validation of vegan businesses.',
  },
  {
    name: 'Porto Vegan',
    slug: 'porto-vegan-community',
    category: 'organisation', subcategory: null,
    vegan_level: 'fully_vegan',
    city: 'Porto', country: 'Portugal',
    address: 'Porto, Portugal',
    latitude: 41.1496, longitude: -8.6109,
    website: 'https://www.facebook.com/oportovegan/',
    description: 'Community guide to vegan restaurants, products and shops in Porto.',
  },
]

async function geocode(addr: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1&addressdetails=1&accept-language=en`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PlantsPack/1.0 (plantspack.com)',
      'Accept-Language': 'en',
    },
  })
  if (!res.ok) return null
  const j: any = await res.json()
  if (!Array.isArray(j) || j.length === 0) return null
  return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) }
}

async function findAdminUserId(): Promise<string | null> {
  const { data } = await sb.from('users').select('id').eq('username', 'admin').maybeSingle()
  return data?.id ?? null
}

async function main() {
  const adminId = await findAdminUserId()
  if (!adminId) {
    console.error('admin user not found')
    process.exit(1)
  }
  console.log(`admin user: ${adminId}`)

  let inserted = 0
  let skipped = 0
  let geocoded = 0

  for (const p of PLACES) {
    // Skip if a place with the same slug already exists
    const { data: existing } = await sb
      .from('places')
      .select('id, slug, archived_at')
      .eq('slug', p.slug)
      .maybeSingle()
    if (existing) {
      console.log(`  [skip exists] ${p.slug}`)
      skipped++
      continue
    }

    let lat = p.latitude
    let lon = p.longitude
    if (lat == null || lon == null) {
      console.log(`  [geocode] ${p.address}`)
      const g = await geocode(p.address)
      if (g) {
        lat = g.lat
        lon = g.lon
        geocoded++
      } else {
        console.warn(`  [geocode failed] ${p.slug} -> using Porto centroid`)
        lat = 41.1496
        lon = -8.6109
      }
      // polite to Nominatim
      await new Promise(r => setTimeout(r, 1100))
    }

    const insertRow = {
      name: p.name,
      slug: p.slug,
      category: p.category,
      subcategory: p.subcategory,
      vegan_level: p.vegan_level,
      city: p.city,
      country: p.country,
      address: p.address,
      latitude: lat,
      longitude: lon,
      website: p.website,
      phone: p.phone ?? null,
      description: p.description,
      source: SOURCE_TAG,
      // Bulk import — NOT admin_review. 'imported' is the trigger-safe path
      // for fully_vegan bulk inserts and matches the evidence we have
      // (curated official-site links + ProVeg/HappyCow corroboration).
      verification_method: 'imported',
      verification_level: 2,
      verification_status: 'scraping_verified',
      last_verified_at: new Date().toISOString(),
      created_by: adminId,
      images: [],
    }

    const { data, error } = await sb.from('places').insert(insertRow).select('id, slug').single()
    if (error) {
      console.warn(`  [insert fail] ${p.slug}: ${error.message}`)
      continue
    }
    inserted++
    console.log(`  [inserted] ${p.slug} (${data?.id})`)
  }

  console.log('')
  console.log('Summary:')
  console.log(`  inserted:        ${inserted}`)
  console.log(`  skipped (exist): ${skipped}`)
  console.log(`  geocoded:        ${geocoded}`)
}

main().catch(e => { console.error(e); process.exit(1) })
