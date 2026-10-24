'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { MapPin, PawPrint, ExternalLink, Phone, Clock, Globe, Navigation, ChevronLeft, ChevronRight, Map } from 'lucide-react'
// Leaflet + markercluster (~40 KB gz) only load when the map mounts.
const CityMap = dynamic(() => import('./CityMap'), { ssr: false })
import { useInView } from '@/lib/hooks/use-in-view'
import RatingBadge from './RatingBadge'
import PlaceImage from './PlaceImage'
import AddPlaceButton from './AddPlaceButton'
import SavePlaceButton from './SavePlaceButton'
import { useVeganFilter } from '@/lib/vegan-filter-context'
import { Plus } from 'lucide-react'
import { sanitizeDescription } from '@/lib/places/sanitize-description'
import { VEGAN_LEVEL_LABEL, VEGAN_LEVEL_INLINE_CLASS, veganLevelOrder } from '@/lib/vegan-level'
import VerificationConfidenceBadge from './VerificationConfidenceBadge'
import { CITY_LIST_PAGE_SIZE, categoriesOfLight, type LightPlace, type ListSummary, type FacetCounts } from '@/lib/city-list-light'
import { openStatus, openLabel } from '@/shared/opening-hours'
import { nowIn, hoursStringOf } from '@/lib/open-now'

const CATEGORY_LABELS: Record<string, string> = {
  eat: 'Eat',
  hotel: 'Stay',
  store: 'Store',
  event: 'Event',
  organisation: 'Animal Sanctuary',
  other: 'Other',
}

const SUBCATEGORY_LABELS: Record<string, Record<string, string>> = {
  eat: { restaurant: 'Restaurant', cafe: 'Cafe', fast_food: 'Fast Food', bar: 'Bar/Pub', bakery: 'Bakery', ice_cream: 'Ice Cream' },
  store: { grocery: 'Grocery', bakery: 'Bakery', health_food: 'Health Food', specialty: 'Specialty', other_shop: 'Other' },
  hotel: { hotel: 'Hotel', hostel: 'Hostel', bnb: 'B&B', retreat: 'Retreat', other_stay: 'Other' },
}

const VEGAN_LEVEL_FILTERS = [
  { value: null, label: 'All Levels' },
  { value: 'fully_vegan', label: '100% Vegan' },
  { value: 'mostly_vegan', label: 'Mostly Vegan' },
  { value: 'vegan_friendly', label: 'Vegan-Friendly' },
  { value: 'vegan_options', label: 'Has Options' },
]

interface Place {
  id: string
  slug: string | null
  name: string
  category: string
  subcategory: string | null
  address: string
  description: string | null
  images: string[]
  main_image_url: string | null
  average_rating: number
  review_count: number
  is_pet_friendly: boolean
  website: string | null
  phone: string | null
  opening_hours: Record<string, string> | null
  google_place_id: string | null
  latitude: number
  longitude: number
  vegan_level: string | null
  cuisine_types: string[] | null
  verification_level?: number | null
  verification_method?: string | null
  last_verified_at?: string | null
  is_verified?: boolean | null
  source?: string | null
  created_by?: string | null
  tags?: string[] | null
}

// A list row is at least a LightPlace (enough to filter, sort, count and map).
// Hubs pass light rows for the whole city plus `initialFull` cards for the
// default first page; the rest of the cards load per page from
// /api/places/cards. Callers that still pass full rows keep working.
type ListPlace = LightPlace & Partial<Omit<Place, keyof LightPlace>>
type CityPlacesListProps = {
  /** Light rows for every place. Optional: hubs pass `summary` + `lightSrc` instead. */
  places?: ListPlace[]
  allPlaces?: ListPlace[]
  /** Full cards for the default first page (server-rendered). */
  initialFull?: Place[]
  /** Facet counts for the pills, so the default view needs no rows. */
  summary?: ListSummary
  /** URL of /api/places/light for this city or country; rows load from here on the first interaction. */
  lightSrc?: string
  cityName?: string
  countryName?: string
  /** IANA zone of the city. Enables the "Open now" filter and card labels; absent on country pages. */
  timeZone?: string | null
}
const isFullRow = (p: ListPlace): p is Place => p.address !== undefined

