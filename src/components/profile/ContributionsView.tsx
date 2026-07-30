'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Loader2, ExternalLink, MapPin, AlertCircle, TrendingUp } from 'lucide-react'

export type ContribType = 'places' | 'reviews' | 'experiences' | 'posts' | 'packs'

interface Props {
  username: string
  type: ContribType
}

interface DisplayUser {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
}

/**
 * Reach numbers for one contributed place.
 *
 * `searchImpressions`/`searchClicks` come from Google Search Console and cover
 * Google organic ONLY. `views` comes from our own counter and covers every page
 * open from any source, but only since tracking started.
 *
 * They measure different things and are deliberately never added together. A
 * null means "not measured", which is rendered as absence rather than as a zero -
 * showing "0" for an unmeasured place reads as "nobody cared" and would be a lie.
 */
interface PlaceImpact {
  searchImpressions: number | null
  searchClicks: number | null
  views: number | null
}

interface Row {
  key: string
  thumb: string | null
  title: string
  subtitle: string
  meta: string
  href: string
  impact?: PlaceImpact
}

interface ImpactSummary {
  searchImpressions: number
  searchClicks: number
  views: number
  /** Window the GSC numbers cover, straight from place_search_stats. */
  periodStart: string | null
  periodEnd: string | null
  /** How many of the listed places have any GSC row at all. */
  measured: number
  total: number
}

const nf = new Intl.NumberFormat('en-US')

/**
 * Below this many Google impressions we say nothing at all.
 *
 * Measured 2026-07-30 across the 53 people who have added places: 23 had zero
 * impressions and 9 more had between 1 and 9. "Found in Google search 3 times"
 * reads as failure, so for that group silence is both kinder and more accurate -
 * a single-digit impression count is indistinguishable from noise. Applied to the
 * aggregate for the summary card and per-place for the chips, so someone with a
 * dozen low-traffic places still gets a real number in the summary.
 */
const MIN_SEARCH_IMPRESSIONS = 10

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const TITLES: Record<ContribType, string> = {
  places: 'Places added',
  reviews: 'Reviews',
  experiences: 'City experiences',
  posts: 'Posts',
  packs: 'Packs',
}

