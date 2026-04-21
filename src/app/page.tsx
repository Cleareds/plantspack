import { Metadata } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import HomeClient from '@/components/home/HomeClient'

// Top cities + posts cache for 60s. The per-user location-aware content
// is fetched per-request using `dynamic = 'force-dynamic'` semantics via
// the cookies() call — the page becomes dynamic whenever location cookies
// exist, so each pinned user gets their own server-rendered home.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'PlantsPack — Vegan Places, Recipes & City Rankings Worldwide',
  description: '37,000+ vegan restaurants, shops, and stays across 170+ countries. Compare 1,000+ cities by vegan-friendliness, browse 580+ recipes, and post reviews. Free, ad-free.',
  alternates: { canonical: 'https://plantspack.com' },
}

async function getTopCities() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/scores`, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.scores?.slice(0, 8) || []
  } catch {
    return []
  }
}

async function getRecentPosts() {
  const supabase = createAdminClient()
  const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
  const { data } = await supabase
    .from('posts')
    .select(`
      id, title, content, category, images, image_url, created_at, slug,
      users!inner(username, first_name, avatar_url),
      post_reactions(id),
      comments(id)
    `)
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .or(`user_id.neq.${ADMIN_ID},category.not.in.(recipe,event)`)
    // Pinned posts (admin announcements) float to the top
    .order('is_pinned', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(8)
  return data || []
}

function getCityImages(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'public/data/city-images.json'), 'utf-8'))
  } catch {
    return {}
  }
}

async function getInitialLocationData() {
  // Pull location hints from cookies set by the client (HomeClient syncs them
  // from localStorage on mount — pinned city takes priority over geolocation).
  // If anything's there, SSR the nearby-places payload so pinned users don't
  // see the search-bar flash on first paint.
  try {
    const c = await cookies()
    const pinnedCity = c.get('pp_pinned_city')?.value
    const pinnedCountry = c.get('pp_pinned_country')?.value
    const geoLat = c.get('pp_user_lat')?.value
    const geoLng = c.get('pp_user_lng')?.value
    const geoCity = c.get('pp_user_city')?.value
    const geoCountry = c.get('pp_user_country')?.value

    const params = new URLSearchParams()
    if (pinnedCity) {
      params.set('city', pinnedCity)
      if (pinnedCountry) params.set('country', pinnedCountry)
    } else if (geoLat || geoCity) {
      if (geoLat) params.set('lat', geoLat)
      if (geoLng) params.set('lng', geoLng)
      if (geoCity) params.set('city', geoCity)
      if (geoCountry) params.set('country', geoCountry)
    } else {
      return null
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/home?${params.toString()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return {
      data,
      city: pinnedCity || geoCity || '',
      country: pinnedCountry || geoCountry || '',
    }
  } catch {
    return null
  }
}

export default async function Home() {
  const [topCities, recentPosts, initialLocation] = await Promise.all([
    getTopCities(),
    getRecentPosts(),
    getInitialLocationData(),
  ])

  const cityImages = getCityImages()

  // Normalize users from array (Supabase join) to single object
  const normalizedPosts = recentPosts.map((p: any) => ({
    ...p,
    users: Array.isArray(p.users) ? p.users[0] : p.users,
  }))

  return (
    <>
      {/* SSR h1 for SEO crawlers that don't execute JS */}
      <h1 className="sr-only">PlantsPack — Find Vegan Places, Recipes & City Rankings Worldwide</h1>
      <HomeClient
        topCities={topCities}
        recentPosts={normalizedPosts}
        cityImages={cityImages}
        initialLocation={initialLocation}
      />
    </>
  )
}
