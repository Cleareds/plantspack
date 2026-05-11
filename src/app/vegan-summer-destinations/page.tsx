import { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { loadCityImages } from '@/lib/city-images-server'
import { getCityImage } from '@/lib/city-images'

// Revalidate daily so editorial copy + counts stay fresh through the
// summer travel season without re-deploying. Index lookups happen at
// build time on the next request after this expires.
export const revalidate = 86400

const TITLE = 'Vegan Summer Destinations in Europe 2026 — Mediterranean Vegan Travel Guide | PlantsPack'
const DESCRIPTION = 'Where to eat vegan on your summer trip across Italy, Spain, Greece, Portugal, Croatia, and Turkey. 27 Mediterranean destinations with verified vegan and vegan-friendly spots — restaurants, beach cafes, and stays.'
const CANONICAL = 'https://www.plantspack.com/vegan-summer-destinations'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  // Temporarily noindex while the summer-sprint data cleanup is in flight
  // (image backfill, missing destinations, metadata polish). follow:true so
  // Google still crawls the internal links to city pages from here. Flip to
  // index:true once Day 5 polish is shipped.
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  openGraph: {
    title: 'Vegan Summer Destinations Europe 2026 | PlantsPack',
    description: DESCRIPTION,
    type: 'article',
    siteName: 'PlantsPack',
    url: CANONICAL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vegan Summer Destinations Europe 2026',
    description: DESCRIPTION,
  },
}

type Destination = {
  city: string
  country: string
  blurb: string
  // Optional explicit citySlug when the URL slug differs from a simple
  // lowercase of the city name (handled by the existing route helper).
}

