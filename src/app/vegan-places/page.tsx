import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Globe, ArrowRight } from 'lucide-react'
import { getCountries } from '@/lib/directory-queries'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Vegan Places Directory - Find Vegan Restaurants & Stores | PlantsPack',
  description: 'Discover vegan and vegan-friendly restaurants, cafes, stores, stays, and sanctuaries worldwide. Community-verified directory across 130+ countries.',
  alternates: { canonical: 'https://plantspack.com/vegan-places' },
  openGraph: {
    title: 'Vegan Places Directory | PlantsPack',
    description: 'Find vegan-friendly restaurants, stores, and stays. Community-driven, free forever.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

const CONTINENTS: Record<string, string[]> = {
  'Europe': ['Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Faroe Islands','Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Moldova','Monaco','Montenegro','Netherlands','North Macedonia','Norway','Poland','Portugal','Romania','Russia','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Turkey','Ukraine','United Kingdom'],
  'North America': ['Canada','Costa Rica','Cuba','Dominican Republic','El Salvador','Guatemala','Honduras','Jamaica','Mexico','Nicaragua','Panama','Puerto Rico','Trinidad and Tobago','United States'],
  'South America': ['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','French Guiana','Guyana','Paraguay','Peru','Uruguay','Venezuela'],
  'Asia': ['Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Brunei','Cambodia','China','Georgia','Hong Kong','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon','Macao','Malaysia','Maldives','Mongolia','Myanmar','Nepal','Oman','Pakistan','Palestine','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Thailand','Turkey','United Arab Emirates','Uzbekistan','Vietnam'],
  'Oceania': ['Australia','Fiji','New Caledonia','New Zealand'],
  'Africa': ['Algeria','Botswana','Egypt','Ethiopia','Gabon','Ghana','Kenya','Madagascar','Mauritius','Morocco','Mozambique','Namibia','Nigeria','Reunion','Rwanda','Senegal','South Africa','Tanzania','Tunisia','Uganda','Zimbabwe'],
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

export default async function VeganPlacesPage() {
  const { countries, total } = await getCountries()

  // Group by continent
  const grouped: Record<string, any[]> = {}
  for (const country of countries) {
    const continent = getContinent(country.name)
    if (!grouped[continent]) grouped[continent] = []
    grouped[continent].push(country)
  }

  // Sort continents by total places, countries within each by place count
  const sortedContinents = Object.entries(grouped)
    .map(([name, cs]) => ({
      name,
      countries: cs.sort((a: any, b: any) => b.count - a.count),
      totalPlaces: cs.reduce((sum: number, c: any) => sum + c.count, 0),
    }))
    .sort((a, b) => b.totalPlaces - a.totalPlaces)

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-[1.1] mb-3">
            Find Vegan Places <span className="text-primary">Worldwide</span>
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-3">
            {total > 0
              ? <><strong className="text-on-surface">{total.toLocaleString()}</strong> vegan and vegan-friendly restaurants, cafes, stores, stays, and sanctuaries across {countries.length} countries.</>
              : <>Community-verified vegan restaurants, stores, and stays.</>
            }
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link href="/map" className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Globe className="h-4 w-4" /> Explore Map
            </Link>
            <Link href="/vegan-score" className="inline-flex items-center gap-2 ghost-border hover:bg-surface-container-low text-on-surface px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <MapPin className="h-4 w-4" /> City Ranks
            </Link>
          </div>
        </div>

        {/* Continents */}
        {sortedContinents.length > 0 ? (
          <div className="space-y-10">
            {sortedContinents.map(continent => (
              <div key={continent.name}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{CONTINENT_EMOJI[continent.name] || '🌐'}</span>
                  <h2 className="text-xl font-bold text-on-surface">{continent.name}</h2>
                  <span className="text-sm text-on-surface-variant ml-1">
                    {continent.totalPlaces.toLocaleString()} places · {continent.countries.length} countries
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {continent.countries.map((country: any) => (
                    <Link
                      key={country.slug}
                      href={`/vegan-places/${country.slug}`}
                      prefetch={false}
                      className="group flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl ghost-border hover:border-primary/20 transition-all hover:-translate-y-0.5"
                    >
                      <div>
                        <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors text-sm">
                          {country.name}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {country.count.toLocaleString()} {country.count === 1 ? 'place' : 'places'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-outline group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">Places are being added</h2>
            <p className="text-on-surface-variant mb-6">Check back soon or help by adding places.</p>
            <Link href="/map" className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-6 py-3 rounded-xl font-medium">
              <MapPin className="h-5 w-5" /> Add the first place
            </Link>
          </div>
        )}

        <div className="mt-10 text-center">
          <p className="text-sm text-on-surface-variant">
            Can&apos;t find your city? <Link href="/map" className="text-primary hover:underline">Add a place</Link> and help grow the directory.
          </p>
        </div>
      </div>
    </div>
  )
}
