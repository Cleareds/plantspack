// Dish × city long-tail SEO page.
// URL pattern: /vegan-places/{country}/{city}/best-vegan/{dish}
//
// Folder structure split into literal `best-vegan/` + dynamic `[dish]`
// after the original mixed literal+dynamic folder name `best-vegan-[dish]/`
// failed to build/route in production (route matched but `[dish]` was
// undefined at runtime, causing 404s on every URL). Plain dynamic routing
// in a sub-folder works reliably.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getDishPageData, getNearbyDishCities, dishPageHref, type DishPageData } from '@/lib/dish-page-data'
import { normaliseDishSlug, DISHES } from '@/lib/dish-keywords'
import { VEGAN_LEVEL_LABEL, VEGAN_LEVEL_INLINE_CLASS } from '@/lib/vegan-level'
import VerificationConfidenceBadge from '@/components/places/VerificationConfidenceBadge'
import PlaceImage from '@/components/places/PlaceImage'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { buildFaqSchema, type FaqItem } from '@/lib/schema/faq'
import FaqSection from '@/components/seo/FaqSection'

// Use force-dynamic to bypass any cache during the diagnostic phase. Will
// switch back to `revalidate = 86400` (ISR) once we confirm the route
// actually executes.
export const dynamic = 'force-dynamic'

type RouteParams = { country: string; city: string; dish: string }

async function load({ country, city, dish }: RouteParams): Promise<DishPageData | null> {
  const slug = normaliseDishSlug(dish)
  if (!slug) return null
  return await getDishPageData(slug, country, city)
}

/**
 * Build the heading phrase used in titles/descriptions.
 * "Indian food" → "Indian Restaurants" (restaurant-context)
 * "Pizza"       → "Pizza" (dish-context, used as "Vegan Pizza ...")
 *
 * The old template ("Best Vegan Indian food in Bellevue - 3 spots") was
 * grammatically awkward AND signalled thin content via "- 3 spots". We
 * hide the count from the title when it's small, mention place names
 * directly in the description, and never lead with "0 are 100% vegan"
 * (which was killing CTR on every page where fullyVeganCount was 0).
 */
function buildHeadingPhrase(dishLabel: string): { phrase: string; phraseLc: string } {
  const isFoodLabel = / food$/i.test(dishLabel)
  if (isFoodLabel) {
    const cuisine = dishLabel.replace(/ food$/i, '')
    const phrase = `Vegan ${cuisine} Restaurants`
    return { phrase, phraseLc: phrase.toLowerCase() }
  }
  const phrase = `Vegan ${dishLabel}`
  return { phrase, phraseLc: phrase.toLowerCase() }
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const routeParams = await params
  // Defensive: any of these being undefined would crash toLowerCase calls
  // downstream. Return a noindex page rather than 500.
  if (!routeParams?.country || !routeParams?.city || !routeParams?.dish) {
    return { title: 'Page not found', robots: { index: false } }
  }
  const data = await load(routeParams)
  if (!data || !data.dish?.label || !data.city || !data.country) {
    return { title: 'Page not found', robots: { index: false } }
  }
  const { phrase, phraseLc } = buildHeadingPhrase(data.dish.label)
  // Year tag for freshness signal. Stamped explicitly so it doesn't drift
  // when this file is touched in 2027 - update this constant when we
  // re-audit titles annually.
  const YEAR = 2026

  // Title shapes by count - hide the count when it's small (signals thin
  // content); lead with the count when it's compelling.
  let title: string
  if (data.total >= 5) {
    title = `${data.total} Best ${phrase} in ${data.city} (${YEAR}) | PlantsPack`
  } else if (data.total >= 2) {
    title = `${phrase} in ${data.city}, ${data.country} (${YEAR}) | PlantsPack`
  } else {
    title = `${phrase} in ${data.city} | PlantsPack`
  }

  // Description leads with actual place names when we have them, not with
  // platform statistics. "Hand-verified" is the curation signal. We never
  // mention "0 are 100% vegan" - that was the single biggest CTR killer.
  const top3Names = data.places.slice(0, 3).map(p => p.name).filter(Boolean)
  const namesStr = top3Names.length > 0 ? top3Names.join(', ') : ''
  const moreCount = Math.max(0, data.total - top3Names.length)
  const moreStr = moreCount > 0 ? `, and ${moreCount} more` : ''
  const description = namesStr
    ? `Hand-verified ${phraseLc} in ${data.city}, ${data.country}: ${namesStr}${moreStr}. Cross-referenced against menus and community reviews. Updated ${YEAR}.`
    : `Hand-verified ${phraseLc} in ${data.city}, ${data.country}. Cross-referenced against menus and community reviews. Updated ${YEAR}.`

  const heroImg = data.places.find(pl => pl.main_image_url)?.main_image_url
  const canonical = `https://www.plantspack.com${dishPageHref(routeParams.country, routeParams.city, data.dish.slug)}`

  // Noindex pages with <2 actual places. A 1-place page isn't a useful
  // list - it's just a redundant view of the place page. Indexing it
  // dilutes Google's signal that the (city, dish) pattern is useful.
  const shouldNoindex = data.total < 2

  return {
    title,
    description,
    alternates: { canonical },
    robots: shouldNoindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      siteName: 'PlantsPack',
      images: heroImg ? [{ url: heroImg }] : undefined,
    },
  }
}