const EMPTY: Record<ContribType, string> = {
  places: 'No places added yet.',
  reviews: 'No reviews written yet.',
  experiences: 'No city experiences shared yet.',
  posts: 'No posts published yet.',
  packs: 'No packs created yet.',
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const delta = Math.max(0, Date.now() - then) / 1000
  if (delta < 60) return 'just now'
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  if (delta < 2592000) return `${Math.floor(delta / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function ContributionsView({ username, type }: Props) {
  const [user, setUser] = useState<DisplayUser | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<ImpactSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      const { data: u } = await supabase
        .from('users')
        .select('id, username, first_name, last_name')
        .eq('username', username)
        .single()
      if (cancelled) return
      if (!u) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setUser(u as DisplayUser)
      const fetched = await fetchContrib(u.id, type)
      if (cancelled) return
      setRows(fetched.rows)
      setSummary(fetched.summary)
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [username, type])

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-on-surface">User @{username} not found.</p>
      </div>
    )
  }

  const displayName = user
    ? (user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.username)
    : `@${username}`

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-on-surface-variant mb-4">
        <Link href={`/profile/${username}`} className="hover:text-primary">← {displayName}</Link>
      </nav>
      <h1 className="text-2xl font-semibold text-on-surface mb-1">{TITLES[type]}</h1>
      <p className="text-sm text-on-surface-variant mb-6">by @{username}</p>

      {!loading && summary && <ImpactSummaryCard summary={summary} />}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-on-surface-variant" />
          <p className="mt-3 text-on-surface-variant">{EMPTY[type]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="bg-white rounded-lg border border-surface-container-high p-3 sm:p-4 flex gap-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden bg-surface-container-high flex items-center justify-center">
                {r.thumb ? (
                  <Image src={r.thumb} alt="" width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <MapPin className="w-6 h-6 text-on-surface-variant" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-on-surface text-sm sm:text-base truncate">{r.title}</h3>
                {r.subtitle && <p className="text-sm text-on-surface-variant line-clamp-2">{r.subtitle}</p>}
                {r.meta && <p className="text-xs text-on-surface-variant mt-0.5">{r.meta}</p>}
                {r.impact && <ImpactChips impact={r.impact} />}
                <Link href={r.href} className="inline-flex items-center gap-1 mt-2 text-xs sm:text-sm text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Aggregate reach across everything the contributor added.
 *
 * The two numbers are presented as separate sentences on purpose. Google
 * impressions and our own page views overlap in unknowable ways, so a combined
 * "total reach" figure would be invented. Stating each with its own scope is both
 * honest and, since impressions are the larger number, more encouraging anyway.
 */
function ImpactSummaryCard({ summary }: { summary: ImpactSummary }) {
  const hasSearch = summary.measured > 0 && summary.searchImpressions >= MIN_SEARCH_IMPRESSIONS
  const period = [fmtDate(summary.periodStart), fmtDate(summary.periodEnd)].filter(Boolean).join(' – ')

  // Nothing worth saying: render nothing rather than an empty card.
  if (!hasSearch && summary.views === 0) return null

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
        <h2 className="text-sm font-semibold text-on-surface">What these places did</h2>
      </div>

      {hasSearch && (
        <p className="text-sm text-on-surface">
          Found in Google search{' '}
          <strong className="text-primary">{nf.format(summary.searchImpressions)}</strong>{' '}
          {summary.searchImpressions === 1 ? 'time' : 'times'}
          {summary.searchClicks > 0 && (
            <>
              , and opened from there{' '}
              <strong className="text-primary">{nf.format(summary.searchClicks)}</strong>{' '}
              {summary.searchClicks === 1 ? 'time' : 'times'}
            </>
          )}
          .
          {period && <span className="text-on-surface-variant"> ({period})</span>}
        </p>
      )}

      {summary.views > 0 && (
        <p className="text-sm text-on-surface mt-1">
          <strong className="text-primary">{nf.format(summary.views)}</strong> page views on
          PlantsPack since view counting began.
        </p>
      )}

      <p className="text-xs text-on-surface-variant mt-2">
        Google search and PlantsPack page views are counted separately and are not added together.
        {hasSearch && summary.measured < summary.total && (
          <> Google data covers {nf.format(summary.measured)} of {nf.format(summary.total)} places; the rest have not appeared in search yet.</>
        )}
      </p>
    </div>
  )
}

/** Per-place chips. Renders only the numbers that exist - never a zero-fill. */
function ImpactChips({ impact }: { impact: PlaceImpact }) {
  const chips: string[] = []
  const showSearch = impact.searchImpressions != null && impact.searchImpressions >= MIN_SEARCH_IMPRESSIONS
  if (showSearch) {
    chips.push(`${nf.format(impact.searchImpressions!)} in Google search`)
  }
  // Only alongside the impressions chip: a click count with no denominator next
  // to it invites the reader to assume the reach was tiny.
  if (showSearch && impact.searchClicks != null && impact.searchClicks > 0) {
    chips.push(`${nf.format(impact.searchClicks)} opened from Google`)
  }
  if (impact.views != null && impact.views > 0) {
    chips.push(`${nf.format(impact.views)} page view${impact.views === 1 ? '' : 's'}`)
  }
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {chips.map((c) => (
        <span
          key={c}
          className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium"
        >
          {c}
        </span>
      ))}
    </div>
  )
}

async function fetchContrib(userId: string, type: ContribType): Promise<{ rows: Row[]; summary: ImpactSummary | null }> {
  if (type === 'places') {
    const { data } = await supabase
      .from('places')
      .select('id, slug, name, city, country, category, main_image_url, images, created_at')
      .eq('created_by', userId).is('archived_at', null)
      .order('created_at', { ascending: false }).limit(100)

    const places = data || []
    const ids = places.map((p: any) => p.id)
    const impact = ids.length ? await fetchPlaceImpact(ids) : { byId: new Map(), summary: null }

    return {
      rows: places.map((p: any) => ({
        key: p.id,
        thumb: p.main_image_url || (Array.isArray(p.images) ? p.images[0] : null),
        title: p.name,
        subtitle: [p.city, p.country].filter(Boolean).join(', '),
        meta: `Added ${timeAgo(p.created_at)}${p.category ? ' · ' + p.category : ''}`,
        href: `/place/${p.slug}`,
        impact: impact.byId.get(p.id),
      })),
      summary: impact.summary,
    }
  }
  if (type === 'reviews') {
    const { data } = await supabase
      .from('place_reviews')
      .select('id, rating, content, created_at, places:place_id (id, name, slug, city, country, main_image_url)')
      .eq('user_id', userId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(100)
    return {
      rows: (data || []).map((r: any) => ({
        key: r.id,
        thumb: r.places?.main_image_url || null,
        title: `★ ${r.rating} — ${r.places?.name ?? 'Deleted place'}`,
        subtitle: r.content ? r.content.slice(0, 160) + (r.content.length > 160 ? '…' : '') : '',
        meta: `Posted ${timeAgo(r.created_at)}${r.places?.city ? ' · ' + r.places.city : ''}`,
        href: r.places?.slug ? `/place/${r.places.slug}#review-${r.id}` : '#',
      })),
      summary: null,
    }
  }
  if (type === 'experiences') {
    const { data } = await supabase
      .from('city_experiences')
      .select('id, city, country, city_slug, country_slug, overall_rating, summary, tips, created_at')
      .eq('user_id', userId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(100)
    return {
      rows: (data || []).map((e: any) => ({
        key: e.id,
        thumb: null,
        title: `${e.city}, ${e.country}`,
        subtitle: e.summary ? e.summary.slice(0, 160) + (e.summary.length > 160 ? '…' : '') : '',
        meta: `★ ${e.overall_rating} · ${e.tips?.length ?? 0} tip${e.tips?.length === 1 ? '' : 's'} · shared ${timeAgo(e.created_at)}`,
        href: `/vegan-places/${e.country_slug}/${e.city_slug}`,
      })),
      summary: null,
    }
  }
  if (type === 'posts') {
    const { data } = await supabase
      .from('posts')
      .select('id, title, content, category, slug, images, created_at, privacy')
      .eq('user_id', userId).is('deleted_at', null)
      .eq('privacy', 'public')
      .not('category', 'in', '(recipe,event)')
      .order('created_at', { ascending: false }).limit(100)
    return {
      rows: (data || []).map((p: any) => ({
        key: p.id,
        thumb: p.images?.[0] ?? null,
        title: p.title || (p.content.length > 60 ? p.content.slice(0, 60) + '…' : p.content),
        subtitle: p.title ? (p.content.length > 160 ? p.content.slice(0, 160) + '…' : p.content) : '',
        meta: `Posted ${timeAgo(p.created_at)}${p.category ? ' · ' + p.category : ''}`,
        href: `/post/${p.slug || p.id}`,
      })),
      summary: null,
    }
  }
  if (type === 'packs') {
    const { data } = await supabase
      .from('packs')
      .select('id, title, slug, description, banner_url, created_at')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false }).limit(100)
    return {
      rows: (data || []).map((pk: any) => ({
        key: pk.id,
        thumb: pk.banner_url,
        title: pk.title,
        subtitle: pk.description ? pk.description.slice(0, 160) : '',
        meta: `Created ${timeAgo(pk.created_at)}`,
        href: `/packs/${pk.slug}`,
      })),
      summary: null,
    }
  }
  return { rows: [], summary: null }
}

