import { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import PlaceImage from '@/components/places/PlaceImage'
import { VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'
import { MapPin, ChefHat } from 'lucide-react'

// 60s SSR cache + SWR. Search-result pages should be indexable but not
// over-cached — content changes as places get added or archived.
export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ q?: string; vl?: string; cat?: string }>
}

interface PlaceRow {
  id: string
  slug: string
  name: string
  city: string | null
  country: string | null
  vegan_level: string | null
  category: string | null
  main_image_url: string | null
  average_rating: number | null
  review_count: number | null
  rank: number
}

interface CityRow {
  city: string
  country: string
  city_slug: string
  country_slug: string
  place_count: number
  fully_vegan_count: number
}

interface RecipeRow {
  id: string
  slug: string | null
  title: string
  image_url: string | null
}

const VL_LABEL: Record<string, string> = {
  fully_vegan: 'Fully vegan',
  mostly_vegan: 'Mostly vegan',
  vegan_friendly: 'Vegan-friendly',
  vegan_options: 'Vegan options',
}

const CATEGORY_LABEL: Record<string, string> = {
  eat: 'Restaurant', store: 'Store', hotel: 'Stay', organisation: 'Organisation', event: 'Event',
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams
  const q = (sp.q || '').trim()
  if (!q) {
    return {
      title: 'Search — PlantsPack',
      description: 'Search 50,000+ vegan and vegan-friendly places across 10,000+ cities in 160+ countries.',
      alternates: { canonical: 'https://www.plantspack.com/search' },
    }
  }
  const title = `"${q}" — Vegan places matching your search | PlantsPack`
  const description = `Search results for "${q}" across vegan and vegan-friendly places, cities, and recipes on PlantsPack.`
  const canonical = `https://www.plantspack.com/search?q=${encodeURIComponent(q)}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    robots: { index: true, follow: true },
  }
}

// Heuristic facet detector — used purely to surface visible "chips" to
// the user (e.g. when they search "vegan bakery berlin" we want to show
// that Berlin and bakery are being interpreted as filters). The actual
// RPC handles ranking; this is UX feedback.
function detectFacets(q: string): { city?: string; category?: string; vl?: string } {
  const lowered = q.toLowerCase()
  const facets: { city?: string; category?: string; vl?: string } = {}
  const categoryHints: Record<string, string> = {
    bakery: 'eat', café: 'eat', cafe: 'eat', restaurant: 'eat', diner: 'eat',
    pizzeria: 'eat', ramen: 'eat', burger: 'eat',
    hotel: 'hotel', stay: 'hotel', 'b&b': 'hotel', hostel: 'hotel',
    shop: 'store', store: 'store', market: 'store', grocery: 'store',
    sanctuary: 'organisation',
  }
  for (const [word, cat] of Object.entries(categoryHints)) {
    if (lowered.includes(word)) { facets.category = cat; break }
  }
  if (/(100% vegan|fully vegan)/.test(lowered)) facets.vl = 'fully_vegan'
  else if (/mostly vegan/.test(lowered)) facets.vl = 'mostly_vegan'
  return facets
}

async function runSearch(q: string, vl: string | null, cat: string | null) {
  if (!q || q.length < 2) return { places: [] as PlaceRow[], cities: [] as CityRow[], recipes: [] as RecipeRow[] }
  const sb = createAdminClient()
  const [placesRes, citiesRes, recipesRes] = await Promise.all([
    sb.rpc('search_places', { q, vl, cat, near_lat: null, near_lng: null, result_limit: 40 }),
    sb.rpc('search_cities', { q, vl, result_limit: 12 }),
    sb.rpc('search_recipes', { q, result_limit: 10 }),
  ])
  return {
    places: (placesRes.data || []) as PlaceRow[],
    cities: (citiesRes.data || []) as CityRow[],
    recipes: (recipesRes.data || []) as RecipeRow[],
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const q = (sp.q || '').trim()
  const vl = sp.vl || null
  const cat = sp.cat || null

  const facets = q ? detectFacets(q) : {}
  const { places, cities, recipes } = await runSearch(q, vl, cat)

  // ItemList JSON-LD for AI search / Google ItemList preview.
  const itemListJsonLd = places.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Search results for "${q}"`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.plantspack.com/place/${p.slug}`,
      name: p.name,
    })),
  } : null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',   item: 'https://www.plantspack.com/' },
      { '@type': 'ListItem', position: 2, name: 'Search', item: 'https://www.plantspack.com/search' },
      ...(q ? [{ '@type': 'ListItem', position: 3, name: `"${q}"`, item: `https://www.plantspack.com/search?q=${encodeURIComponent(q)}` }] : []),
    ],
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <h1 className="text-2xl sm:text-3xl font-semibold text-on-surface mb-2">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Search PlantsPack'}
      </h1>
      {q && (
        <p className="text-sm text-on-surface-variant mb-4">
          {places.length} {places.length === 1 ? 'place' : 'places'} · {cities.length} {cities.length === 1 ? 'city' : 'cities'} · {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
        </p>
      )}

      {/* P1 — inferred facet chips */}
      {q && (facets.category || facets.vl) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {facets.category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <ChefHat className="h-3 w-3" /> {CATEGORY_LABEL[facets.category] || facets.category}
            </span>
          )}
          {facets.vl && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {VL_LABEL[facets.vl] || facets.vl}
            </span>
          )}
        </div>
      )}

      <form className="mb-8" method="get" action="/search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Find vegan ramen in Tokyo, bakery in Berlin, Bodhi Leuven..."
          className="w-full px-4 py-3 bg-surface-container-low rounded-lg ghost-border focus:ring-2 focus:ring-primary text-base"
          aria-label="Search PlantsPack"
        />
      </form>

      {!q && (
        <p className="text-on-surface-variant text-sm">Type a place, city, cuisine, or recipe above to search.</p>
      )}

      {q && places.length === 0 && cities.length === 0 && recipes.length === 0 && (
        <div className="bg-surface-container-low rounded-xl p-6 text-center">
          <p className="text-on-surface mb-2">Nothing matched &ldquo;{q}&rdquo;.</p>
          <p className="text-sm text-on-surface-variant mb-4">
            Try a broader term, or a city name. If the place exists but isn&apos;t listed yet:
          </p>
          <Link
            href="/map?add=true"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90"
          >
            Add a missing place
          </Link>
        </div>
      )}

      {cities.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-on-surface mb-3">Cities</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cities.map((c) => {
              const countrySlug = c.country_slug || slugifyCityOrCountry(c.country)
              return (
                <li key={`${c.city_slug}-${c.country}`}>
                  <Link
                    href={`/vegan-places/${countrySlug}/${c.city_slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{c.city}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {c.country} · {c.place_count} {c.place_count === 1 ? 'place' : 'places'}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {places.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-on-surface mb-3">Places</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {places.map((p) => (
              <li key={p.id} className="rounded-xl overflow-hidden bg-surface-container-low hover:bg-surface-container transition-colors">
                <Link href={`/place/${p.slug}`} className="block">
                  <div className="aspect-[16/10] bg-surface-container">
                    <PlaceImage
                      src={p.main_image_url || null}
                      alt={p.name}
                      category={p.category || 'eat'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-on-surface line-clamp-1">{p.name}</p>
                    <p className="text-xs text-on-surface-variant line-clamp-1">
                      {[p.city, p.country].filter(Boolean).join(', ')}
                    </p>
                    {p.vegan_level && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                        {VL_LABEL[p.vegan_level] || p.vegan_level}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipes.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-on-surface mb-3">Recipes</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recipes.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/recipe/${r.slug || r.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <ChefHat className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-sm font-medium text-on-surface line-clamp-2">{r.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
