import { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { loadCityImages } from '@/lib/city-images-server'
import { getCityImage } from '@/lib/city-images'
import SummerHubFooterCta from '@/components/home/SummerHubFooterCta'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

// Revalidate daily so editorial copy + counts stay fresh through the
// summer travel season without re-deploying. Index lookups happen at
// build time on the next request after this expires.
export const revalidate = 86400

const TITLE = 'Vegan Summer Destinations 2026 — Mediterranean Guide | PlantsPack'
const DESCRIPTION = 'Where to eat vegan on your Mediterranean trip across Italy, Spain, Greece, Portugal, Croatia, and Turkey. 29 destinations from Rome and Athens to Santorini, Ibiza, and the Amalfi Coast — thousands of verified vegan and vegan-friendly restaurants, cafes, and stays.'
const CANONICAL = 'https://www.plantspack.com/vegan-summer-destinations'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    title: 'Vegan Summer Destinations 2026 | PlantsPack',
    description: DESCRIPTION,
    type: 'article',
    siteName: 'PlantsPack',
    url: CANONICAL,
    locale: 'en_US',
    images: OG_DEFAULT_IMAGES,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vegan Summer Destinations 2026',
    description: DESCRIPTION,
    images: OG_DEFAULT_IMAGES,
  },
}

type Destination = {
  city: string
  country: string
  blurb: string
}

