import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://plantspack.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // Static pages
  const staticPages = [
    { url: SITE_URL, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${SITE_URL}/map`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/recipes`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/events`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/packs`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${SITE_URL}/support`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${SITE_URL}/roadmap`, changeFrequency: 'weekly' as const, priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly' as const, priority: 0.3 },
  ]
  entries.push(...staticPages)

  // Public posts (recipes, events, and other public posts)
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, category, created_at, updated_at')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (posts) {
      for (const post of posts) {
        const prefix = post.category === 'recipe' ? 'recipe'
          : post.category === 'event' ? 'event'
          : 'post'
        entries.push({
          url: `${SITE_URL}/${prefix}/${post.id}`,
          lastModified: post.updated_at || post.created_at,
          changeFrequency: 'weekly',
          priority: post.category === 'recipe' || post.category === 'event' ? 0.7 : 0.6,
        })
      }
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching posts:', e)
  }

  // Places
  try {
    const { data: places } = await supabase
      .from('places')
      .select('id, updated_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (places) {
      for (const place of places) {
        entries.push({
          url: `${SITE_URL}/place/${place.id}`,
          lastModified: place.updated_at || place.created_at,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching places:', e)
  }

  // Public user profiles
  try {
    const { data: users } = await supabase
      .from('users')
      .select('username, updated_at')
      .eq('is_banned', false)
      .not('username', 'is', null)
      .limit(5000)

    if (users) {
      for (const user of users) {
        if (user.username) {
          entries.push({
            url: `${SITE_URL}/profile/${user.username}`,
            lastModified: user.updated_at,
            changeFrequency: 'weekly',
            priority: 0.5,
          })
        }
      }
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching users:', e)
  }

  // Packs
  try {
    const { data: packs } = await supabase
      .from('packs')
      .select('id, updated_at, created_at')
      .eq('is_published', true)
      .limit(2000)

    if (packs) {
      for (const pack of packs) {
        entries.push({
          url: `${SITE_URL}/packs/${pack.id}`,
          lastModified: pack.updated_at || pack.created_at,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  } catch (e) {
    console.error('[Sitemap] Error fetching packs:', e)
  }

  return entries
}
