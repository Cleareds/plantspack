// City-level "Best Vegan {dish} in {City}" hub page.
// URL: /vegan-places/{country}/{city}/best-vegan/
//
// Lives one level above the dish pages and exists so the intermediate
// segment is a useful crawlable landing page (was a 404 otherwise).
// Each dish chip links to the corresponding dish page; we surface up to
// 3 place thumbnails per dish as visual previews.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getCityDishChips, dishPageHref } from '@/lib/dish-page-data'
import { DISH_BY_SLUG, type DishDef } from '@/lib/dish-keywords'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const revalidate = 86400

// ISR opt-in. Without generateStaticParams a dynamic-segment route is
// fully DYNAMIC - `revalidate` above is silently ignored and every crawl
// bills a function render (discovered 2026-07-12: place pages were never
// cached; the region route, which has GSP, was the only ISR one).
// Returning [] prerenders nothing at build time; each URL is rendered on
// first request, then cached for the revalidate window.
export function generateStaticParams() {
  return []
}


const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

type RouteParams = { country: string; city: string }

async function loadCity(country: string, city: string) {
  // Resolve canonical city + country names from the DB
  const { data } = await sb.from('places')
    .select('city, country')
    .ilike('country', country.replace(/-/g, ' '))
    .ilike('city', city.replace(/-/g, ' '))
    .is('archived_at', null)
    .limit(1)
  if (!data?.[0]) return null
  return { city: data[0].city as string, country: data[0].country as string }
}

async function loadTopThumbsForDishes(country: string, city: string, dishSlugs: string[]) {
  // Pull all places once, then filter per dish for thumbnails
  const { data } = await sb.from('places')
    .select('id, slug, name, main_image_url, cuisine_types, subcategory, description, vegan_level, average_rating, review_count')
    .ilike('country', country.replace(/-/g, ' '))
    .ilike('city', city.replace(/-/g, ' '))
    .is('archived_at', null)
    .not('main_image_url', 'is', null)
    .limit(2000)
  const thumbsByDish: Record<string, { id: string; slug: string | null; name: string; img: string }[]> = {}
  for (const slug of dishSlugs) {
    const dish = DISH_BY_SLUG[slug]
    if (!dish) continue
    const matches: { id: string; slug: string | null; name: string; img: string; score: number }[] = []
    for (const p of data || []) {
      if (!p.main_image_url) continue
      const name = (p.name ?? '').toLowerCase()
      const cuisines = ((p.cuisine_types ?? []) as unknown[]).filter((c): c is string => typeof c === 'string').map(c => c.toLowerCase())
      const subcat = (p.subcategory ?? '').toLowerCase()
      let score = 0
      for (const n of dish.needles) {
        const needle = n.toLowerCase()
        if (name.includes(needle)) { score = 10; break }
        if (cuisines.some(c => c.includes(needle))) { score = Math.max(score, 6); continue }
        if (subcat === needle) { score = Math.max(score, 4); continue }
      }
      if (score >= (dish.specialised ? 6 : 4)) {
        // Bump by rating quality (Wilson-ish)
        const r = (p.average_rating ?? 0) * Math.log(1 + (p.review_count ?? 0))
        matches.push({ id: p.id, slug: p.slug, name: p.name, img: p.main_image_url, score: score + r })
      }
    }
    matches.sort((a, b) => b.score - a.score)
    thumbsByDish[slug] = matches.slice(0, 3).map(m => ({ id: m.id, slug: m.slug, name: m.name, img: m.img }))
  }
  return thumbsByDish
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { country, city } = await params
  const loc = await loadCity(country, city)
  if (!loc) return { title: 'Page not found', robots: { index: false } }
  const title = `Best Vegan Food in ${loc.city} - Guides by Dish | PlantsPack`
  const description = `Curated dish-by-dish guides to vegan food in ${loc.city}, ${loc.country}. Verified spots for pizza, donuts, ramen, burgers, and more - ranked by community trust.`
  return {
    title,
    description,
    alternates: { canonical: `https://www.plantspack.com/vegan-places/${country}/${city}/best-vegan` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://www.plantspack.com/vegan-places/${country}/${city}/best-vegan`,
      siteName: 'PlantsPack',
      images: OG_DEFAULT_IMAGES,
    },
  }
}

export default async function BestVeganHub({ params }: { params: Promise<RouteParams> }) {
  const { country, city } = await params
  const loc = await loadCity(country, city)
  if (!loc) notFound()

  const chips = await getCityDishChips(country, city)
  if (chips.length === 0) notFound()

  const thumbs = await loadTopThumbsForDishes(country, city, chips.map(c => c.slug))

  const ldBreadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Vegan places', url: 'https://www.plantspack.com/vegan-places' },
    { name: loc.country, url: `https://www.plantspack.com/vegan-places/${country}` },
    { name: loc.city, url: `https://www.plantspack.com/vegan-places/${country}/${city}` },
    { name: 'Best vegan food', url: `https://www.plantspack.com/vegan-places/${country}/${city}/best-vegan` },
  ])

  return (
    <div className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumbs) }} />

      <article className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Breadcrumb */}
        <nav className="text-sm text-on-surface-variant mb-4 flex items-center gap-1 flex-wrap">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>›</span>
          <Link href={`/vegan-places/${country}`} className="hover:text-primary capitalize">{loc.country}</Link>
          <span>›</span>
          <Link href={`/vegan-places/${country}/${city}`} className="hover:text-primary capitalize">{loc.city}</Link>
          <span>›</span>
          <span className="font-medium">Best vegan food</span>
        </nav>

        <h1 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight mb-3">
          Best Vegan Food in {loc.city}
        </h1>
        <p className="text-on-surface-variant text-base mb-8 leading-relaxed max-w-3xl">
          {chips.length} dish-specific guides for vegans in {loc.city}, {loc.country}. Each one is cross-referenced across HappyCow, venue websites and OpenStreetMap, then ranked by community trust and admin verification - not just popularity.
        </p>

        {/* Dish card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {chips.map(c => {
            const dishThumbs = thumbs[c.slug] || []
            const href = dishPageHref(country, city, c.slug)
            return (
              <Link
                key={c.slug}
                href={href}
                className="bg-surface-container-lowest rounded-xl overflow-hidden ghost-border hover:editorial-shadow transition-shadow flex flex-col"
              >
                {/* Thumbnail strip */}
                {dishThumbs.length > 0 ? (
                  <div className="grid grid-cols-3 gap-0.5 aspect-[4/2.4]">
                    {dishThumbs.map(t => (
                      <div key={t.id} className="relative bg-surface-container-low overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.img} alt={t.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-[4/2.4] bg-surface-container-low flex items-center justify-center text-on-surface-variant text-sm">
                    {c.count} spot{c.count === 1 ? '' : 's'}
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <h2 className="font-headline font-bold text-lg text-on-surface mb-1">
                    Best Vegan {c.label}
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    {c.count} verified spot{c.count === 1 ? '' : 's'} in {loc.city}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="border-t border-outline-variant/20 pt-6">
          <Link href={`/vegan-places/${country}/${city}`} className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Back to all vegan places in {loc.city}
          </Link>
        </div>

        <p className="text-xs text-on-surface-variant mt-8 leading-relaxed">
          Every place on these lists carries a confidence badge - Admin-checked, Community-added, Cross-referenced, or OSM-sourced. <Link href="/methodology" className="underline">Read how we verify</Link>.
        </p>
      </article>
    </div>
  )
}
