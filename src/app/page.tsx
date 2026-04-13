import { Metadata } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminClient } from '@/lib/supabase-admin'
import HomeClient from '@/components/home/HomeClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'PlantsPack — Vegan Community Platform',
  description: '33,000+ vegan places across 117 countries. See your city\'s vegan ranking, find restaurants, stores, stays, and sanctuaries. 580+ recipes. Free forever.',
}

async function getTopCities() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const res = await fetch(`${baseUrl}/api/scores`, { next: { revalidate: 600 } })
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

  return <HomeClient topCities={topCities} recentPosts={normalizedPosts} cityImages={cityImages} />
}