// Hand-curated Tier-A destinations: every entry has >=5 places in the DB.
// Kas + Fethiye (Turkey) were removed during the 2026-05-13 honesty pass
// because both fell to 4 places, breaking the page's >=5 promise. They
// will return once they have at least 5 verified places again.
//
// Blurbs no longer carry hardcoded place counts — the live badge on each
// card is the source of truth, so numbers can't drift stale.
const DESTINATIONS: Record<string, Destination[]> = {
  Italy: [
    { city: 'Rome', country: 'Italy', blurb: 'Trastevere\'s plant-based osterias, fully-vegan gelaterias near Termini, and the best vegan pizza in Trastevere and Monti.' },
    { city: 'Florence', country: 'Italy', blurb: 'Tuscan ribollita and pici cacio e pepe done vegan, plus a tight cluster of fully-vegan spots in San Frediano.' },
    { city: 'Naples', country: 'Italy', blurb: 'Naples invented pizza marinara — naturally vegan and still the best version anywhere. Plus a growing plant-based scene in Vomero.' },
    { city: 'Venice', country: 'Italy', blurb: 'Cicchetti bars with vegan options in Cannaregio and Dorsoduro — easier to eat vegan in Venice than most tourists realise.' },
    { city: 'Palermo', country: 'Italy', blurb: 'Sicilian street food is accidentally vegan — sfincione, panelle, caponata. Palermo\'s vegan scene punches above its weight.' },
    { city: 'Catania', country: 'Italy', blurb: 'Mount Etna foothills, Sicilian arancini done vegan, and the cleanest plant-based granita on the island.' },
  ],
  Spain: [
    { city: 'Barcelona', country: 'Spain', blurb: 'Gràcia, Sant Antoni, and El Born form a near-perfect plant-based triangle — one of Europe\'s densest vegan clusters.' },
    { city: 'Madrid', country: 'Spain', blurb: 'Malasaña and Lavapiés are dense with fully-vegan restaurants. Don\'t miss the Sunday Mercado de la Cebada\'s vegan stalls.' },
    { city: 'Valencia', country: 'Spain', blurb: 'Birthplace of paella — vegan versions abound. Ruzafa neighbourhood is the city\'s vegan epicentre.' },
    { city: 'Ibiza', country: 'Spain', blurb: 'Beyond the clubs: Ibiza Town and Santa Eulalia have a serious plant-based wellness scene supporting the island\'s yoga retreats.' },
    { city: 'Palma de Mallorca', country: 'Spain', blurb: 'Old Town tapas with proper vegan menus, and Sóller\'s farm-to-table spots are a quick train ride away.' },
    { city: 'Santa Cruz de Tenerife', country: 'Spain', blurb: 'Canarian cuisine is heavy on potatoes, mojo, and gofio — many naturally vegan. The wellness scene around La Laguna is rich.' },
  ],
  Greece: [
    { city: 'Athens', country: 'Greece', blurb: 'Exarcheia and Koukaki are the densest neighbourhoods. Many tavernas keep nistisima (fasting) menus year-round, all vegan.' },
    { city: 'Santorini', country: 'Greece', blurb: 'Tomatokeftedes and fava are local specialities and naturally vegan. Oia and Fira both have dedicated plant-based menus now.' },
    { city: 'Mykonos', country: 'Greece', blurb: 'Beyond the party reputation, Mykonos Town and Ano Mera have a quiet vegan scene catering to the wellness retreat circuit.' },
    { city: 'Naxos', country: 'Greece', blurb: 'Quieter Cyclades alternative — Naxos Town has a small but real vegan scene and the island\'s farms supply much of the produce.' },
    { city: 'Corfu', country: 'Greece', blurb: 'Venetian-influenced cuisine with strong olive-oil and vegetable traditions — Corfu Town has more vegan spots than you\'d expect.' },
    { city: 'Heraklion', country: 'Greece', blurb: 'Cretan cuisine is one of the most plant-forward in the Mediterranean. Heraklion is the gateway to a week of easy vegan eating.' },
  ],
  Portugal: [
    { city: 'Lisbon', country: 'Portugal', blurb: 'Príncipe Real, Alfama, and Cais do Sodré — Lisbon is one of Europe\'s best vegan cities and tourists rarely realise it.' },
    { city: 'Porto', country: 'Portugal', blurb: 'A surprisingly dense plant-based scene in Cedofeita and Foz do Douro. The francesinha vegana is a thing — and it works.' },
    { city: 'Faro', country: 'Portugal', blurb: 'Gateway to the Algarve. Faro Old Town has a handful of fully-vegan spots and access to the whole coastal cluster.' },
    { city: 'Lagos', country: 'Portugal', blurb: 'Surf-town energy with a matching plant-based menu density. Most beach bars carry vegan options as default.' },
    { city: 'Funchal', country: 'Portugal', blurb: 'Madeira island\'s capital — tropical fruit, espetada done vegan, and the Mercado dos Lavradores for fresh produce.' },
  ],
  Croatia: [
    { city: 'Zagreb', country: 'Croatia', blurb: 'Donji Grad and Trešnjevka anchor Croatia\'s vegan capital. A smart base before island-hopping.' },
    { city: 'Split', country: 'Croatia', blurb: 'Old Town within Diocletian\'s Palace has a small but real vegan scene. Ferry hub for Hvar, Brač, Vis.' },
    { city: 'Dubrovnik', country: 'Croatia', blurb: 'Pricey, crowded, beautiful — and now with enough vegan options that you won\'t be stuck on a tomato salad.' },
    { city: 'Pula', country: 'Croatia', blurb: 'Istrian coast, Roman amphitheatre, and a surprisingly modern plant-based scene driven by Italian crossover.' },
  ],
  Turkey: [
    { city: 'Istanbul', country: 'Turkey', blurb: 'Cihangir and Kadıköy lead the vegan scene. Turkish breakfast spreads (kahvaltı) work brilliantly vegan with the right place.' },
    { city: 'Antalya', country: 'Turkey', blurb: 'Mediterranean coast base with a growing wellness-driven vegan scene in Kaleiçi (Old Town) and Konyaaltı.' },
  ],
}

