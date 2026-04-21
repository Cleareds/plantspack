'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Loader2, ExternalLink, MapPin, Archive, RotateCcw, Star, MessageSquare, Package, AlertCircle, Wrench } from 'lucide-react'
import BadgeChip, { BadgeCode } from './BadgeChip'

type TabId = 'places' | 'reviews' | 'posts' | 'packs' | 'corrections' | 'archived'

interface Summary {
  places_added: number
  reviews_written: number
  recipe_reviews_written: number
  posts_published: number
  packs_created: number
  corrections_submitted: number
  badge_codes: string[]
}

interface PlaceRow {
  id: string
  slug: string
  name: string
  city: string | null
  country: string | null
  category: string | null
  main_image_url: string | null
  images: string[] | null
  created_at: string
  archived_at: string | null
}

interface ReviewRow {
  id: string
  place_id: string
  rating: number
  content: string | null
  created_at: string
  deleted_at: string | null
  places: { id: string; name: string; slug: string; city: string | null; country: string | null } | null
}

interface PostRow {
  id: string
  title: string | null
  content: string
  category: string | null
  slug: string | null
  images: string[] | null
  created_at: string
  deleted_at: string | null
}

interface PackRow {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image_url: string | null
  created_at: string
}

interface CorrectionRow {
  id: string
  place_id: string
  note: string | null
  corrections: Record<string, unknown>
  status: string
  created_at: string
  places: { name: string; slug: string } | null
}

