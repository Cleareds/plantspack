import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Globe, ArrowRight, TrendingUp } from 'lucide-react'
import { getCountries } from '@/lib/directory-queries'
import { createAdminClient } from '@/lib/supabase-admin'
import { loadCityImages } from '@/lib/city-images-server'
import { getCountryThumbnail } from '@/lib/city-images'
import FilteredCount, { FilteredTotal, FilteredLabel } from '@/components/ui/FilteredCount'
import GlobalAddPlaceButton from '@/components/places/GlobalAddPlaceButton'
import RecentlyAddedSection from '@/components/ui/RecentlyAddedSection'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vegan Places Directory Worldwide — Restaurants, Stores, Stays | PlantsPack',
  description: 'Browse 37,000+ vegan and vegan-friendly restaurants, shops, stays, and sanctuaries across 170+ countries and 1,000+ cities. Community-verified with ratings, opening hours, and reviews.',
  alternates: { canonical: 'https://plantspack.com/vegan-places' },
  openGraph: {
    title: 'Vegan Places Directory — Worldwide | PlantsPack',
    description: 'Browse 37,000+ vegan and vegan-friendly places across 170+ countries. Community-verified, ad-free, free to use.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

// Country names include common synonyms (Czechia / Czech Republic, Ivory
// Coast / Côte d'Ivoire) so DB rows under either form sort to the right
// continent without a data migration.
const CONTINENTS: Record<string, string[]> = {
  'Europe': ['Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czechia','Czech Republic','Denmark','Estonia','Faroe Islands','Finland','France','Germany','Gibraltar','Greece','Guernsey','Hungary','Iceland','Ireland','Isle of Man','Italy','Jersey','Kosovo','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Moldova','Monaco','Montenegro','Netherlands','North Macedonia','Norway','Poland','Portugal','Romania','Russia','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Turkey','Ukraine','United Kingdom'],
  'North America': ['Antigua and Barbuda','Aruba','Bahamas','Barbados','Belize','Bermuda','Canada','Cayman Islands','Costa Rica','Cuba','Curacao','Dominica','Dominican Republic','El Salvador','Guatemala','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Puerto Rico','Saint Kitts and Nevis','Saint Martin','St Martins','Trinidad and Tobago','United States'],
  'South America': ['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','French Guiana','Guyana','Paraguay','Peru','Uruguay','Venezuela'],
  'Asia': ['Abkhazia','Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Bhutan','Brunei','Cambodia','China','Georgia','Hong Kong','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon','Macao','Malaysia','Maldives','Mongolia','Myanmar','Nepal','Oman','Pakistan','Palestine','Palestinian Territories','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Tajikistan','Thailand','Turkey','Turkmenistan','United Arab Emirates','Uzbekistan','Vietnam'],
  'Oceania': ['Australia','Federated States of Micronesia','Fiji','Guam','New Caledonia','New Zealand'],
  'Africa': ['Algeria','Angola','Benin','Botswana','Cabo Verde','Cameroon','Chad','Congo-Brazzaville','Côte d\'Ivoire','Democratic Republic of the Congo','Egypt','Ethiopia','Gabon','Ghana','Ivory Coast','Kenya','Lesotho','Libya','Madagascar','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Reunion','Rwanda','Senegal','Seychelles','Somaliland','South Africa','Tanzania','The Gambia','Togo','Tunisia','Uganda','Zambia','Zimbabwe'],
}

const CONTINENT_EMOJI: Record<string, string> = {
  'Europe': '🇪🇺', 'North America': '🌎', 'South America': '🌎',
  'Asia': '🌏', 'Oceania': '🌏', 'Africa': '🌍',
}

function getContinent(countryName: string): string {
  for (const [continent, countries] of Object.entries(CONTINENTS)) {
    if (countries.includes(countryName)) return continent
  }
  return 'Other'
}

async function getRecentlyAdded() {
  const supabase = createAdminClient()
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const base = supabase
    .from('places')
    .select('id, name, slug, city, country, category, main_image_url, vegan_level', { count: 'exact' })
    .is('archived_at', null)
    .gte('created_at', oneMonthAgo)
    .in('source', ['user', 'user_submission', 'web_research'])
    .not('main_image_url', 'is', null)
    .order('created_at', { ascending: false })

  // Fetch both all-places (for display cards + total count) and fully-vegan count in parallel
  const [allResult, fvResult] = await Promise.all([
    base.limit(12),
    supabase
      .from('places')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .gte('created_at', oneMonthAgo)
      .in('source', ['user', 'user_submission', 'web_research'])
      .eq('vegan_level', 'fully_vegan'),
  ])

  const places = allResult.data || []
  return {
    places,
    count: allResult.count || 0,
    fullyVeganCount: fvResult.count || 0,
    fullyVeganPlaces: places.filter((p: any) => p.vegan_level === 'fully_vegan'),
  }
}

// Get top city per country for thumbnails
async function getTopCityPerCountry(): Promise<Record<string, string>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('directory_cities')
    .select('city, country')
    .order('place_count', { ascending: false })
    .limit(2000)

  const result: Record<string, string> = {}
  for (const row of data || []) {
    if (!result[row.country]) result[row.country] = row.city
  }
  return result
}

