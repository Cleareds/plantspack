import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeCity } from '@/lib/normalize-city'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import { geocodingService } from '@/lib/geocoding'
import { createPlacePost } from '@/lib/places/place-post'
import { createNotification } from '@/lib/notifications/server'
import { notifyNearbyUsers } from '@/lib/notifications/nearby'

const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const VALID_LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']
const VALID_CATEGORIES = ['eat', 'hotel', 'event', 'store', 'organisation', 'other']

export interface ApproveResult {
  ok: boolean
  placeId?: string
  slug?: string | null
  postId?: string | null
  nearbyNotified?: number
  already?: string
  error?: string
}

/**
 * Approve a pending place_submission → live place, and fan out the side effects
 * a confirmation should have. Shared by the admin approve route and the daily
 * batch script so both behave identically.
 *
 * Honest community semantics (per CLAUDE.md): the place lands is_verified=false,
 * verification_method='community_submission', source='mobile-suggest' — NOT
 * admin-verified. Geocodes the address when the submission has no coords (the
 * mobile form often omits them), which the old approve route did not do.
 *
 * Side effects on success: feed post authored by the submitter, a
 * submission_approved notification to them, and place_nearby notifications to
 * users in that city.
 */
export async function approveSubmission(
  submissionId: string,
  opts: { reviewerId?: string; veganLevel?: string; reviewNote?: string } = {}
): Promise<ApproveResult> {
  const admin = createAdminClient()

  const { data: sub, error: loadErr } = await admin
    .from('place_submissions').select('*').eq('id', submissionId).single()
  if (loadErr || !sub) return { ok: false, error: 'Submission not found' }
  if (sub.status !== 'pending') return { ok: false, already: sub.status }

  // Geocode when the submission has no coordinates.
  let latitude = sub.latitude as number | null
  let longitude = sub.longitude as number | null
  if (latitude == null || longitude == null) {
    try {
      const q = [sub.address, sub.city, sub.country].filter(Boolean).join(', ')
      const [hit] = await geocodingService.search(q, { limit: 1 })
      if (hit) { latitude = parseFloat(hit.lat); longitude = parseFloat(hit.lon) }
    } catch (e) {
      console.warn('[approveSubmission] geocode failed', (e as Error)?.message)
    }
  }
  // Fallback: a hard-to-parse street address (common for non-Western
  // addresses) shouldn't block approval — geocode just city + country so we get
  // an approximate marker instead of failing.
  if ((latitude == null || longitude == null) && (sub.city || sub.country)) {
    try {
      const [hit] = await geocodingService.search([sub.city, sub.country].filter(Boolean).join(', '), { limit: 1 })
      if (hit) { latitude = parseFloat(hit.lat); longitude = parseFloat(hit.lon) }
    } catch { /* fall through to the guard below */ }
  }
  // Still no coordinates → return a clear, actionable error rather than letting
  // the NOT NULL constraint throw a raw DB error at insert time.
  if (latitude == null || longitude == null) {
    return { ok: false, error: 'Could not geocode this address. Add coordinates to the submission and retry.' }
  }

  const veganLevel = VALID_LEVELS.includes(opts.veganLevel ?? '')
    ? opts.veganLevel
    : (VALID_LEVELS.includes(sub.vegan_level) ? sub.vegan_level : 'vegan_friendly')
  const category = VALID_CATEGORIES.includes(sub.category) ? sub.category : 'eat'

  // Carry any photos the submitter attached onto the published place.
  const subImages: string[] = Array.isArray(sub.images) ? sub.images.filter((u: unknown) => typeof u === 'string') : []

  const placeRow = {
    name: String(sub.name).slice(0, 200),
    address: sub.address || sub.city || sub.country || 'Unknown',
    city: normalizeCity(sub.city, sub.country) || sub.city,
    country: sub.country,
    latitude,
    longitude,
    website: sub.website,
    vegan_level: veganLevel,
    source: 'mobile-suggest',
    category,
    description: sub.notes || null,
    tags: ['mobile-suggest', 'community-submitted'],
    images: subImages.length ? subImages : null,
    main_image_url: subImages[0] ?? null,
    is_verified: false,
    verification_status: 'unverified',
    verification_method: 'community_submission',
    // Attribute the place to the community member who suggested it (shows their
    // name + links to their profile), NOT the admin. Falls back to admin only if
    // the submission somehow has no user.
    created_by: sub.user_id || ADMIN_USER_ID,
  }

  const { data: place, error: insErr } = await admin
    .from('places').insert(placeRow).select('id, slug, name, city, country').single()
  if (insErr) return { ok: false, error: `insert place: ${insErr.message}` }

  const { error: linkErr } = await admin.from('place_submissions').update({
    status: 'approved',
    reviewed_by: opts.reviewerId ?? ADMIN_USER_ID,
    reviewed_at: new Date().toISOString(),
    imported_place_id: place.id,
    review_note: opts.reviewNote ?? null,
  }).eq('id', submissionId)
  if (linkErr) return { ok: false, error: `link submission: ${linkErr.message}` }

  // Side effects — best-effort, never fail the approval.
  const postId = sub.user_id
    // Pass the submitted photo(s) so the auto feed-post shows a thumbnail on the
    // homepage — the feed card renders post.images, not the linked place image.
    ? await createPlacePost({ userId: sub.user_id, placeId: place.id, placeName: place.name, images: subImages, auto: true })
    : null
  if (sub.user_id) {
    await createNotification({
      userId: sub.user_id,
      type: 'submission_approved',
      entityType: 'place',
      entityId: place.id,
      message: `Your suggestion is live: ${place.name} is now on PlantsPack 🌱`,
    })
  }
  const nearbyNotified = await notifyNearbyUsers({ place, excludeUserId: sub.user_id })

  // ISR revalidation only works inside a request/server-action context; in the
  // standalone batch script next/cache throws — swallow it there.
  try {
    const { revalidatePath } = await import('next/cache')
    if (place.slug) revalidatePath(`/place/${place.slug}`)
    const cs = slugifyCityOrCountry(place.country)
    const ci = slugifyCityOrCountry(place.city)
    if (cs) { revalidatePath(`/vegan-places/${cs}`); if (ci) revalidatePath(`/vegan-places/${cs}/${ci}`) }
  } catch { /* not in a request context (batch) */ }

  return { ok: true, placeId: place.id, slug: place.slug, postId, nearbyNotified }
}