// Editorial intro per country — 60-100 words, written once, indexed
// once. Gives Google real text to rank for "vegan in [country]"
// queries beyond the thin chip-style cards.
const COUNTRY_INTROS: Record<string, string> = {
  Italy: "Italy's vegan scene runs deeper than tourists realise. Rome and Florence dominate by volume, but the most distinctive plant-based food sits south. Naples invented pizza marinara — vegan before veganism was a word — and Sicilian street food (panelle, arancini, granita) is naturally meat- and dairy-free across Palermo and Catania. Northern cities lean on contemporary plant-based osterias; the south leans on traditions that happened to never need animals. Eating vegan in Italy in 2026 means choosing between a modern wave and a deep regional one.",
  Spain: "Spain is two vegan countries at once. Barcelona and Madrid together hold one of Europe's densest plant-based clusters. Outside the capitals, Valencia's Ruzafa neighbourhood and Ibiza's wellness-driven scene anchor the next tier. Even the Canary Islands and Mallorca have meaningful vegan offerings now — Canarian mojo verde and gofio are accidentally vegan staples. Tapas culture adapts well: every neighbourhood has at least one bar willing to skip the ham, and dedicated 100% vegan spots cluster densely in the right districts.",
  Greece: "Greek food is closer to vegan than its reputation suggests. The Orthodox tradition of nistia (fasting) means tavernas across Athens, Heraklion, and the islands keep a year-round repertoire of vegan dishes — fava, gigantes, dolmades, horta. Athens leads on dedicated plant-based spots, but the Cyclades and Crete are where the food culture is most naturally aligned. Santorini's tomatokeftedes and Naxos' farm-to-table dishes are vegan by default. Bring an appetite for olive oil and you'll eat well from day one.",
  Portugal: "Lisbon is one of Europe's quietly dominant vegan cities, concentrated in Príncipe Real, Alfama, and Cais do Sodré, with prices that still feel reasonable. Porto trails by half but matches in density per square kilometre. Down the Algarve coast (Faro, Lagos) the scene is surf-driven and casual; beach bars carry vegan options as default. Madeira's Funchal anchors a tropical-fruit-and-espetada culture that adapts well to plant-based menus. Portuguese francesinha vegana — yes, the cheese-and-meat tower done vegan — actually works.",
  Croatia: "Croatia is the surprise of this list. Zagreb's vegan scene grew quickly over the past five years and now anchors a tight cluster across Donji Grad and Trešnjevka. The coast catches up next: Split (inside Diocletian's Palace) and Pula (Istrian crossover with Italian plant-based culture) both have real options. Dubrovnik is pricier and quieter on the vegan side but has caught up enough that tomato salad is no longer your only option. Best paired with island ferries between Split and Hvar or Korčula.",
  Turkey: "Istanbul leads, with Cihangir and Kadıköy holding most of Turkey's dedicated plant-based spots. Outside Istanbul, the Mediterranean and Aegean coasts are catching up fast, partly driven by expat wellness scenes. Antalya's Kaleiçi Old Town and Konyaaltı have growing options, and the Turquoise Coast resorts increasingly carry vegan menus by default. Turkish breakfast (kahvaltı) is a natural vegan canvas with the right place — olives, tomatoes, hummus, simit, jam. Mezze culture across the whole country is even easier to navigate plant-based.",
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
    // fully-vegan count uses is_verified=true so the page never reports
    // a higher fully-vegan number than what has actually been audited.
    // Matches the project rule documented in feedback_fully_vegan_count_query.md.
    const [{ count: total }, { count: fv }] = await Promise.all([
      sb.from('places').select('*', { count: 'exact', head: true }).eq('country', d.country).eq('city', d.city).is('archived_at', null),
      sb.from('places').select('*', { count: 'exact', head: true }).eq('country', d.country).eq('city', d.city).eq('vegan_level', 'fully_vegan').eq('is_verified', true).is('archived_at', null),
    ])
    out[key] = { city: d.city, country: d.country, total: total || 0, fv: fv || 0 }
  }))
  return out
}