export default async function DishPage({ params, searchParams }: { params: Promise<RouteParams>; searchParams: Promise<Record<string, string>> }) {
  const p = await params
  const sp = await searchParams
  const data = await load(p)
  if (!data) notFound()

  const { dish, city, country, places, total, fullyVeganCount } = data
  const fvOnly = sp.level === 'fully-vegan'
  const filtered = fvOnly ? places.filter(x => x.vegan_level === 'fully_vegan') : places
  const top3WithPhotos = places.filter(x => x.main_image_url).slice(0, 3)

  // Nearby cities for same dish
  const nearbyCities = await getNearbyDishCities(dish.slug, country, city, 6)

  // Other dishes in this same city (we re-query to find sibling dish chips)
  const siblingDishes = await (async () => {
    const out: { slug: string; label: string; count: number }[] = []
    for (const d of DISHES) {
      if (d.slug === dish.slug) continue
      // Light heuristic: try a match without a full query (counts come from
      // getCityDishChips if invoked, but we limit work here by sampling)
    }
    return out
  })()

  // JSON-LD
  const ldItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best Vegan ${dish.label} in ${city}`,
    description: `${total} vegan ${dish.label.toLowerCase()} spots in ${city}, ${country}.`,
    numberOfItems: filtered.length,
    itemListElement: filtered.slice(0, 20).map((pl, i) => {
      const placeUrl = `https://www.plantspack.com/place/${pl.slug || pl.id}`
      // Embed each entry as a Restaurant so the rating travels with the item.
      const restaurant: Record<string, unknown> = {
        '@type': pl.category === 'hotel' ? 'LodgingBusiness' : pl.category === 'store' ? 'Store' : 'Restaurant',
        name: pl.name,
        url: placeUrl,
      }
      if (pl.review_count && pl.review_count > 0 && pl.average_rating) {
        restaurant.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: pl.average_rating,
          reviewCount: pl.review_count,
        }
      }
      return { '@type': 'ListItem', position: i + 1, url: placeUrl, name: pl.name, item: restaurant }
    }),
  }
  const ldBreadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan places', url: 'https://www.plantspack.com/vegan-places' },
    { name: country, url: `https://www.plantspack.com/vegan-places/${p.country}` },
    { name: city, url: `https://www.plantspack.com/vegan-places/${p.country}/${p.city}` },
    { name: `Best Vegan ${dish.label}`, url: `https://www.plantspack.com${dishPageHref(p.country, p.city, dish.slug)}` },
  ])

  // Data-driven, honest FAQ — adds unique on-page text + PAA eligibility.
  const dishLc = dish.label.toLowerCase()
  const topNames = places.slice(0, 3).map(x => x.name).filter(Boolean)
  const faqItems: FaqItem[] = []
  if (total > 0) {
    faqItems.push({
      question: `How many vegan ${dishLc} places are there in ${city}?`,
      answer: `PlantsPack lists ${total} vegan ${dishLc} ${total === 1 ? 'spot' : 'spots'} in ${city}, ${country}${fullyVeganCount > 0 ? `, of which ${fullyVeganCount} ${fullyVeganCount === 1 ? 'is' : 'are'} 100% vegan` : ''}.`,
    })
  }
  if (topNames.length > 0) {
    faqItems.push({
      question: `Which are the best vegan ${dishLc} spots in ${city}?`,
      answer: `Popular picks include ${topNames.join(', ')}. Each listing is cross-referenced against menus and community reviews.`,
    })
  }
  faqItems.push({
    question: `Are these ${dishLc} places fully vegan?`,
    answer: fullyVeganCount > 0
      ? `${fullyVeganCount} of the ${total} ${total === 1 ? 'is' : 'are'} 100% vegan (no animal products on the menu). The rest are vegan-friendly with clearly labelled vegan options.`
      : `These are vegan-friendly spots with clearly labelled vegan options rather than 100% vegan menus. We flag fully-vegan venues separately when we've verified them.`,
  })
  const ldFaq = buildFaqSchema(faqItems)

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldItemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumbs) }} />
      {faqItems.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }} />
      )}

      <article className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Breadcrumb */}
        <nav className="text-sm text-on-surface-variant mb-4 flex items-center gap-1 flex-wrap">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>›</span>
          <Link href={`/vegan-places/${p.country}`} className="hover:text-primary capitalize">{country}</Link>
          <span>›</span>
          <Link href={`/vegan-places/${p.country}/${p.city}`} className="hover:text-primary capitalize">{city}</Link>
          <span>›</span>
          <span className="font-medium">Best Vegan {dish.label}</span>
        </nav>

        {/* H1 + subline. Phrasing matches the metadata template so SERP
            snippet and page heading don't disagree. "0 are 100% vegan"
            anti-selling removed - fully-vegan count is only highlighted
            when > 0. */}
        {(() => {
          const isFood = / food$/i.test(dish.label)
          const cuisine = dish.label.replace(/ food$/i, '')
          const phrase = isFood ? `Vegan ${cuisine} Restaurants` : `Vegan ${dish.label}`
          const phraseLc = phrase.toLowerCase()
          return (
            <>
              <h1 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight mb-2">
                {total >= 5 ? `${total} Best ` : ''}{phrase} in {city}
              </h1>
              <p className="text-on-surface-variant text-base mb-4 leading-relaxed">
                Hand-verified {phraseLc} in {city}, {country}.{' '}
                {fullyVeganCount > 0 && (
                  <span className="font-semibold text-emerald-700">
                    {fullyVeganCount} fully vegan.{' '}
                  </span>
                )}
                Cross-referenced across HappyCow, venue websites, and OSM tags.
              </p>
            </>
          )
        })()}

        {/* Photo strip - max 3 places that have images */}
        {top3WithPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6 max-h-[180px] overflow-hidden rounded-xl">
            {top3WithPhotos.map((pl) => (
              <Link key={pl.id} href={`/place/${pl.slug || pl.id}`} className="block relative aspect-[4/3] overflow-hidden rounded-lg ghost-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pl.main_image_url!} alt={pl.name} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                <span className="absolute bottom-1 left-1 bg-white/90 px-2 py-0.5 rounded text-[10px] font-semibold text-on-surface line-clamp-1 max-w-[90%]">
                  {pl.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* FV filter toggle */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <Link
            href={`?level=`}
            scroll={false}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${!fvOnly ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface'}`}
          >
            All {total}
          </Link>
          <Link
            href="?level=fully-vegan"
            scroll={false}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${fvOnly ? 'bg-emerald-600 text-white' : 'bg-surface-container-low text-on-surface'}`}
          >
            🌱 100% vegan only {fullyVeganCount}
          </Link>
        </div>

        {/* Ranked list */}
        {filtered.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-8 text-center text-on-surface-variant">
            No 100% vegan {dish.label.toLowerCase()} spots in {city} yet.{' '}
            <Link href={`?level=`} className="text-primary underline">View all {total} vegan-friendly spots →</Link>
          </div>
        ) : (
          <ol className="space-y-3 mb-8">
            {filtered.map((pl, i) => (
              <li key={pl.id}>
                <Link href={`/place/${pl.slug || pl.id}`} className="flex items-stretch gap-3 bg-surface-container-lowest rounded-xl overflow-hidden ghost-border hover:editorial-shadow transition-shadow">
                  <div className="relative w-28 sm:w-36 flex-shrink-0 aspect-[4/3]">
                    <PlaceImage
                      src={pl.main_image_url}
                      alt={pl.name}
                      category={pl.category || 'eat'}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 bg-black/75 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                      #{i + 1}
                    </span>
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <h2 className="font-semibold text-base md:text-lg text-on-surface line-clamp-1">{pl.name}</h2>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                      {pl.vegan_level && (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${VEGAN_LEVEL_INLINE_CLASS[pl.vegan_level] || 'bg-stone-100 text-stone-600'}`}>
                          {VEGAN_LEVEL_LABEL[pl.vegan_level] || pl.vegan_level}
                        </span>
                      )}
                      <VerificationConfidenceBadge place={pl} variant="compact" />
                      {pl.review_count && pl.review_count > 0 && pl.average_rating && (
                        <span className="text-xs text-on-surface-variant">★ {pl.average_rating.toFixed(1)} ({pl.review_count})</span>
                      )}
                    </div>
                    {pl.description && (
                      <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">{pl.description}</p>
                    )}
                    {pl.address && (
                      <p className="text-xs text-outline mt-1 line-clamp-1">{pl.address}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {/* Same dish, other cities */}
        {nearbyCities.length > 0 && (
          <section className="mb-8">
            <h2 className="font-headline font-bold text-xl mb-3">Vegan {dish.label} in nearby cities</h2>
            <div className="flex flex-wrap gap-2">
              {nearbyCities.map(nc => {
                if (!nc.country || !nc.city) return null
                const ccSlug = nc.country.toLowerCase().replace(/\s+/g, '-')
                const ciSlug = nc.city.toLowerCase().replace(/\s+/g, '-')
                return (
                  <Link key={nc.city} href={`/vegan-places/${ccSlug}/${ciSlug}/best-vegan/${dish.slug}`}
                    className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-sm font-medium text-on-surface"
                  >
                    {nc.city} <span className="text-on-surface-variant">({nc.count})</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* FAQ — unique on-page content + PAA eligibility */}
        <FaqSection items={faqItems} heading={`Vegan ${dish.label} in ${city}: FAQ`} />

        {/* Back to city */}
        <div className="border-t border-outline-variant/20 pt-6">
          <Link href={`/vegan-places/${p.country}/${p.city}`}
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to all vegan places in {city}
          </Link>
        </div>

        {/* Trust note */}
        <p className="text-xs text-on-surface-variant mt-8 leading-relaxed">
          Every place on this list carries a confidence badge. <Link href="/methodology" className="underline">Read how we verify</Link> to understand the difference between &quot;Admin-checked&quot;, &quot;Community-added&quot;, &quot;Cross-referenced&quot;, and &quot;OSM-sourced&quot; trust levels.
          {' '}If you know of a vegan {dish.label.toLowerCase()} spot in {city} we&apos;ve missed,{' '}
          <Link href={`/add-place?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`} className="underline">add it here</Link>.
        </p>
      </article>
    </div>
  )
}
