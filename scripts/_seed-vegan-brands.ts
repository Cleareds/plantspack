// Curated list of vegan brand headquarters and notable vegan organisations.
// All inserted as category='organisation' with subcategory='brand_hq' (or
// 'advocacy' for non-profits). vegan_level='fully_vegan' since these are
// dedicated vegan brands. Address is HQ city + country - geocoded via
// Nominatim by the existing helper.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { reverseGeocode } from './lib/place-pipeline'

const SOURCE = 'curated-vegan-brands-2026-04'

interface Brand {
  name: string
  city: string
  country: string
  countryCode: string  // for forward geocoding
  address?: string  // optional street
  website?: string
  description: string  // 1-2 factual sentences
  subcategory: 'brand_hq' | 'advocacy'
  tags?: string[]
}

const BRANDS: Brand[] = [
  // === US food / beverage brands ===
  { name: 'Beyond Meat', city: 'El Segundo', country: 'United States', countryCode: 'us',
    address: '888 N Douglas Street, El Segundo, CA 90245',
    website: 'https://www.beyondmeat.com',
    description: 'Beyond Meat is one of the largest publicly-traded plant-based meat companies. Headquartered in El Segundo, California; products distributed in over 80 countries.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'public_company', 'usa'] },
  { name: 'Impossible Foods', city: 'Redwood City', country: 'United States', countryCode: 'us',
    address: '400 Saginaw Drive, Redwood City, CA 94063',
    website: 'https://impossiblefoods.com',
    description: 'Impossible Foods makes plant-based meat alternatives, best known for the Impossible Burger. Founded in 2011 by Stanford biochemistry professor Patrick O. Brown.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'usa'] },
  { name: 'Eat Just', city: 'Alameda', country: 'United States', countryCode: 'us',
    address: '2000 Alameda Avenue, Alameda, CA',
    website: 'https://www.ju.st',
    description: 'Eat Just (formerly Hampton Creek) makes JUST Egg, a mung-bean-based plant egg, and JUST Mayo. Headquartered in Alameda, California.',
    subcategory: 'brand_hq', tags: ['plant_based_egg', 'usa'] },
  { name: 'Miyoko\'s Creamery', city: 'Petaluma', country: 'United States', countryCode: 'us',
    address: '2086 Marin Avenue, Petaluma, CA 94952',
    website: 'https://miyokos.com',
    description: 'Miyoko\'s Creamery makes cultured artisan vegan butter and cheese using plant milks and traditional cheesemaking techniques. Founded by Miyoko Schinner in 2014.',
    subcategory: 'brand_hq', tags: ['vegan_cheese', 'vegan_butter', 'usa'] },
  { name: 'Tofurky', city: 'Hood River', country: 'United States', countryCode: 'us',
    address: 'Hood River, OR',
    website: 'https://tofurky.com',
    description: 'Tofurky makes plant-based deli slices, sausages, and the original Tofurky holiday roast. Family-owned since 1980, headquartered in Hood River, Oregon.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'usa'] },
  { name: 'Field Roast', city: 'Seattle', country: 'United States', countryCode: 'us',
    address: 'Seattle, WA',
    website: 'https://fieldroast.com',
    description: 'Field Roast makes plant-based grain meats, sausages, and Chao slices. Founded in Seattle in 1997.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'usa'] },
  { name: 'Daiya Foods', city: 'Burnaby', country: 'Canada', countryCode: 'ca',
    address: 'Burnaby, BC',
    website: 'https://daiyafoods.com',
    description: 'Daiya makes dairy-free cheese, pizza, mac and cheese, and frozen meals. Headquartered in Burnaby, British Columbia.',
    subcategory: 'brand_hq', tags: ['vegan_cheese', 'canada'] },
  { name: 'Califia Farms', city: 'Bakersfield', country: 'United States', countryCode: 'us',
    address: 'Bakersfield, CA',
    website: 'https://www.califiafarms.com',
    description: 'Califia Farms makes plant-based milks, creamers, and cold-brew coffees. Headquartered in Bakersfield, California.',
    subcategory: 'brand_hq', tags: ['plant_milk', 'usa'] },
  { name: 'Ripple Foods', city: 'Berkeley', country: 'United States', countryCode: 'us',
    address: 'Berkeley, CA',
    website: 'https://ripplefoods.com',
    description: 'Ripple makes pea-protein milks, yogurts, and protein shakes. Headquartered in Berkeley, California.',
    subcategory: 'brand_hq', tags: ['plant_milk', 'pea_protein', 'usa'] },
  { name: 'Follow Your Heart', city: 'Canoga Park', country: 'United States', countryCode: 'us',
    address: 'Canoga Park, CA',
    website: 'https://followyourheart.com',
    description: 'Follow Your Heart makes Vegenaise (the original vegan mayo), vegan cheese, and dressings. Operating from Canoga Park, California since 1970.',
    subcategory: 'brand_hq', tags: ['vegan_mayo', 'vegan_cheese', 'usa'] },
  { name: 'Banza', city: 'Detroit', country: 'United States', countryCode: 'us',
    address: 'Detroit, MI',
    website: 'https://eatbanza.com',
    description: 'Banza makes pasta, pizza, and rice from chickpeas. Founded in 2014, headquartered in Detroit.',
    subcategory: 'brand_hq', tags: ['chickpea', 'pasta', 'usa'] },
  { name: 'Hodo Foods', city: 'Oakland', country: 'United States', countryCode: 'us',
    address: 'Oakland, CA',
    website: 'https://hodofoods.com',
    description: 'Hodo makes organic tofu, yuba, and seasoned soy products. Headquartered in Oakland, California.',
    subcategory: 'brand_hq', tags: ['tofu', 'usa'] },
  { name: 'Lightlife', city: 'Turners Falls', country: 'United States', countryCode: 'us',
    address: 'Turners Falls, MA',
    website: 'https://lightlife.com',
    description: 'Lightlife makes plant-based burgers, hot dogs, and tempeh. One of the longest-running vegan brands, founded in 1979.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'tempeh', 'usa'] },
  { name: 'Sweet Earth Foods', city: 'Moss Landing', country: 'United States', countryCode: 'us',
    address: 'Moss Landing, CA',
    website: 'https://www.sweetearthfoods.com',
    description: 'Sweet Earth makes plant-based burritos, bowls, and meat alternatives. Owned by Nestlé, headquartered in Moss Landing, California.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'frozen_meals', 'usa'] },
  { name: 'Hippeas', city: 'Los Angeles', country: 'United States', countryCode: 'us',
    address: 'Los Angeles, CA',
    website: 'https://hippeas.com',
    description: 'Hippeas makes organic chickpea-based snacks (puffs and tortillas). Headquartered in Los Angeles.',
    subcategory: 'brand_hq', tags: ['chickpea', 'snacks', 'usa'] },
  { name: 'Treeline Cheese', city: 'Kingston', country: 'United States', countryCode: 'us',
    address: 'Kingston, NY',
    website: 'https://treelinecheese.com',
    description: 'Treeline makes cashew-based artisan vegan cheeses. Headquartered in Kingston, New York.',
    subcategory: 'brand_hq', tags: ['vegan_cheese', 'cashew', 'usa'] },
  { name: 'Lenny & Larry\'s', city: 'Panorama City', country: 'United States', countryCode: 'us',
    address: 'Panorama City, CA',
    website: 'https://lennylarry.com',
    description: 'Lenny & Larry\'s makes plant-based protein cookies (The Complete Cookie). Headquartered in Panorama City, California.',
    subcategory: 'brand_hq', tags: ['protein', 'snacks', 'usa'] },
  { name: 'Rebellyous Foods', city: 'Seattle', country: 'United States', countryCode: 'us',
    address: 'Seattle, WA',
    website: 'https://www.rebellyousfoods.com',
    description: 'Rebellyous makes plant-based chicken nuggets and patties for foodservice and retail. Headquartered in Seattle.',
    subcategory: 'brand_hq', tags: ['plant_based_chicken', 'usa'] },

  // === Europe / UK ===
  { name: 'Oatly', city: 'Malmö', country: 'Sweden', countryCode: 'se',
    address: 'Malmö',
    website: 'https://www.oatly.com',
    description: 'Oatly is the largest oat-milk brand globally. Founded in Sweden in the 1990s, headquartered in Malmö.',
    subcategory: 'brand_hq', tags: ['oat_milk', 'sweden', 'public_company'] },
  { name: 'Quorn', city: 'Stokesley', country: 'United Kingdom', countryCode: 'gb',
    address: 'Stokesley, North Yorkshire',
    website: 'https://www.quorn.co.uk',
    description: 'Quorn makes mycoprotein-based meat alternatives. Headquartered in Stokesley, North Yorkshire. Note: not all Quorn products are vegan (some contain egg white) - check labels.',
    subcategory: 'brand_hq', tags: ['mycoprotein', 'plant_based_meat', 'uk'] },
  { name: 'Vivera', city: 'Holten', country: 'Netherlands', countryCode: 'nl',
    address: 'Holten',
    website: 'https://www.vivera.com',
    description: 'Vivera makes plant-based meat alternatives - burgers, schnitzels, kebab strips. Headquartered in Holten, Netherlands.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'netherlands'] },
  { name: 'The Vegetarian Butcher', city: 'Breda', country: 'Netherlands', countryCode: 'nl',
    address: 'Breda',
    website: 'https://www.thevegetarianbutcher.com',
    description: 'The Vegetarian Butcher (De Vegetarische Slager) makes plant-based meat alternatives. Acquired by Unilever in 2018, headquartered in Breda.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'netherlands'] },
  { name: 'THIS', city: 'London', country: 'United Kingdom', countryCode: 'gb',
    address: 'London',
    website: 'https://this.co',
    description: 'THIS makes soy and pea-protein-based plant chicken and bacon alternatives. Founded in 2018, headquartered in London.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'uk'] },
  { name: 'Linda McCartney\'s Foods', city: 'Fakenham', country: 'United Kingdom', countryCode: 'gb',
    address: 'Fakenham, Norfolk',
    website: 'https://www.lindamccartneyfoods.co.uk',
    description: 'Linda McCartney\'s makes plant-based sausages, mince, and ready meals. Founded in 1991 by Linda McCartney; produced in Norfolk.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'uk'] },
  { name: 'Heura', city: 'Barcelona', country: 'Spain', countryCode: 'es',
    address: 'Barcelona',
    website: 'https://heurafoods.com',
    description: 'Heura makes plant-based chicken and meat alternatives using soy and olive oil. Founded in 2017, headquartered in Barcelona.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'spain'] },
  { name: 'Veganz', city: 'Berlin', country: 'Germany', countryCode: 'de',
    address: 'Berlin',
    website: 'https://www.veganz.com',
    description: 'Veganz is a German vegan-products company - chocolate, cheese, dairy alternatives, frozen meals. Headquartered in Berlin.',
    subcategory: 'brand_hq', tags: ['vegan_chocolate', 'vegan_cheese', 'germany'] },
  { name: 'Rügenwalder Mühle', city: 'Bad Zwischenahn', country: 'Germany', countryCode: 'de',
    address: 'Bad Zwischenahn',
    website: 'https://www.ruegenwalder.de',
    description: 'Rügenwalder Mühle is a German meat producer that pivoted heavily to plant-based products in 2014. Headquartered in Bad Zwischenahn.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'germany'] },
  { name: 'Garden Gourmet', city: 'Frankfurt', country: 'Germany', countryCode: 'de',
    address: 'Frankfurt am Main',
    website: 'https://www.gardengourmet.com',
    description: 'Garden Gourmet is Nestlé\'s plant-based brand for Europe - burgers, sausages, falafel, fish alternatives. European HQ in Frankfurt.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'germany'] },
  { name: 'Wicked Kitchen', city: 'London', country: 'United Kingdom', countryCode: 'gb',
    address: 'London',
    website: 'https://www.wickedkitchen.com',
    description: 'Wicked Kitchen is a 100% plant-based brand co-founded by chef Derek Sarno, originally launched at Tesco in the UK.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'uk'] },
  { name: 'Plenish', city: 'London', country: 'United Kingdom', countryCode: 'gb',
    address: 'London',
    website: 'https://plenishdrinks.com',
    description: 'Plenish makes organic plant milks and cold-pressed juices. UK-based, owned by Britvic.',
    subcategory: 'brand_hq', tags: ['plant_milk', 'uk'] },
  { name: 'Naked Glory', city: 'Tipton', country: 'United Kingdom', countryCode: 'gb',
    address: 'Tipton, West Midlands',
    website: 'https://www.nakedglory.co.uk',
    description: 'Naked Glory makes 100% plant-based burgers, sausages, mince and meatballs. UK-based.',
    subcategory: 'brand_hq', tags: ['plant_based_meat', 'uk'] },
  { name: 'Ecotone (Allos / Bonneterre / Tartex)', city: 'Hoofddorp', country: 'Netherlands', countryCode: 'nl',
    address: 'Hoofddorp',
    website: 'https://www.ecotone.bio',
    description: 'Ecotone (formerly Wessanen) owns several major European plant-based and organic brands including Allos, Bonneterre, Whole Earth, Tartex. Headquartered in Hoofddorp, Netherlands.',
    subcategory: 'brand_hq', tags: ['organic', 'netherlands'] },
  { name: 'NotCo', city: 'Santiago', country: 'Chile', countryCode: 'cl',
    address: 'Santiago',
    website: 'https://notco.com',
    description: 'NotCo makes plant-based dairy and meat products (NotMilk, NotMayo, NotBurger) using AI to formulate. Founded in 2015, headquartered in Santiago.',
    subcategory: 'brand_hq', tags: ['plant_milk', 'plant_based_meat', 'chile'] },
  { name: 'Frosta', city: 'Bremerhaven', country: 'Germany', countryCode: 'de',
    address: 'Bremerhaven',
    website: 'https://www.frosta.de',
    description: 'Frosta is a German frozen-food brand with a substantial plant-based product line. Headquartered in Bremerhaven.',
    subcategory: 'brand_hq', tags: ['frozen_meals', 'germany'] },

  // === Vegan organisations / advocacy ===
  { name: 'The Vegan Society', city: 'Birmingham', country: 'United Kingdom', countryCode: 'gb',
    address: 'Birmingham',
    website: 'https://www.vegansociety.com',
    description: 'The Vegan Society is the world\'s oldest vegan organisation, founded by Donald Watson in 1944. Originator of the term "vegan" and the Vegan Trademark certification. Headquartered in Birmingham.',
    subcategory: 'advocacy', tags: ['nonprofit', 'certification', 'uk', 'oldest_vegan_org'] },
  { name: 'PETA', city: 'Norfolk', country: 'United States', countryCode: 'us',
    address: '501 Front Street, Norfolk, VA 23510',
    website: 'https://www.peta.org',
    description: 'People for the Ethical Treatment of Animals - one of the largest animal-rights organisations globally. Founded in 1980, headquartered in Norfolk, Virginia.',
    subcategory: 'advocacy', tags: ['nonprofit', 'animal_rights', 'usa'] },
  { name: 'Mercy For Animals', city: 'Los Angeles', country: 'United States', countryCode: 'us',
    address: 'Los Angeles, CA',
    website: 'https://mercyforanimals.org',
    description: 'Mercy For Animals is an international farm-animal advocacy organisation founded in 1999. Operates undercover farm investigations and corporate-policy campaigns.',
    subcategory: 'advocacy', tags: ['nonprofit', 'farm_animals', 'usa'] },
  { name: 'The Humane League', city: 'Rockville', country: 'United States', countryCode: 'us',
    address: 'Rockville, MD',
    website: 'https://thehumaneleague.org',
    description: 'The Humane League works to end the abuse of farmed animals through corporate-policy campaigns. One of the highest-rated animal charities by Animal Charity Evaluators.',
    subcategory: 'advocacy', tags: ['nonprofit', 'farm_animals', 'usa'] },
  { name: 'Animal Equality', city: 'London', country: 'United Kingdom', countryCode: 'gb',
    address: 'London',
    website: 'https://animalequality.org',
    description: 'Animal Equality is an international animal-protection organisation working in 8+ countries. Known for undercover investigations of factory farms and slaughterhouses.',
    subcategory: 'advocacy', tags: ['nonprofit', 'farm_animals', 'uk'] },
  { name: 'Compassion in World Farming', city: 'Godalming', country: 'United Kingdom', countryCode: 'gb',
    address: 'Godalming, Surrey',
    website: 'https://www.ciwf.org.uk',
    description: 'Compassion in World Farming campaigns against factory farming, founded by British dairy farmer Peter Roberts in 1967. Headquartered in Godalming.',
    subcategory: 'advocacy', tags: ['nonprofit', 'farm_animals', 'uk'] },
  { name: 'ProVeg International', city: 'Berlin', country: 'Germany', countryCode: 'de',
    address: 'Genthiner Str. 48, 10785 Berlin',
    website: 'https://proveg.com',
    description: 'ProVeg International works to reduce global animal-product consumption by 50% by 2040. Operates in 13 countries. Headquartered in Berlin.',
    subcategory: 'advocacy', tags: ['nonprofit', 'germany'] },
  { name: 'Good Food Institute', city: 'Washington', country: 'United States', countryCode: 'us',
    address: 'Washington, DC',
    website: 'https://gfi.org',
    description: 'The Good Food Institute promotes plant-based, fermentation, and cultivated meat as alternatives to conventional animal agriculture. Headquartered in Washington DC.',
    subcategory: 'advocacy', tags: ['nonprofit', 'alternative_protein', 'usa'] },
  { name: 'Physicians Committee for Responsible Medicine', city: 'Washington', country: 'United States', countryCode: 'us',
    address: 'Washington, DC',
    website: 'https://www.pcrm.org',
    description: 'PCRM promotes preventive medicine and plant-based diets, with 17,000+ doctor members. Founded by Dr. Neal Barnard in 1985.',
    subcategory: 'advocacy', tags: ['nonprofit', 'health', 'usa'] },
  { name: 'Sea Shepherd Conservation Society', city: 'Friday Harbor', country: 'United States', countryCode: 'us',
    address: 'Friday Harbor, WA',
    website: 'https://www.seashepherdglobal.org',
    description: 'Sea Shepherd is a marine-conservation organisation known for direct action against illegal whaling, sealing, and industrial fishing.',
    subcategory: 'advocacy', tags: ['nonprofit', 'marine', 'usa'] },
  { name: 'Animal Outlook', city: 'Washington', country: 'United States', countryCode: 'us',
    address: 'Washington, DC',
    website: 'https://animaloutlook.org',
    description: 'Animal Outlook (formerly Compassion Over Killing) works to expose factory farming through undercover investigations. Headquartered in Washington DC.',
    subcategory: 'advocacy', tags: ['nonprofit', 'farm_animals', 'usa'] },
  { name: 'Vegan Outreach', city: 'Davis', country: 'United States', countryCode: 'us',
    address: 'Davis, CA',
    website: 'https://veganoutreach.org',
    description: 'Vegan Outreach distributes free pro-vegan literature to college students globally. Founded in 1993.',
    subcategory: 'advocacy', tags: ['nonprofit', 'outreach', 'usa'] },
  { name: 'Vegan Australia', city: 'Sydney', country: 'Australia', countryCode: 'au',
    address: 'Sydney, NSW',
    website: 'https://www.veganaustralia.org.au',
    description: 'Vegan Australia is a national charity advocating for ethical, environmental, and health benefits of veganism in Australia.',
    subcategory: 'advocacy', tags: ['nonprofit', 'australia'] },
  { name: 'Vegan Society of Aotearoa New Zealand', city: 'Auckland', country: 'New Zealand', countryCode: 'nz',
    address: 'Auckland',
    website: 'https://www.vegansociety.org.nz',
    description: 'The Vegan Society of Aotearoa New Zealand promotes veganism and provides resources for new vegans across NZ. Founded in the 1980s.',
    subcategory: 'advocacy', tags: ['nonprofit', 'new_zealand'] },
  { name: 'European Vegetarian Union', city: 'Brussels', country: 'Belgium', countryCode: 'be',
    address: 'Brussels',
    website: 'https://www.euroveg.eu',
    description: 'The European Vegetarian Union is the umbrella organisation for vegetarian and vegan societies across Europe. Manages the V-Label certification.',
    subcategory: 'advocacy', tags: ['nonprofit', 'certification', 'belgium'] },
  { name: 'Vegan Society of Canada', city: 'Toronto', country: 'Canada', countryCode: 'ca',
    address: 'Toronto, ON',
    website: 'https://vegansocietyofcanada.ca',
    description: 'Vegan Society of Canada offers vegan certification and education across Canada.',
    subcategory: 'advocacy', tags: ['nonprofit', 'canada', 'certification'] },
]

async function geocode(address: string, countryCode: string): Promise<{ lat: number; lng: number } | null> {
  await new Promise(r => setTimeout(r, 1200)) // be polite to Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=${countryCode}`
    const resp = await fetch(url, { headers: { 'User-Agent': 'PlantsPack/1.0 (admin@plantspack.com)' } })
    if (!resp.ok) return null
    const data = await resp.json() as any[]
    if (!data?.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

function slugify(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Admin user id
  const { data: admin } = await sb.from('users').select('id').eq('role', 'admin').limit(1).single()
  if (!admin) { console.error('no admin user'); process.exit(1) }

  // Existing slugs / names for dedup
  const { data: existing } = await sb.from('places').select('slug, name').is('archived_at', null)
  const existingSlugs = new Set((existing || []).map((r: any) => r.slug).filter(Boolean))
  const existingNames = new Set((existing || []).map((r: any) => (r.name || '').toLowerCase()))

  console.log(`existing places: ${existing?.length}, brands to add: ${BRANDS.length}\n`)

  let inserted = 0, skipped = 0
  for (const b of BRANDS) {
    if (existingNames.has(b.name.toLowerCase())) {
      console.log(`SKIP ${b.name} (name already exists)`); skipped++; continue
    }
    let slug = slugify(b.name)
    let i = 1
    while (existingSlugs.has(slug)) { slug = `${slugify(b.name)}-${++i}` }
    const geo = await geocode(b.address || `${b.city}, ${b.country}`, b.countryCode)
    if (!geo) { console.log(`FAIL geocode ${b.name}`); skipped++; continue }
    const { error } = await sb.from('places').insert({
      name: b.name,
      slug,
      city: b.city,
      country: b.country,
      address: b.address || `${b.city}, ${b.country}`,
      latitude: geo.lat,
      longitude: geo.lng,
      category: 'organisation',
      subcategory: b.subcategory,
      vegan_level: 'fully_vegan',
      website: b.website || null,
      description: b.description,
      tags: [...(b.tags || []), b.subcategory === 'brand_hq' ? 'brand_hq' : 'advocacy'],
      source: SOURCE,
      verification_status: 'approved',
      is_verified: true,
      created_by: admin.id,
    })
    if (error) {
      console.log(`FAIL insert ${b.name}: ${error.message}`); skipped++
    } else {
      console.log(`OK   ${b.name} (${b.city}, ${b.country}) /place/${slug}`); inserted++
      existingSlugs.add(slug); existingNames.add(b.name.toLowerCase())
    }
  }
  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}`)
  console.log('\nRefreshing directory_views...')
  const { error } = await sb.rpc('refresh_directory_views' as any)
  if (error) console.warn('refresh failed:', error.message); else console.log('refreshed')
}
main().catch(e => { console.error(e); process.exit(1) })