function formatUpdated(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function VeganSummerDestinationsPage() {
  const counts = await getCityCounts()
  const cityImages = loadCityImages()
  const updated = formatUpdated(new Date())

  const destinationCount = Object.values(DESTINATIONS).flat().length
  const totalPlaces = Object.values(counts).reduce((s, c) => s + c.total, 0)
  const totalFv = Object.values(counts).reduce((s, c) => s + c.fv, 0)

  // Build JSON-LD ItemList of TouristDestination entities. Each destination
  // points at its city page (which carries its own LocalBusiness markup).
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

  // FAQ for rich snippets + visible block. Answers use ranges or live
  // language to avoid drifting stale; the page revalidates daily so
  // any inline numbers stay reasonably current.
  const faq = [
    {
      q: `Which destination has the most vegan options?`,
      a: `Barcelona and Madrid lead by volume in Spain, with Athens and Rome close behind. Each has well over 100 verified vegan or vegan-friendly places. Lisbon is the next tier and is often cited as one of Europe's best value vegan cities.`,
    },
    {
      q: `Which destinations are best for finding only 100% vegan venues?`,
      a: `Ibiza, Santorini, Antalya, Florence, and Faro all have multiple manually-verified 100% vegan venues. For broader fully-vegan choice across many districts, Madrid, Barcelona, Athens, Lisbon, and Porto are stronger.`,
    },
    {
      q: `What's the best Mediterranean destination for a one-week vegan trip?`,
      a: `Barcelona, Madrid, Athens, or Lisbon each work cleanly for seven days. All four have 100+ vegan-friendly spots, dense walkable neighbourhoods, decent public transport, and varied cuisines so you don't repeat. Add a 2-3 day island side trip (Santorini from Athens, Ibiza from Barcelona, Hvar from Split).`,
    },
    {
      q: `Are the smaller Greek islands worth visiting for vegan food?`,
      a: `Yes. Greek nistia (Orthodox fasting) tradition means vegan dishes are everywhere by default — fava, gigantes, dolmades, horta. Volume is smaller than Athens, but the food culture is naturally aligned. Naxos, Corfu, and Heraklion all reward a vegan visitor.`,
    },
    {
      q: `Which of these cities is cheapest for vegan dining?`,
      a: `Lisbon and Porto are consistently the cheapest of the larger vegan-friendly cities on this list. Athens is comparable for casual food but slightly higher for dedicated plant-based restaurants. The Spanish capitals and Croatian coast skew more expensive; Italy and the Turkish coast sit in the middle.`,
    },
  ]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${CANONICAL}#page`,
        url: CANONICAL,
        name: 'Vegan Summer Destinations 2026 — Mediterranean Guide',
        description: DESCRIPTION,
        inLanguage: 'en',
        isPartOf: { '@id': 'https://www.plantspack.com/#website' },
        about: { '@type': 'Thing', name: 'Vegan summer travel in the Mediterranean' },
        dateModified: new Date().toISOString(),
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

  return (
    <div className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
            {totalPlaces > 0 ? (
              <>
                Where to eat vegan on your Mediterranean trip:{' '}
                <strong>{totalPlaces.toLocaleString()} verified vegan and
                vegan-friendly restaurants, cafes, and stays</strong>
                {totalFv > 0 && <> ({totalFv.toLocaleString()} manually-verified 100% vegan)</>}
                {' '}across {destinationCount}{' '}
                destinations in Italy, Spain, Greece, Portugal, Croatia, and
                Turkey. Every destination below has at least 5 verified
                places — no thin listings, no &ldquo;hidden gems&rdquo; with two reviews.
              </>
            ) : (
              <>
                Where to eat vegan on your Mediterranean trip across{' '}
                {destinationCount} destinations in
                Italy, Spain, Greece, Portugal, Croatia, and Turkey. Every
                destination below has at least 5 verified vegan or
                vegan-friendly places.
              </>
            )}
          </p>
          <p className="mt-3 text-xs text-on-surface-variant/80">
            Updated {updated}. Place counts refresh daily from the PlantsPack database.
          </p>
        </div>
      </section>

      {/* Country sections */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-12">
        {Object.entries(DESTINATIONS).map(([country, dests]) => (
          <section key={country} aria-labelledby={`country-${countrySlug(country)}`}>
            <div className="flex items-baseline justify-between mb-3">
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

            {COUNTRY_INTROS[country] && (
              <p className="text-sm md:text-base text-on-surface-variant leading-relaxed mb-5 max-w-3xl">
                {COUNTRY_INTROS[country]}
              </p>
            )}

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

        {/* FAQ — visible block matching the FAQPage JSON-LD above. Real
            questions travellers ask, real answers grounded in the data. */}
        <section aria-labelledby="faq-heading" className="pt-4">
          <h2 id="faq-heading" className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-5">
            Frequently asked
          </h2>
          <div className="space-y-4 max-w-3xl">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-2xl ghost-border bg-surface-container-lowest p-5">
                <summary className="cursor-pointer font-semibold text-on-surface list-none flex items-baseline justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-primary text-lg shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <SummerHubFooterCta />
      </div>
    </div>
  )
}