interface ContributionsClientProps {
  userId: string
}

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'places',      label: 'Places',      icon: MapPin },
  { id: 'reviews',     label: 'Reviews',     icon: Star },
  { id: 'posts',       label: 'Posts',       icon: MessageSquare },
  { id: 'packs',       label: 'Packs',       icon: Package },
  { id: 'corrections', label: 'Corrections', icon: Wrench },
  { id: 'archived',    label: 'Archived',    icon: Archive },
]

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const delta = Math.max(0, now - then) / 1000
  if (delta < 60) return 'just now'
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`
  if (delta < 2592000) return `${Math.floor(delta / 86400)}d ago`
  const d = new Date(iso)
  return d.toLocaleDateString()
}

export default function ContributionsClient({ userId }: ContributionsClientProps) {
  const [tab, setTab] = useState<TabId>('places')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [places, setPlaces] = useState<PlaceRow[]>([])
  const [archivedPlaces, setArchivedPlaces] = useState<PlaceRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [posts, setPosts] = useState<PostRow[]>([])
  const [packs, setPacks] = useState<PackRow[]>([])
  const [corrections, setCorrections] = useState<CorrectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    const { data } = await supabase.rpc('get_user_contributions_summary', { user_uuid: userId }).single()
    if (data) setSummary(data as Summary)
  }, [userId])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [p, a, r, po, pk, co] = await Promise.all([
      supabase.from('places')
        .select('id, slug, name, city, country, category, main_image_url, images, created_at, archived_at')
        .eq('created_by', userId).is('archived_at', null)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('places')
        .select('id, slug, name, city, country, category, main_image_url, images, created_at, archived_at')
        .eq('created_by', userId).not('archived_at', 'is', null)
        .order('archived_at', { ascending: false }).limit(50),
      supabase.from('place_reviews')
        .select('id, place_id, rating, content, created_at, deleted_at, places:place_id (id, name, slug, city, country)')
        .eq('user_id', userId).is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('posts')
        .select('id, title, content, category, slug, images, created_at, deleted_at')
        .eq('user_id', userId).is('deleted_at', null)
        .not('category', 'in', '(recipe,event)')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('packs')
        .select('id, title, slug, description, cover_image_url, created_at')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('place_corrections')
        .select('id, place_id, note, corrections, status, created_at, places:place_id (name, slug)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(50),
    ])
    setPlaces((p.data as PlaceRow[]) || [])
    setArchivedPlaces((a.data as PlaceRow[]) || [])
    setReviews((r.data as unknown as ReviewRow[]) || [])
    setPosts((po.data as PostRow[]) || [])
    setPacks((pk.data as PackRow[]) || [])
    setCorrections((co.data as unknown as CorrectionRow[]) || [])
    setLoading(false)
  }, [userId])

  useEffect(() => { loadSummary(); loadAll() }, [loadSummary, loadAll])

  const unpublishPlace = async (placeId: string) => {
    setBusyId(placeId)
    try {
      const res = await fetch(`/api/places/${placeId}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: false }),
      })
      if (!res.ok) throw new Error('unpublish failed')
      await loadAll()
      await loadSummary()
    } finally { setBusyId(null) }
  }

  const republishPlace = async (placeId: string) => {
    setBusyId(placeId)
    try {
      const res = await fetch(`/api/places/${placeId}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: true }),
      })
      if (!res.ok) throw new Error('republish failed')
      await loadAll()
      await loadSummary()
    } finally { setBusyId(null) }
  }

  const unpublishReview = async (placeId: string, reviewId: string) => {
    if (!confirm('Delete this review? You can write a new one anytime.')) return
    setBusyId(reviewId)
    try {
      const res = await fetch(`/api/places/${placeId}/reviews`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete review failed')
      await loadAll()
      await loadSummary()
    } finally { setBusyId(null) }
  }

  const unpublishPost = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    setBusyId(postId)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete post failed')
      await loadAll()
      await loadSummary()
    } finally { setBusyId(null) }
  }

  const tabCount = useMemo(() => ({
    places: summary?.places_added ?? 0,
    reviews: (summary?.reviews_written ?? 0) + (summary?.recipe_reviews_written ?? 0),
    posts: summary?.posts_published ?? 0,
    packs: summary?.packs_created ?? 0,
    corrections: summary?.corrections_submitted ?? 0,
    archived: archivedPlaces.length,
  }), [summary, archivedPlaces.length])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-on-surface">My Contributions</h1>

        {summary?.badge_codes && summary.badge_codes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {summary.badge_codes.map(code => (
              <BadgeChip key={code} code={code as BadgeCode} size="sm" />
            ))}
          </div>
        )}

        <p className="text-sm text-on-surface-variant mt-3">
          {summary?.places_added ?? 0} places · {(summary?.reviews_written ?? 0) + (summary?.recipe_reviews_written ?? 0)} reviews · {summary?.posts_published ?? 0} posts · {summary?.packs_created ?? 0} packs
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-surface-container-high mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const count = tabCount[t.id]
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {count > 0 && (
                <span className="text-xs bg-surface-container-high text-on-surface-variant rounded-full px-1.5 py-0.5 ml-0.5">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'places' && (places.length === 0
            ? <EmptyState label="You haven't added any places yet." cta={{ href: '/', text: 'Add a place' }} />
            : places.map(p => (
                <ContribCard
                  key={p.id}
                  thumb={p.main_image_url || (Array.isArray(p.images) ? p.images[0] : null)}
                  title={p.name}
                  subtitle={[p.city, p.country].filter(Boolean).join(', ')}
                  meta={`Added ${timeAgo(p.created_at)} · ${p.category}`}
                  openHref={`/place/${p.slug}`}
                  actions={[
                    { label: 'Unpublish', onClick: () => unpublishPlace(p.id), busy: busyId === p.id, kind: 'danger' },
                  ]}
                />
              ))
          )}

          {tab === 'reviews' && (reviews.length === 0
            ? <EmptyState label="You haven't written any reviews yet." />
            : reviews.map(r => (
                <ContribCard
                  key={r.id}
                  thumb={null}
                  title={`★ ${r.rating} — ${r.places?.name ?? 'Deleted place'}`}
                  subtitle={r.content ? r.content.slice(0, 160) + (r.content.length > 160 ? '…' : '') : ''}
                  meta={`Posted ${timeAgo(r.created_at)}${r.places?.city ? ' · ' + r.places.city : ''}`}
                  openHref={r.places?.slug ? `/place/${r.places.slug}` : '#'}
                  actions={[
                    { label: 'Delete', onClick: () => unpublishReview(r.place_id, r.id), busy: busyId === r.id, kind: 'danger' },
                  ]}
                />
              ))
          )}

          {tab === 'posts' && (posts.length === 0
            ? <EmptyState label="You haven't posted anything yet." cta={{ href: '/feed', text: 'Open the feed' }} />
            : posts.map(p => (
                <ContribCard
                  key={p.id}
                  thumb={p.images?.[0] ?? null}
                  title={p.title || (p.content.length > 60 ? p.content.slice(0, 60) + '…' : p.content)}
                  subtitle={p.title ? (p.content.length > 160 ? p.content.slice(0, 160) + '…' : p.content) : ''}
                  meta={`Posted ${timeAgo(p.created_at)}${p.category ? ' · ' + p.category : ''}`}
                  openHref={`/post/${p.slug || p.id}`}
                  actions={[
                    { label: 'Delete', onClick: () => unpublishPost(p.id), busy: busyId === p.id, kind: 'danger' },
                  ]}
                />
              ))
          )}

          {tab === 'packs' && (packs.length === 0
            ? <EmptyState label="You haven't created any packs yet." />
            : packs.map(pk => (
                <ContribCard
                  key={pk.id}
                  thumb={pk.cover_image_url}
                  title={pk.title}
                  subtitle={pk.description ? pk.description.slice(0, 160) : ''}
                  meta={`Created ${timeAgo(pk.created_at)}`}
                  openHref={`/packs/${pk.slug}`}
                />
              ))
          )}

          {tab === 'corrections' && (corrections.length === 0
            ? <EmptyState label="No corrections submitted." />
            : corrections.map(c => (
                <ContribCard
                  key={c.id}
                  thumb={null}
                  title={c.places?.name || 'Unknown place'}
                  subtitle={c.note || Object.keys(c.corrections || {}).join(', ')}
                  meta={`Submitted ${timeAgo(c.created_at)} · ${c.status}`}
                  openHref={c.places?.slug ? `/place/${c.places.slug}` : '#'}
                  statusChip={c.status}
                />
              ))
          )}

          {tab === 'archived' && (archivedPlaces.length === 0
            ? <EmptyState label="No archived items. Unpublished places live here." />
            : archivedPlaces.map(p => (
                <ContribCard
                  key={p.id}
                  thumb={p.main_image_url || (Array.isArray(p.images) ? p.images[0] : null)}
                  title={p.name}
                  subtitle={[p.city, p.country].filter(Boolean).join(', ')}
                  meta={`Archived ${p.archived_at ? timeAgo(p.archived_at) : ''}`}
                  openHref={`/place/${p.slug}`}
                  dim
                  actions={[
                    { label: 'Re-publish', onClick: () => republishPlace(p.id), busy: busyId === p.id, kind: 'primary', icon: RotateCcw },
                  ]}
                />
              ))
          )}
        </div>
      )}
    </div>
  )
}

interface ContribCardProps {
  thumb: string | null
  title: string
  subtitle?: string
  meta?: string
  openHref: string
  actions?: { label: string; onClick: () => void; busy: boolean; kind: 'primary' | 'danger'; icon?: React.ComponentType<{ className?: string }> }[]
  dim?: boolean
  statusChip?: string
}

function ContribCard({ thumb, title, subtitle, meta, openHref, actions, dim, statusChip }: ContribCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-surface-container-high p-3 sm:p-4 flex gap-3 ${dim ? 'opacity-60' : ''}`}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden bg-surface-container-high flex items-center justify-center">
        {thumb ? (
          <Image src={thumb} alt="" width={80} height={80} className="w-full h-full object-cover" />
        ) : (
          <MapPin className="w-6 h-6 text-on-surface-variant" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-on-surface text-sm sm:text-base truncate">{title}</h3>
        {subtitle && <p className="text-sm text-on-surface-variant line-clamp-2">{subtitle}</p>}
        {meta && <p className="text-xs text-on-surface-variant mt-0.5">{meta}</p>}
        {statusChip && (
          <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${
            statusChip === 'pending' ? 'bg-amber-100 text-amber-800' :
            statusChip === 'approved' ? 'bg-emerald-100 text-emerald-800' :
            statusChip === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-surface-container-high text-on-surface-variant'
          }`}>{statusChip}</span>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Link href={openHref} className="inline-flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline">
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </Link>
          {actions?.map(a => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                disabled={a.busy}
                className={`inline-flex items-center gap-1 text-xs sm:text-sm ${
                  a.kind === 'danger' ? 'text-red-600 hover:text-red-800' : 'text-primary hover:underline'
                } disabled:opacity-50`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {a.busy ? 'Working…' : a.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label, cta }: { label: string; cta?: { href: string; text: string } }) {
  return (
    <div className="py-12 text-center">
      <AlertCircle className="w-8 h-8 mx-auto text-on-surface-variant/50" />
      <p className="mt-3 text-on-surface-variant">{label}</p>
      {cta && (
        <Link href={cta.href} className="inline-block mt-4 text-primary hover:underline">
          {cta.text} →
        </Link>
      )}
    </div>
  )
}
