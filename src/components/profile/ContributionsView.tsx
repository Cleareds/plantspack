'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Loader2, ExternalLink, MapPin, AlertCircle } from 'lucide-react'

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

interface Row {
  key: string
  thumb: string | null
  title: string
  subtitle: string
  meta: string
  href: string
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
      setRows(fetched)
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

async function fetchContrib(userId: string, type: ContribType): Promise<Row[]> {
  if (type === 'places') {
    const { data } = await supabase
      .from('places')
      .select('id, slug, name, city, country, category, main_image_url, images, created_at')
      .eq('created_by', userId).is('archived_at', null)
      .order('created_at', { ascending: false }).limit(100)
    return (data || []).map((p: any) => ({
      key: p.id,
      thumb: p.main_image_url || (Array.isArray(p.images) ? p.images[0] : null),
      title: p.name,
      subtitle: [p.city, p.country].filter(Boolean).join(', '),
      meta: `Added ${timeAgo(p.created_at)}${p.category ? ' · ' + p.category : ''}`,
      href: `/place/${p.slug}`,
    }))
  }
  if (type === 'reviews') {
    const { data } = await supabase
      .from('place_reviews')
      .select('id, rating, content, created_at, places:place_id (id, name, slug, city, country, main_image_url)')
      .eq('user_id', userId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(100)
    return (data || []).map((r: any) => ({
      key: r.id,
      thumb: r.places?.main_image_url || null,
      title: `★ ${r.rating} — ${r.places?.name ?? 'Deleted place'}`,
      subtitle: r.content ? r.content.slice(0, 160) + (r.content.length > 160 ? '…' : '') : '',
      meta: `Posted ${timeAgo(r.created_at)}${r.places?.city ? ' · ' + r.places.city : ''}`,
      href: r.places?.slug ? `/place/${r.places.slug}#review-${r.id}` : '#',
    }))
  }
  if (type === 'experiences') {
    const { data } = await supabase
      .from('city_experiences')
      .select('id, city, country, city_slug, country_slug, overall_rating, summary, tips, created_at')
      .eq('user_id', userId).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(100)
    return (data || []).map((e: any) => ({
      key: e.id,
      thumb: null,
      title: `${e.city}, ${e.country}`,
      subtitle: e.summary ? e.summary.slice(0, 160) + (e.summary.length > 160 ? '…' : '') : '',
      meta: `★ ${e.overall_rating} · ${e.tips?.length ?? 0} tip${e.tips?.length === 1 ? '' : 's'} · shared ${timeAgo(e.created_at)}`,
      href: `/vegan-places/${e.country_slug}/${e.city_slug}`,
    }))
  }
  if (type === 'posts') {
    const { data } = await supabase
      .from('posts')
      .select('id, title, content, category, slug, images, created_at, privacy')
      .eq('user_id', userId).is('deleted_at', null)
      .eq('privacy', 'public')
      .not('category', 'in', '(recipe,event)')
      .order('created_at', { ascending: false }).limit(100)
    return (data || []).map((p: any) => ({
      key: p.id,
      thumb: p.images?.[0] ?? null,
      title: p.title || (p.content.length > 60 ? p.content.slice(0, 60) + '…' : p.content),
      subtitle: p.title ? (p.content.length > 160 ? p.content.slice(0, 160) + '…' : p.content) : '',
      meta: `Posted ${timeAgo(p.created_at)}${p.category ? ' · ' + p.category : ''}`,
      href: `/post/${p.slug || p.id}`,
    }))
  }
  if (type === 'packs') {
    const { data } = await supabase
      .from('packs')
      .select('id, title, slug, description, banner_url, created_at')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false }).limit(100)
    return (data || []).map((pk: any) => ({
      key: pk.id,
      thumb: pk.banner_url,
      title: pk.title,
      subtitle: pk.description ? pk.description.slice(0, 160) : '',
      meta: `Created ${timeAgo(pk.created_at)}`,
      href: `/packs/${pk.slug}`,
    }))
  }
  return []
}
