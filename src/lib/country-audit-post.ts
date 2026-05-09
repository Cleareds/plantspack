import { cache } from 'react'
import { createAdminClient } from './supabase-admin'

/**
 * Look up the most recent published "country audit" blog post for a given
 * country. Used by the country page to surface a hero callout linking to
 * the audit writeup, which signals to Google that the blog post is the
 * authoritative source for the country's directory and pushes audit-post
 * page-rank up via internal linking.
 *
 * Convention: a post counts as the country's audit when its tags array
 * contains BOTH 'country-audit' and the country slug (e.g. 'belgium').
 * Returns null when no public audit exists yet.
 */
export interface CountryAuditPost {
  slug: string
  title: string
  description: string
  image_url: string | null
  created_at: string
}

export const getCountryAuditPost = cache(async (countrySlug: string): Promise<CountryAuditPost | null> => {
  const sb = createAdminClient()
  const { data } = await sb
    .from('posts')
    .select('slug, title, content, image_url, images, created_at, tags')
    .eq('category', 'article')
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .contains('tags', ['country-audit', countrySlug])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data || !data.slug) return null

  // Build a short clean description from the body (drop markdown markers).
  const description = (data.content || '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/[#*_`>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
    .replace(/\s\S*$/, '') + '...'

  return {
    slug: data.slug,
    title: data.title || '',
    description,
    image_url: data.image_url || (data.images?.[0] ?? null),
    created_at: data.created_at,
  }
})