// Hand-curated Tier-A destinations: every entry has >=5 places in the DB
// as of 2026-05-11 so the linked city page is content-rich, not thin.
// Order within each country: famous-first → niche, biased toward queries
// with the strongest summer-tourism intent.
const DESTINATIONS: Record<string, Destination[]> = {
  Italy: [
    { city: 'Rome', country: 'Italy', blurb: 'Trastevere\'s plant-based osterias, fully-vegan gelaterias near Termini, and the best vegan pizza in Trastevere and Monti.' },
    { city: 'Florence', country: 'Italy', blurb: 'Tuscan ribollita and pici cacio e pepe done vegan, plus a tight cluster of fully-vegan spots in San Frediano.' },
    { city: 'Naples', country: 'Italy', blurb: 'Naples invented pizza marinara — naturally vegan and still the best version anywhere. Plus growing plant-based scene in Vomero.' },
    { city: 'Venice', country: 'Italy', blurb: 'Cicchetti bars with vegan options in Cannaregio and Dorsoduro — easier to eat vegan in Venice than most tourists realise.' },
    { city: 'Palermo', country: 'Italy', blurb: 'Sicilian street food is accidentally vegan — sfincione, panelle, caponata. Palermo\'s vegan scene punches above its weight.' },
    { city: 'Catania', country: 'Italy', blurb: 'Mount Etna foothills, Sicilian arancini done vegan, and the cleanest plant-based granita on the island.' },
  ],
  Spain: [
    { city: 'Barcelona', country: 'Spain', blurb: '265 vegan and vegan-friendly spots — Gràcia, Sant Antoni, and El Born form a near-perfect plant-based triangle.' },
    { city: 'Madrid', country: 'Spain', blurb: 'Malasaña and Lavapiés are dense with fully-vegan restaurants. Don\'t miss the Sunday Mercado de la Cebada\'s vegan stalls.' },
    { city: 'Valencia', country: 'Spain', blurb: 'Birthplace of paella — vegan versions abound. Ruzafa neighbourhood is the city\'s vegan epicentre.' },
    { city: 'Ibiza', country: 'Spain', blurb: 'Beyond the clubs: Ibiza Town and Santa Eulalia have a serious plant-based wellness scene supporting the island\'s yoga retreats.' },
    { city: 'Palma de Mallorca', country: 'Spain', blurb: 'Old Town tapas with proper vegan menus, and Sóller\'s farm-to-table spots are a quick train ride away.' },
    { city: 'Santa Cruz de Tenerife', country: 'Spain', blurb: 'Canarian cuisine is heavy on potatoes, mojo, and gofio — many naturally vegan. The wellness scene around La Laguna is rich.' },
  ],
  Greece: [
    { city: 'Athens', country: 'Greece', blurb: '140 vegan and vegan-friendly places — Exarcheia and Koukaki are the densest. Many tavernas keep nistisima (fasting) menus year-round, all vegan.' },
    { city: 'Santorini', country: 'Greece', blurb: 'Tomatokeftedes and fava are local specialities and naturally vegan. Oia and Fira both have dedicated plant-based menus now.' },
    { city: 'Mykonos', country: 'Greece', blurb: 'Beyond the party reputation, Mykonos Town and Ano Mera have a quiet vegan scene catering to the wellness retreat circuit.' },
    { city: 'Corfu', country: 'Greece', blurb: 'Venetian-influenced cuisine with strong olive-oil and vegetable traditions — Corfu Town has more vegan spots than you\'d expect.' },
    { city: 'Heraklion', country: 'Greece', blurb: 'Cretan cuisine is one of the most plant-forward in the Mediterranean. Heraklion is the gateway to a week of easy vegan eating.' },
  ],
  Portugal: [
    { city: 'Lisbon', country: 'Portugal', blurb: '113 spots across Príncipe Real, Alfama, and Cais do Sodré — Lisbon is one of Europe\'s best vegan cities and tourists rarely realise it.' },
    { city: 'Porto', country: 'Portugal', blurb: 'A surprisingly dense plant-based scene in Cedofeita and Foz do Douro. The francesinha vegana is a thing — and it works.' },
    { city: 'Faro', country: 'Portugal', blurb: 'Gateway to the Algarve. Faro Old Town has a handful of fully-vegan spots and access to the whole coastal cluster.' },
    { city: 'Lagos', country: 'Portugal', blurb: 'Surf-town energy with a matching plant-based menu density. Most beach bars carry vegan options as default.' },
    { city: 'Funchal', country: 'Portugal', blurb: 'Madeira island\'s capital — tropical fruit, espetada done vegan, and the Mercado dos Lavradores for fresh produce.' },
  ],
  Croatia: [
    { city: 'Zagreb', country: 'Croatia', blurb: '21 places across Donji Grad and Trešnjevka. Croatia\'s vegan capital, and a smart base before island-hopping.' },
    { city: 'Split', country: 'Croatia', blurb: 'Old Town within Diocletian\'s Palace has a small but real vegan scene. Ferry hub for Hvar, Brač, Vis.' },
    { city: 'Dubrovnik', country: 'Croatia', blurb: 'Pricey, crowded, beautiful — and now with enough vegan options that you won\'t be stuck on a tomato salad.' },
    { city: 'Pula', country: 'Croatia', blurb: 'Istrian coast, Roman amphitheatre, and a surprisingly modern plant-based scene driven by Italian crossover.' },
  ],
  Turkey: [
    { city: 'Istanbul', country: 'Turkey', blurb: '76 spots — Cihangir and Kadıköy lead the vegan scene. Turkish breakfast spreads (kahvaltı) work brilliantly vegan with the right place.' },
    { city: 'Antalya', country: 'Turkey', blurb: 'Mediterranean coast base with a growing wellness-driven vegan scene in Kaleiçi (Old Town) and Konyaaltı.' },
    { city: 'Kas', country: 'Turkey', blurb: 'Small Lycian-coast town with a disproportionately strong vegan offering — diving, hiking, and proper plant-based cafes.' },
  ],
}

function citySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function countrySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

type CityCount = { city: string; country: string; total: number; fv: number }

async function getCityCounts(): Promise<Record<string, CityCount>> {
  const sb = createAdminClient()
  const all = Object.values(DESTINATIONS).flat()
  const out: Record<string, CityCount> = {}
  await Promise.all(all.map(async (d) => {
    const key = `${d.city}|||${d.country}`
    const [{ count: total }, { count: fv }] = await Promise.all([
      sb.from('places').select('*', { count: 'exact', head: true }).eq('country', d.country).eq('city', d.city),
      sb.from('places').select('*', { count: 'exact', head: true }).eq('country', d.country).eq('city', d.city).eq('vegan_level', 'fully_vegan'),
    ])
    out[key] = { city: d.city, country: d.country, total: total || 0, fv: fv || 0 }
  }))
  return out
}