export default async function VeganPlacesPage() {
  const [{ countries, total }, cityImages, recentData, topCityMap] = await Promise.all([
    getCountries(),
    loadCityImages(),
    getRecentlyAdded(),
    getTopCityPerCountry(),
  ])

  const { places: recentPlaces, count: recentCount, fullyVeganCount: recentFvCount, fullyVeganPlaces: recentFvPlaces } = recentData
  const totalFv = countries.reduce((s: number, c: any) => s + (c.stats?.fullyVegan || 0), 0)

  // Group by continent
  const grouped: Record<string, any[]> = {}
  for (const country of countries) {
    const continent = getContinent(country.name)
    if (!grouped[continent]) grouped[continent] = []
    grouped[continent].push(country)
  }

  // 'Other' (unmapped country names like mojibake / city-as-country bad
  // data) is always pinned to the bottom regardless of place count.
  const sortedContinents = Object.entries(grouped)
    .map(([name, cs]) => ({
      name,
      countries: cs.sort((a: any, b: any) => b.count - a.count),
      totalPlaces: cs.reduce((sum: number, c: any) => sum + c.count, 0),
      totalFv: cs.reduce((sum: number, c: any) => sum + (c.stats?.fullyVegan || 0), 0),
    }))
    .sort((a, b) => {
      if (a.name === 'Other' && b.name !== 'Other') return 1
      if (b.name === 'Other' && a.name !== 'Other') return -1
      return b.totalPlaces - a.totalPlaces
    })

  // Popular destinations — top 6 countries
  const popularDestinations = countries.slice(0, 6)

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-[1.1] mb-3">
            Find Vegan Places <span className="text-primary">Worldwide</span>
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-3">
            <strong className="text-on-surface"><FilteredTotal total={total} fullyVegan={totalFv} /></strong> <FilteredLabel allLabel="vegan and vegan-friendly" veganLabel="fully vegan" /> restaurants, cafes, stores, stays, and sanctuaries across {countries.length} countries.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link href="/map" className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Globe className="h-4 w-4" /> Explore Map
            </Link>
            <Link href="/city-ranks" className="inline-flex items-center gap-2 ghost-border hover:bg-surface-container-low text-on-surface px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <TrendingUp className="h-4 w-4" /> City Ranks
            </Link>
          </div>
        </div>

        {/* Popular Destinations */}
        {popularDestinations.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-on-surface mb-4">Popular Destinations</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {popularDestinations.map((country: any) => {
                const img = getCountryThumbnail(cityImages, country.name, topCityMap[country.name])
                return (
                  <Link key={country.slug} href={`/vegan-places/${country.slug}`} prefetch={false}
                    className="group rounded-xl overflow-hidden ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5 bg-surface-container-lowest">
                    {img ? (
                      <div className="relative h-24 overflow-hidden">
                        <img src={img} alt={country.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <p className="absolute bottom-2 left-2.5 text-white font-semibold text-sm drop-shadow">{country.name}</p>
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center bg-surface-container-low">
                        <p className="font-semibold text-sm text-on-surface">{country.name}</p>
                      </div>
                    )}
                    <div className="px-2.5 py-2">
                      <p className="text-[10px] text-on-surface-variant">
                        <FilteredCount total={country.count} fullyVegan={country.stats?.fullyVegan} /> · {country.stats?.cityCount || 0} cities
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Recently Added — client component so the count + cards respond to the vegan toggle */}
        {recentCount > 0 && (
          <RecentlyAddedSection
            allPlaces={recentPlaces}
            allCount={recentCount}
            fullyVeganPlaces={recentFvPlaces}
            fullyVeganCount={recentFvCount}
          />
        )}

        {/* Continents */}
        {sortedContinents.length > 0 && (
          <div className="space-y-10">
            {sortedContinents.map(continent => (
              <div key={continent.name}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{CONTINENT_EMOJI[continent.name] || '🌐'}</span>
                  <h2 className="text-xl font-bold text-on-surface">{continent.name}</h2>
                  <span className="text-sm text-on-surface-variant ml-1">
                    <FilteredTotal total={continent.totalPlaces} fullyVegan={continent.totalFv} /> places · {continent.countries.length} countries
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {continent.countries.map((country: any) => {
                    const img = getCountryThumbnail(cityImages, country.name, topCityMap[country.name])
                    return (
                      <Link key={country.slug} href={`/vegan-places/${country.slug}`} prefetch={false}
                        className="group flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5">
                        {img ? (
                          <img src={img} alt={country.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-surface-container-low flex items-center justify-center text-lg flex-shrink-0">🌍</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors text-sm truncate">
                            {country.name}
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">
                            <FilteredCount total={country.count} fullyVegan={country.stats?.fullyVegan} /> · {country.stats?.cityCount || 0} cities · {country.stats?.fullyVegan || 0} fully vegan
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-outline group-hover:text-primary transition-colors flex-shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <p className="text-sm text-on-surface-variant">
            Can&apos;t find your city? <GlobalAddPlaceButton className="text-primary hover:underline inline"><>Add a place</></GlobalAddPlaceButton> and help grow the directory.
          </p>
        </div>
      </div>
    </div>
  )
}
