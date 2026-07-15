/**
 * Direct-DB data loaders for the SSR directory pages (city / country /
 * region hubs).
 *
 * Cost refactor 2026-07-11: these pages previously fetched their own API
 * routes over HTTP (`/api/places/directory`, `/api/scores`,
 * `/api/cities/.../experiences`), so a single hub regeneration billed 3-4
 * Vercel function invocations plus data-cache reads/writes. Calling
 * Supabase directly makes a regeneration cost exactly one invocation.
 *
 * The API routes stay untouched - the mobile app and client-side code
 * consume them - and this module mirrors their query logic and response
 * shapes so both paths return identical data. If you change a query here,
 * change the corresponding route branch too.
 */
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase-admin'
import { slugToDisplay } from '@/lib/places/slugify'
import { computeAllScores } from '@/lib/compute-scores'

function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ')
}

const PLACE_COLS =
  'id, slug, name, category, subcategory, address, description, images, main_image_url, average_rating, review_count, is_pet_friendly, vegan_level, website, phone, opening_hours, latitude, longitude, city, country, cuisine_types, tags, verification_level, verification_method, last_verified_at'

// Same payload slim as the directory route: cards render main_image_url and
// a ~150-char snippet only, and every place ships in the RSC Flight payload.
function slimPlace(p: any) {
  return {
    ...p,
    main_image_url: p.main_image_url || (Array.isArray(p.images) ? p.images[0] : null),
    images: undefined,
    description:
      typeof p.description === 'string' && p.description.length > 240
        ? p.description.slice(0, 240) + '…'
        : p.description,
  }
}

/** Mirrors GET /api/places/directory?level=places&country=X&city=Y. React cache() dedupes generateMetadata + page body within one render. */
export const getCityPlacesDirect = cache(async function getCityPlacesDirect(countrySlug: string, citySlug: string) {
  const empty = { places: [] as any[], city: fromSlug(citySlug), country: fromSlug(countrySlug), total: 0 }
  try {
    const supabase = createAdminClient()
    // Canonical display-cased city/country from the directory view (handles
    // hyphens/accents; ties broken by place_count for casing variants).
    const { data: cityRows } = await supabase
      .from('directory_cities')
      .select('city, country')
      .eq('city_slug', citySlug)
      .ilike('country', fromSlug(countrySlug))
      .order('place_count', { ascending: false })
      .limit(1)
    const actualCity = cityRows?.[0]?.city || fromSlug(citySlug)
    const actualCountry = cityRows?.[0]?.country || fromSlug(countrySlug)

    const all: any[] = []
    const BATCH = 1000
    let from = 0
    while (true) {
      const { data: batch, error } = await supabase
        .from('places')
        .select(PLACE_COLS)
        .is('archived_at', null)
        .ilike('city', actualCity)
        .ilike('country', actualCountry)
        .order('name', { ascending: true })
        .range(from, from + BATCH - 1)
      if (error) throw error
      if (!batch || batch.length === 0) break
      all.push(...batch)
      if (batch.length < BATCH) break
      from += BATCH
    }

    return {
      places: all.map(slimPlace),
      city: all[0]?.city || slugToDisplay(citySlug),
      country: all[0]?.country || slugToDisplay(countrySlug),
      total: all.length,
    }
  } catch (e) {
    console.error('[directory-data] getCityPlacesDirect failed:', (e as Error)?.message)
    return empty
  }
})

/** Mirrors GET /api/places/directory?level=places&country=X (no city) */
export const getCountryPlacesDirect = cache(async function getCountryPlacesDirect(countrySlug: string, limit = 3000) {
  const empty = { places: [] as any[], country: fromSlug(countrySlug), total: 0 }
  try {
    const supabase = createAdminClient()
    const hardCap = Math.min(limit, 5000)
    const all: any[] = []
    let from = 0
    while (all.length < hardCap) {
      const pageSize = Math.min(1000, hardCap - all.length)
      const { data: page, error } = await supabase
        .from('places')
        .select(PLACE_COLS)
        .is('archived_at', null)
        .ilike('country', fromSlug(countrySlug))
        .order('name', { ascending: true })
        .range(from, from + pageSize - 1)
      if (error) throw error
      if (!page || page.length === 0) break
      all.push(...page)
      if (page.length < pageSize) break
      from += pageSize
    }
    return {
      places: all.map(slimPlace),
      country: all[0]?.country || slugToDisplay(countrySlug),
      total: all.length,
    }
  } catch (e) {
    console.error('[directory-data] getCountryPlacesDirect failed:', (e as Error)?.message)
    return empty
  }
})

/**
 * Mirrors GET /api/scores. computeAllScores reads the city_scores MV
 * (~30ms indexed) so calling it per hub regeneration is cheap.
 */
export const getScoresDirect = cache(async function getScoresDirect(): Promise<any[]> {
  try {
    const { scores } = await computeAllScores()
    return scores || []
  } catch (e) {
    console.error('[directory-data] getScoresDirect failed:', (e as Error)?.message)
    return []
  }
})

const EMPTY_EXPERIENCES_SUMMARY = {
  experience_count: 0,
  avg_overall_rating: null as number | null,
  avg_eating_out_rating: null as number | null,
  avg_grocery_rating: null as number | null,
}

/** Mirrors GET /api/cities/[country]/[city]/experiences (first page). */
export const getCityExperiencesDirect = cache(async function getCityExperiencesDirect(countrySlug: string, citySlug: string) {
  try {
    const supa = createAdminClient()
    const [{ data: experiences }, { data: summaryRows }] = await Promise.all([
      supa
        .from('city_experiences')
        .select(
          `id, user_id, overall_rating, eating_out_rating, grocery_rating,
           summary, tips, best_neighborhoods, visited_period, images,
           edited_at, edit_count, created_at,
           users:user_id (id, username, first_name, last_name, avatar_url, subscription_tier)`,
        )
        .eq('city_slug', citySlug)
        .eq('country_slug', countrySlug)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 19),
      supa
        .from('city_experiences_summary')
        .select('experience_count, avg_overall_rating, avg_eating_out_rating, avg_grocery_rating')
        .eq('city_slug', citySlug)
        .eq('country_slug', countrySlug)
        .limit(1),
    ])
    return {
      // Cast: supabase-js types the to-one `users` join as an array, but the
      // runtime shape is a single object (same rows the API route serialized).
      experiences: (experiences || []) as any[],
      summary: summaryRows?.[0] || EMPTY_EXPERIENCES_SUMMARY,
    }
  } catch (e) {
    console.error('[directory-data] getCityExperiencesDirect failed:', (e as Error)?.message)
    return { experiences: [], summary: EMPTY_EXPERIENCES_SUMMARY }
  }
})
