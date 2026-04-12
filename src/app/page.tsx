import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-admin'
import HomeClient from '@/components/home/HomeClient'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'PlantsPack — Vegan Community Platform',
  description: 'Discover vegan and vegan-friendly restaurants, cafes, stores, stays, and animal sanctuaries worldwide. See your city\'s ranking and help improve it.',
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
    .order('created_at', { ascending: false })
    .limit(8)
  return data || []
}

export default async function Home() {
  const [topCities, recentPosts] = await Promise.all([
    getTopCities(),
    getRecentPosts(),
  ])

  // Normalize users from array (Supabase join) to single object
  const normalizedPosts = recentPosts.map((p: any) => ({
    ...p,
    users: Array.isArray(p.users) ? p.users[0] : p.users,
  }))

  return <HomeClient topCities={topCities} recentPosts={normalizedPosts} />
}