/**
 * Pull reach numbers for a batch of places from the two independent sources.
 *
 * Both queries are best-effort. If the GSC backfill has not run yet, or view
 * tracking has not accrued anything, the corresponding fields stay null and the
 * UI omits them entirely instead of rendering a misleading zero.
 */
async function fetchPlaceImpact(
  placeIds: string[],
): Promise<{ byId: Map<string, PlaceImpact>; summary: ImpactSummary | null }> {
  const [searchRes, viewsRes] = await Promise.all([
    supabase
      .from('place_search_stats')
      .select('place_id, clicks, impressions, period_start, period_end')
      .in('place_id', placeIds),
    supabase.rpc('place_view_totals', { p_place_ids: placeIds }),
  ])

  const byId = new Map<string, PlaceImpact>()
  const ensure = (id: string): PlaceImpact => {
    let cur = byId.get(id)
    if (!cur) {
      cur = { searchImpressions: null, searchClicks: null, views: null }
      byId.set(id, cur)
    }
    return cur
  }

  let searchImpressions = 0
  let searchClicks = 0
  let views = 0
  let measured = 0
  let periodStart: string | null = null
  let periodEnd: string | null = null

  for (const row of (searchRes.data as any[]) || []) {
    const cur = ensure(row.place_id)
    cur.searchImpressions = row.impressions ?? 0
    cur.searchClicks = row.clicks ?? 0
    searchImpressions += row.impressions ?? 0
    searchClicks += row.clicks ?? 0
    measured++
    // Every row from one backfill run shares a window; take the widest seen so a
    // mix of runs still states a truthful range.
    if (!periodStart || (row.period_start && row.period_start < periodStart)) periodStart = row.period_start
    if (!periodEnd || (row.period_end && row.period_end > periodEnd)) periodEnd = row.period_end
  }

  for (const row of (viewsRes.data as any[]) || []) {
    const n = Number(row.views) || 0
    ensure(row.place_id).views = n
    views += n
  }

  const hasAnything = measured > 0 || views > 0
  return {
    byId,
    summary: hasAnything
      ? { searchImpressions, searchClicks, views, periodStart, periodEnd, measured, total: placeIds.length }
      : null,
  }
}