// useSearchParams() makes a statically rendered (ISR) page bail out to client
// rendering for this whole subtree, so the hub HTML shipped with NO place cards:
// non-JS crawlers (GPTBot, ClaudeBot, PerplexityBot) saw only the name index and
// the late-mounting list caused the big hub CLS. The hub renders
// <CityPlacesListView searchParams={null} /> as the Suspense fallback, so the
// server HTML carries the default view (first page, vegan-first sort).
export default function CityPlacesList(props: CityPlacesListProps) {
  const searchParams = useSearchParams()
  return <CityPlacesListView {...props} searchParams={searchParams} />
}

export function CityPlacesListView({ places, allPlaces, initialFull, summary, lightSrc, cityName, countryName, timeZone, searchParams }: CityPlacesListProps & { searchParams: { get(name: string): string | null; toString(): string } | null }) {
  // Full card data by id: what the server sent for page 1, plus whatever
  // the client fetched since. Rows passed in full count too.
  const [fullById, setFullById] = useState<Record<string, Place>>(() => {
    const m: Record<string, Place> = {}
    for (const p of initialFull || []) m[p.id] = p
    for (const p of places || []) if (isFullRow(p)) m[p.id] = p
    return m
  })
  // Light rows for the whole city / country. Hubs do not embed them any more
  // (Berlin: 1,801 rows = 1.15 MB of RSC payload): the default view renders
  // from `initialFull` + `summary`, and the rows load from `lightSrc` the
  // first time the visitor filters, sorts, pages or scrolls to the map.
  const [loadedRows, setLoadedRows] = useState<ListPlace[] | null>(null)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsWanted, setRowsWanted] = useState(false)
  // `places` is the SSR-filtered list (e.g. FV-only on /fully-vegan).
  // `allPlaces` is the unfiltered universe — needed so the pill counts
  // ("Mostly Vegan (3)", "Vegan-Friendly (24)") show the real cross-tier
  // numbers instead of zeros when the page is server-filtered to one tier.
  const rows: ListPlace[] | null = loadedRows ?? places ?? null
  const rowsForCounts: ListPlace[] | null = loadedRows ?? allPlaces ?? places ?? null
  const hasRows = rows !== null
  const { isFullyVeganOnly } = useVeganFilter()
  const router = useRouter()
  const pathname = usePathname()

  // Read filters from URL params
  const activeCategory = searchParams?.get('category') || null
  const activeSubcategory = searchParams?.get('sub') || null
  const petOnly = searchParams?.get('pet') === '1'
  // "Open now" needs the city's zone (the viewer may be elsewhere) and the
  // current minute, which only exists on the client: null until mounted.
  const openNowEnabled = !!timeZone
  const openOnly = openNowEnabled && searchParams?.get('open') === '1'
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    if (!openNowEnabled) return
    const tick = () => setNow(nowIn(timeZone))
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 60_000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [openNowEnabled, timeZone])
  const hoursOf = (p: ListPlace): string | null => p.hours ?? hoursStringOf(p.opening_hours)
  const isOpenNow = (p: ListPlace): boolean => !!now && openStatus(hoursOf(p), now).state === 'open'
  // /<city>/fully-vegan and ?vl=fully_vegan are equivalent. The path-based
  // form is the canonical URL (a real route segment that server-filters to
  // fully_vegan). Detect both so the UI shows the same active pill regardless.
  const isOnFvPath = pathname?.endsWith('/fully-vegan') ?? false
  const rawVl = searchParams?.get('vl') || null
  const activeVeganLevel = isOnFvPath ? 'fully_vegan' : rawVl

  // URL conflict resolution (was server-side when the hubs read searchParams;
  // the hubs are static now, so the client owns it): ?vl=fully_vegan on the
  // base URL -> canonical /fully-vegan path; /fully-vegan?vl=<other> -> honour
  // the explicit ?vl= on the base URL.
  useEffect(() => {
    if (!pathname || !rawVl) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (!isOnFvPath && rawVl === 'fully_vegan') {
      params.delete('vl')
      const qs = params.toString()
      router.replace(`${pathname}/fully-vegan${qs ? '?' + qs : ''}`, { scroll: false })
    } else if (isOnFvPath && rawVl !== 'fully_vegan') {
      const qs = params.toString()
      router.replace(`${pathname.replace(/\/fully-vegan$/, '')}${qs ? '?' + qs : ''}`, { scroll: false })
    }
  }, [pathname, rawVl, isOnFvPath, searchParams, router])
  // Default: fully-vegan places first, then by rating, then by name. A Lemmy
  // reviewer rightly pointed out that alphabetical default put Bojangles (a
  // chicken chain that shouldn't be here anyway) at the top. Now vegan-first
  // is the baseline; alphabetical stays available as a toggle.
  const sortBy = (searchParams?.get('sort') as 'name' | 'rating' | 'vegan') || 'vegan'
  const PAGE_SIZE = CITY_LIST_PAGE_SIZE
  const currentPage = parseInt(searchParams?.get('page') || '1') || 1

  // The server-rendered default view is page 1, vegan-first, no filters
  // (the /fully-vegan path counts as default: its `initialFull` is FV-only).
  // Anything else needs the rows.
  const isDefaultView = !activeCategory && !activeSubcategory && !petOnly && !openOnly && sortBy === 'vegan' && currentPage <= 1 && !isFullyVeganOnly && (!rawVl || isOnFvPath)
  const needRows = !hasRows && !!lightSrc && (!isDefaultView || rowsWanted)
  useEffect(() => {
    if (!needRows || rowsLoading) return
    let cancelled = false
    setRowsLoading(true)
    fetch(lightSrc!)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled && Array.isArray(j?.places)) setLoadedRows(j.places as ListPlace[]) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRowsLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRows, lightSrc])
  const ensureRows = useCallback(() => setRowsWanted(true), [])

  // Update URL params — alphabetical order for consistency.
  // Special vl handling so the canonical /<city>/fully-vegan URL is used:
  //   - vl=fully_vegan -> navigate to /<basePath>/fully-vegan, drop ?vl
  //   - vl=null/other  -> strip /fully-vegan suffix from basePath, then add ?vl=<value>
  const setFilter = useCallback((updates: Record<string, string | null>) => {
    const basePath = (pathname || '').replace(/\/fully-vegan$/, '')
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (!('page' in updates)) params.delete('page')

    const vlChange = 'vl' in updates ? updates.vl : undefined  // undefined = not part of this update
    const goingToFv = vlChange === 'fully_vegan'
    const targetPath = goingToFv ? `${basePath}/fully-vegan` : basePath

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'vl') {
        // The path encodes vl=fully_vegan, so we never need ?vl=fully_vegan.
        if (value === 'fully_vegan' || value === null || value === '') params.delete('vl')
        else params.set('vl', value)
        continue
      }
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }

    const sorted = new URLSearchParams([...params.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    const qs = sorted.toString()
    router.replace(`${targetPath}${qs ? '?' + qs : ''}`, { scroll: false })
  }, [searchParams, router, pathname])

  // A place has a primary `category`, and may declare extra roles as
  // `also:<category>` tags (hybrid venues — e.g. a shop that is also a
  // restaurant). categoriesOf returns every category a place counts under,
  // so it shows up in each of those category filters.
  const categoriesOf = categoriesOfLight

  // Faceted-count predicates: each pill's count reflects every OTHER active
  // filter but not its own facet. Lets users see how many places they'd land
  // on if they swapped a value within the same facet.
  const matchCategory = (p: ListPlace, cat: string | null) => !cat || categoriesOf(p).includes(cat)
  const matchSubcategory = (p: ListPlace, sub: string | null) => !sub || p.subcategory === sub
  const matchPet = (p: ListPlace) => !petOnly || p.is_pet_friendly
  const matchVeganLevel = (p: ListPlace) => !activeVeganLevel || p.vegan_level === activeVeganLevel
  const matchOpen = (p: ListPlace) => !openOnly || isOpenNow(p)

  // Counts. With rows: computed from the unfiltered universe so the numbers
  // reflect "if you switched to this filter, here's how many you'd see" even
  // on /fully-vegan. Without rows (default view): read from `summary`, which
  // is exact because no cross-facet filter is active in the default view.
  const baseForCounts = rowsForCounts ? (isFullyVeganOnly ? rowsForCounts.filter(p => p.vegan_level === 'fully_vegan') : rowsForCounts) : null
  const summaryPool: FacetCounts | null = summary ? (activeVeganLevel ? (summary.byLevel[activeVeganLevel] ?? { total: 0, categories: {}, subcategories: {} }) : summary) : null
  const categories: string[] = baseForCounts
    ? [...new Set(baseForCounts.flatMap(categoriesOf))].sort()
    : Object.keys(summaryPool?.categories ?? {}).sort()
  const validCategory = activeCategory && categories.includes(activeCategory) ? activeCategory : null
  const subcategories: string[] = validCategory
    ? (baseForCounts
      ? [...new Set(baseForCounts.filter(p => p.category === validCategory).map(p => p.subcategory).filter((x): x is string => !!x))]
      : Object.keys(summaryPool?.subcategories[validCategory] ?? {}))
    : []
  const validSubcategory = activeSubcategory && subcategories.includes(activeSubcategory) ? activeSubcategory : null
  const poolForCategoryPills = baseForCounts ? baseForCounts.filter(p => matchVeganLevel(p) && matchPet(p) && matchOpen(p)) : null
  const poolForSubPills = baseForCounts ? baseForCounts.filter(p => matchCategory(p, validCategory) && matchVeganLevel(p) && matchPet(p) && matchOpen(p)) : null
  const poolForVeganLevelPills = baseForCounts ? baseForCounts.filter(p => matchCategory(p, validCategory) && matchSubcategory(p, validSubcategory) && matchPet(p) && matchOpen(p)) : null
  // Count for the "Open now" pill: every other filter applied, then open. Needs rows + the clock.
  const countOpen = baseForCounts && now ? baseForCounts.filter(p => matchCategory(p, validCategory) && matchSubcategory(p, validSubcategory) && matchVeganLevel(p) && matchPet(p) && isOpenNow(p)).length : null
  const countAll = poolForCategoryPills ? poolForCategoryPills.length : (summaryPool?.total ?? initialFull?.length ?? 0)
  const countCat = (cat: string) => poolForCategoryPills ? poolForCategoryPills.filter(p => categoriesOf(p).includes(cat)).length : (summaryPool?.categories[cat] ?? 0)
  const countSub = (sub: string) => poolForSubPills ? poolForSubPills.filter(p => p.subcategory === sub).length : (validCategory ? (summaryPool?.subcategories[validCategory]?.[sub] ?? 0) : 0)
  const countLevel = (value: string | null) => poolForVeganLevelPills
    ? (value === null ? poolForVeganLevelPills.length : poolForVeganLevelPills.filter(p => p.vegan_level === value).length)
    : (value === null ? (summary?.total ?? 0) : (summary?.byLevel[value]?.total ?? 0))

  // The list. With rows: filter + sort + paginate client-side. Without rows:
  // the server's default first page, with the page count from the summary.
  const filtered: ListPlace[] = rows
    ? (isFullyVeganOnly ? rows.filter(p => p.vegan_level === 'fully_vegan') : rows).filter(p => {
      if (validCategory && !categoriesOf(p).includes(validCategory)) return false
      if (validSubcategory && p.subcategory !== validSubcategory) return false
      if (petOnly && !p.is_pet_friendly) return false
      if (activeVeganLevel && p.vegan_level !== activeVeganLevel) return false
      if (openOnly && !isOpenNow(p)) return false
      return true
    }).sort((a, b) => {
      if (sortBy === 'rating') return (b.average_rating || 0) - (a.average_rating || 0)
      if (sortBy === 'vegan') {
        const levelDiff = veganLevelOrder(b.vegan_level) - veganLevelOrder(a.vegan_level)
        if (levelDiff !== 0) return levelDiff
        const ratingDiff = (b.average_rating || 0) - (a.average_rating || 0)
        if (ratingDiff !== 0) return ratingDiff
        return a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })
    : (isFullyVeganOnly ? (initialFull || []).filter(p => p.vegan_level === 'fully_vegan') : (initialFull || []))
  const resultTotal = rows ? filtered.length : countAll
  const totalPages = Math.max(1, Math.ceil(resultTotal / PAGE_SIZE))
  const paginated = rows ? filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : filtered
  const needsPagination = resultTotal > PAGE_SIZE
  // A non-default view before the rows arrive: show a short loading state
  // instead of the wrong cards.
  const waitingForRows = !rows && !isDefaultView && !!lightSrc

  // Load the cards this page shows but the server did not send. Until they
  // arrive the card renders from the light row (name, badges, rating) with
  // no image or description, so the page never looks empty.
  const missingIds = paginated.filter(p => !fullById[p.id]).map(p => p.id).join(',')
  useEffect(() => {
    if (!missingIds) return
    let cancelled = false
    fetch(`/api/places/cards?ids=${missingIds}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (cancelled || !j?.places?.length) return
        setFullById(prev => {
          const next = { ...prev }
          for (const p of j.places as Place[]) next[p.id] = p
          return next
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [missingIds])

  return (
    <div>
      {/* Mobile filters: compact dropdowns so the pill cloud doesn't eat the
          screen. The full pill bar below is desktop-only (hidden on mobile). */}
      <div className="md:hidden flex flex-wrap items-center gap-2 mb-4">
        <select
          aria-label="Category"
          value={validCategory ?? ''}
          onChange={e => setFilter({ category: e.target.value || null, sub: null })}
          className="cursor-pointer text-sm font-medium rounded-lg bg-surface-container-low text-on-surface px-3 py-1.5 border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All ({countAll})</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{(CATEGORY_LABELS[cat] || cat)} ({countCat(cat)})</option>
          ))}
        </select>
        {validCategory && subcategories.length > 1 && (
          <select
            aria-label="Type"
            value={validSubcategory ?? ''}
            onChange={e => setFilter({ sub: e.target.value || null })}
            className="cursor-pointer text-sm font-medium rounded-lg bg-surface-container-low text-on-surface px-3 py-1.5 border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All types</option>
            {subcategories.map(sub => sub ? (
              <option key={sub} value={sub}>{(SUBCATEGORY_LABELS[validCategory]?.[sub]) || sub} ({countSub(sub)})</option>
            ) : null)}
          </select>
        )}
        {!isFullyVeganOnly && (
          <select
            aria-label="Vegan level"
            value={activeVeganLevel ?? ''}
            onChange={e => setFilter({ vl: e.target.value || null })}
            className="cursor-pointer text-sm font-medium rounded-lg bg-surface-container-low text-on-surface px-3 py-1.5 border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {VEGAN_LEVEL_FILTERS.map(({ value, label }) => (
              <option key={value ?? 'all'} value={value ?? ''}>
                {label} ({countLevel(value)})
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Sort by"
          value={sortBy}
          onChange={e => setFilter({ sort: e.target.value === 'vegan' ? null : e.target.value })}
          className="cursor-pointer text-sm font-medium rounded-lg bg-surface-container-low text-on-surface px-3 py-1.5 border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="vegan">🌿 Vegan first</option>
          <option value="rating">⭐ Rating</option>
          <option value="name">A-Z</option>
        </select>
        <button
          onClick={() => setFilter({ pet: petOnly ? null : '1' })}
          aria-pressed={petOnly}
          aria-label="Pet-friendly only"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${petOnly ? 'bg-orange-500 text-white' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/20'}`}
        >
          🐾
        </button>
        <span className="self-center text-xs text-on-surface-variant ml-auto">{resultTotal} results</span>
      </div>

      {/* Desktop filters: full pill bar */}
      <div className="hidden md:flex flex-wrap gap-2 mb-6">
        {/* Category pills */}
        <button onClick={() => setFilter({ category: null, sub: null })}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!validCategory ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
          All ({countAll})
        </button>
        {categories.map(cat => {
          const count = countCat(cat)
          return (
            <button key={cat} onClick={() => setFilter({ category: validCategory === cat ? null : cat, sub: null })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${validCategory === cat ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
              {CATEGORY_LABELS[cat] || cat} ({count})
            </button>
          )
        })}

        {/* Subcategory pills — show when a category is selected */}
        {validCategory && subcategories.length > 1 && (
          <>
            <div className="w-px h-8 bg-outline-variant/30 self-center" />
            {subcategories.map(sub => {
              if (!sub) return null
              const count = countSub(sub)
              const label = (validCategory && SUBCATEGORY_LABELS[validCategory]?.[sub]) || sub
              return (
                <button key={sub} onClick={() => setFilter({ sub: validSubcategory === sub ? null : sub })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${validSubcategory === sub ? 'bg-primary/80 text-on-primary-btn' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
                  {label} ({count})
                </button>
              )
            })}
          </>
        )}

        {/* Vegan level sub-filter — only when global toggle is OFF */}
        {!isFullyVeganOnly && (
          <>
            <div className="w-px h-8 bg-outline-variant/30 self-center" />
            {VEGAN_LEVEL_FILTERS.map(({ value, label }) => {
              const count = countLevel(value)
              return (
                <button key={value ?? 'all'} onClick={() => setFilter({ vl: value })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeVeganLevel === value
                      ? 'bg-primary text-on-primary-btn'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}>
                  {label} ({count})
                </button>
              )
            })}
          </>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-outline-variant/30 self-center" />

        {/* Pet-friendly toggle */}
        <button onClick={() => setFilter({ pet: petOnly ? null : '1' })}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${petOnly ? 'bg-orange-500 text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
          🐾 Pet-Friendly
        </button>

        {/* Open now - hours parsed from OSM text in the city's own time zone.
            Places with hours we cannot parse are never shown as closed; they
            simply drop out of this filter. */}
        {openNowEnabled && (
          <button onClick={() => { ensureRows(); setFilter({ open: openOnly ? null : '1' }) }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${openOnly ? 'bg-emerald-600 text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
            title="Only places open right now (local time)">
            <Clock className="h-3.5 w-3.5" aria-hidden /> Open now{countOpen !== null ? ` (${countOpen})` : ''}
          </button>
        )}

        {/* Sort */}
        <div className="w-px h-8 bg-outline-variant/30 self-center" />
        {(['vegan', 'rating', 'name'] as const).map(mode => (
          // 'vegan' is the default now — clicking it clears the query param.
          <button key={mode} onClick={() => setFilter({ sort: mode === 'vegan' ? null : mode })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              sortBy === mode ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'
            }`}>
            {mode === 'name' ? 'A-Z' : mode === 'rating' ? '⭐ Rating' : '🌿 Vegan first'}
          </button>
        ))}

        {/* Result count */}
        <span className="self-center text-xs text-on-surface-variant">
          {needsPagination ? `${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE, resultTotal)} of ` : ''}{resultTotal} results
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Places List */}
        <div className="flex-1 space-y-4 min-w-0">
          {waitingForRows && (
            <p className="text-center text-on-surface-variant py-8" aria-live="polite">Loading places…</p>
          )}
          {!waitingForRows && paginated.map(row => {
            const place = (fullById[row.id] ?? row) as Place
            const address = place.address || ''
            const thumbnail = place.main_image_url || place.images?.[0]
            const googleMapsUrl = place.google_place_id
              ? `https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`
              : `https://www.google.com/maps/search/${encodeURIComponent(place.name + ' ' + address)}`
            const appleMapsUrl = `http://maps.apple.com/?q=${encodeURIComponent(place.name)}&address=${encodeURIComponent(address)}&ll=${place.latitude},${place.longitude}`
            const osmUrl = `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}&zoom=17`
            const cuisines = (place.cuisine_types || []).filter(c => c && c !== 'vegan' && c !== 'regional').slice(0, 3)

            return (
              <div key={place.id} className="bg-surface-container-lowest rounded-xl editorial-shadow ghost-border overflow-hidden hover:border-primary/20 transition-all">
                <Link
                  href={`/place/${place.slug || place.id}`}
                  prefetch={false}
                  className="group flex gap-4 p-4"
                >
                  <div className="relative flex-shrink-0">
                    <PlaceImage
                      src={thumbnail}
                      alt={place.name}
                      category={place.category}
                      className="w-24 h-24 md:w-32 md:h-24 rounded-lg object-cover"
                      optimize={{ width: 128, height: 96, sizes: '(min-width: 768px) 128px, 96px' }}
                    />
                    {/* Overlay badges. Use *-700 shades for WCAG AA
                        contrast at 8px white text on coloured bg. */}
                    <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                      {place.vegan_level === 'fully_vegan' && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-700 text-white leading-none">VEGAN</span>
                      )}
                      {place.vegan_level === 'mostly_vegan' && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-teal-700 text-white leading-none">MOSTLY</span>
                      )}
                      {place.is_pet_friendly && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-orange-600 text-white leading-none" aria-label="Pet friendly">🐾</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {place.name}
                    </h2>

                    {/* Badges */}
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                      <span className="bg-secondary-container text-on-surface px-1.5 py-0.5 rounded text-xs capitalize font-medium">
                        {CATEGORY_LABELS[place.category] || place.category}
                      </span>
                      {place.vegan_level && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${VEGAN_LEVEL_INLINE_CLASS[place.vegan_level] || 'bg-stone-100 text-stone-600'}`}>
                          {VEGAN_LEVEL_LABEL[place.vegan_level] || place.vegan_level}
                        </span>
                      )}
                      {/* Verification confidence (Axis 2) - lives next to the
                          vegan-level chip so users see "what is it" + "how
                          confident are we" together. */}
                      <VerificationConfidenceBadge place={place} variant="compact" />
                      {now && (() => {
                        const label = openLabel(openStatus(hoursOf(row), now))
                        if (!label) return null
                        const open = label.startsWith('Open')
                        return (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${open ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant'}`}>
                            {label}
                          </span>
                        )
                      })()}

                      {/* Hand-verified freshness badge - shown on /fully-vegan
                          tiles only. Surfaces last_verified_at as visible
                          text so AI search systems can quote it as a
                          freshness signal rather than guessing from the page
                          publish date. */}
                      {isOnFvPath && (place.verification_level ?? 0) >= 3 && place.verification_method === 'admin_review' && (
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs flex items-center gap-1" title="Hand-checked against the venue's own website">
                          ✓ Verified{place.last_verified_at ? ` ${new Date(place.last_verified_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ''}
                        </span>
                      )}
                      {place.is_pet_friendly && (
                        <span className="bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5">
                          <PawPrint className="h-3 w-3" /> Pets
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <RatingBadge
                      rating={place.average_rating}
                      reviewCount={place.review_count}
                      size="xs"
                      className="mt-1.5"
                    />

                    {/* Description (sanitized to drop scraped HTML/boilerplate) */}
                    {(() => {
                      const desc = sanitizeDescription(place.description)
                      return desc ? (
                        <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">{desc}</p>
                      ) : null
                    })()}

                    {/* Cuisine tags */}
                    {cuisines.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {cuisines.map(c => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant capitalize">
                            {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Contact & Maps bar */}
                <div className="flex items-center gap-3 px-4 pb-3 pt-0 text-xs">
                  <span className="flex items-center gap-1 text-on-surface-variant">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{address}</span>
                  </span>
                  <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                    <SavePlaceButton placeId={place.id} placeName={place.name} from="card_save" size="sm" />
                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-primary hover:text-primary/80 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-primary/10 transition-colors"
                        title={place.phone}
                        aria-label={`Call ${place.phone}`}
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-primary hover:text-primary/80 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-primary/10 transition-colors"
                        title="Website"
                        aria-label="Open website"
                      >
                        <Globe className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Google Maps">
                      <Navigation className="h-3.5 w-3.5" />
                    </a>
                    <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80" title="Apple Maps">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <a href={osmUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80" title="OpenStreetMap">
                      <Map className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )
          })}

          {!waitingForRows && resultTotal === 0 && (
            <p className="text-center text-on-surface-variant py-8">No places found in this category.</p>
          )}

          {/* Bottom "Add a place" card — only on the last page so scrolling
              to the end of the list surfaces the add-CTA where the user
              already is (no scroll-back required). Skipped when we don't
              have city/country, and on filtered views to avoid a confusing
              "Add a place in Berlin" offer while inside a category filter. */}
          {cityName && countryName && resultTotal > 0 && currentPage >= totalPages && !validCategory && !validSubcategory && !petOnly && (
            <div className="bg-primary/5 border border-dashed border-primary/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium text-on-surface">Not finding a place?</p>
                <p className="text-sm text-on-surface-variant">
                  Help the vegan community in {cityName}{' '}grow — add a place we&apos;re missing.
                </p>
              </div>
              <AddPlaceButton
                cityName={cityName}
                countryName={countryName}
                className="flex-shrink-0 inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary-btn px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add a place in {cityName}
              </AddPlaceButton>
            </div>
          )}

          {/* Pagination */}
          {needsPagination && (
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <p className="text-xs text-on-surface-variant">
                {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE, resultTotal)} of {resultTotal}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFilter({ page: String(currentPage - 1) }); window.scrollTo(0, 0) }}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-border hover:bg-surface-container-low disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 inline" /> Previous
                </button>
                <span className="text-xs text-on-surface-variant">{currentPage}/{totalPages}</span>
                <button
                  onClick={() => { setFilter({ page: String(currentPage + 1) }); window.scrollTo(0, 0) }}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium ghost-border hover:bg-surface-container-low disabled:opacity-30 transition-colors"
                >
                  Next <ChevronRight className="h-4 w-4 inline" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Map (lazy-mounted) */}
        <div className="lg:w-[400px] flex-shrink-0">
          <div className="lg:sticky lg:top-20">
            <LazyCityMap
              places={rows ? filtered : null}
              onNeedPlaces={ensureRows}
              className="h-[300px] lg:h-[calc(100vh-8rem)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Defer mounting CityMap (and the Leaflet bundle + OSM tile fetches it
// triggers) until the sidebar nears the viewport. On mobile the map is
// well below the fold, so deferral is a clean LCP win. On desktop the
// observer fires almost immediately on mount, so user-perceived delay
// stays sub-100ms while the document paints first.
function LazyCityMap({ places, onNeedPlaces, className }: { places: ListPlace[] | null; onNeedPlaces: () => void; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '300px' })
  // The hub does not ship the rows; ask for them when the map nears the viewport.
  useEffect(() => { if (inView && !places) onNeedPlaces() }, [inView, places, onNeedPlaces])
  const mapPlaces = useMemo(
    () =>
      (places || []).map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug || undefined,
        latitude: p.latitude,
        longitude: p.longitude,
        category: p.category,
        vegan_level: p.vegan_level,
        average_rating: p.average_rating,
        review_count: p.review_count,
      })),
    [places]
  )
  return (
    <div ref={ref} className={className} style={{ minHeight: '300px' }}>
      {inView && places ? (
        <CityMap places={mapPlaces} className="h-full" />
      ) : (
        // Reserved-space placeholder, no network/JS work. Same min-height
        // as the real map so CLS stays at 0 when it swaps in.
        <div className="h-full w-full rounded-xl bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-50 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest shadow-sm">
            <Map className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-on-surface">{inView ? 'Loading map…' : 'Map loads as you scroll'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
