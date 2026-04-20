import { Metadata } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminClient } from '@/lib/supabase-admin'
import HomeClient from '@/components/home/HomeClient'

// Short revalidate so new posts + pinned announcements appear quickly
// in the community widget. Top-cities fetch below keeps its own 24h cache.
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

export default async function Home() {
  const [topCities, recentPosts] = await Promise.all([
    getTopCities(),
    getRecentPosts(),
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
      <HomeClient topCities={topCities} recentPosts={normalizedPosts} cityImages={cityImages} />
    </>
  )
}