export default async function VeganSummerDestinationsPage() {
  const counts = await getCityCounts()
  const cityImages = loadCityImages()

  // Build JSON-LD ItemList of TouristDestination entities. Each destination
  // points at its city page (which carries its own LocalBusiness markup).
  // This page sits one layer up as the curated tourism guide.
  const itemListEntries = Object.values(DESTINATIONS).flat().map((d, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'TouristDestination',
      name: `${d.city}, ${d.country}`,
      description: d.blurb,
      url: `https://www.plantspack.com/vegan-places/${countrySlug(d.country)}/${citySlug(d.city)}`,
    },
  }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${CANONICAL}#page`,
        url: CANONICAL,
        name: 'Vegan Summer Destinations in Europe 2026',
        description: DESCRIPTION,
        inLanguage: 'en',
        isPartOf: { '@id': 'https://www.plantspack.com/#website' },
        about: { '@type': 'Thing', name: 'Vegan summer travel in the Mediterranean' },
      },
      {
        '@type': 'ItemList',
        '@id': `${CANONICAL}#itemlist`,
        name: 'Vegan Summer Destinations 2026',
        numberOfItems: itemListEntries.length,
        itemListElement: itemListEntries,
      },
    ],
  }

  const totalPlaces = Object.values(counts).reduce((s, c) => s + c.total, 0)
  const totalFv = Object.values(counts).reduce((s, c) => s + c.fv, 0)

  return (
    <div className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-surface to-surface">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
          <p className="text-xs md:text-sm uppercase tracking-widest text-primary font-semibold mb-3">
            Summer 2026 · Mediterranean
          </p>
          <h1 className="font-headline text-3xl md:text-5xl font-bold leading-tight text-on-surface mb-4">
            Vegan Summer Destinations in Europe
          </h1>
          <p className="text-base md:text-lg text-on-surface-variant leading-relaxed max-w-3xl">
            Planning a Mediterranean trip this summer? Here&apos;s where eating vegan is
            easy across {Object.keys(DESTINATIONS).length} countries and{' '}
            {Object.values(DESTINATIONS).flat().length} destinations. Every spot
            below has at least 5 verified vegan or vegan-friendly places — no
            ghost listings, no &quot;hidden gems&quot; with two reviews.
            {totalPlaces > 0 && (
              <>
                {' '}Total across this guide:{' '}
                <strong>{totalPlaces.toLocaleString()} places</strong>
                {totalFv > 0 && <> ({totalFv} fully vegan)</>}.
              </>
            )}
          </p>
          {/* Intentionally no hero CTAs — the destination cards below are the
              natural action. Forced CTAs at the top of an editorial hub feel
              salesy and the alternatives ("save destinations", "open map")
              promised features that don't apply to this page. */}
        </div>
      </section>

      {/* Country sections */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-12">
        {Object.entries(DESTINATIONS).map(([country, dests]) => (
          <section key={country} aria-labelledby={`country-${countrySlug(country)}`}>
            <div className="flex items-baseline justify-between mb-5">
              <h2
                id={`country-${countrySlug(country)}`}
                className="font-headline text-2xl md:text-3xl font-bold text-on-surface"
              >
                {country}
              </h2>
              <Link
                href={`/vegan-places/${countrySlug(country)}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                See all of {country} →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dests.map((d) => {
                const key = `${d.city}|||${d.country}`
                const c = counts[key]
                const img = getCityImage(cityImages, d.city, d.country)
                const href = `/vegan-places/${countrySlug(d.country)}/${citySlug(d.city)}`
                return (
                  <Link
                    key={key}
                    href={href}
                    className="group block rounded-2xl ghost-border editorial-shadow overflow-hidden bg-surface hover:shadow-lg transition-all"
                  >
                    <div className="relative h-40 md:h-44 bg-surface-variant">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={`${d.city}, ${d.country}`}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 silk-gradient" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-headline font-bold text-lg leading-tight">{d.city}</span>
                          {c && c.total > 0 && (
                            <span className="text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                              {c.total} spots{c.fv > 0 ? ` · ${c.fv} fully vegan` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed p-4">
                      {d.blurb}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}

        {/* Footer CTA */}
        <section className="mt-12 rounded-2xl bg-primary/8 px-6 py-8 md:px-10 md:py-12 text-center">
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-3">
            Found a great vegan spot on your trip?
          </h2>
          <p className="text-on-surface-variant max-w-xl mx-auto mb-5">
            Help future travellers by adding it. Every entry on PlantsPack is free —
            we don&apos;t take paid listings, and we don&apos;t run ads.
          </p>
          <Link
            href="/auth?mode=signup"
            data-event="cta_click_signup"
            data-cta="create_account"
            data-from="summer_hub_footer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary-btn rounded-xl text-sm font-bold hover:opacity-90 transition-all"
          >
            Create a free account
          </Link>
        </section>
      </div>
    </div>
  )
}
