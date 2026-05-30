/**
 * Server-side helpers to decide whether the current user has any authority
 * over a place (verified owner OR site admin). Used by the review-reply API
 * and any other "owner-only" / "owner-or-admin" action.
 *
 * The replies feature uses these to pick the `author_role` ('owner' vs
 * 'admin') BEFORE the RLS check fires. The DB-side RLS policy enforces the
 * same rule independently, so a forged client claim cannot bypass it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthorityRole = 'owner' | 'admin'

export interface AuthorityResult {
  /** Highest-priority role the user has for this place (admin > owner). */
  role: AuthorityRole | null
  isOwner: boolean
  isAdmin: boolean
}

/** Quick admin check via users.role. */
export async function isAdmin(sb: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await sb.from('users').select('role').eq('id', userId).maybeSingle()
  return data?.role === 'admin'
}

/** Does this user have a verified place_owners row for this place? */
export async function isPlaceOwner(
  sb: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<boolean> {
  const { data } = await sb
    .from('place_owners')
    .select('id')
    .eq('place_id', placeId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

/**
 * Resolve the strongest role the user has over this place. Admin wins
 * over owner when both apply (rare but possible: a staff member who also
 * runs a venue gets the more authoritative badge).
 */
export async function getAuthority(
  sb: SupabaseClient,
  userId: string,
  placeId: string,
): Promise<AuthorityResult> {
  const [admin, owner] = await Promise.all([
    isAdmin(sb, userId),
    isPlaceOwner(sb, userId, placeId),
  ])
  return {
    role: admin ? 'admin' : owner ? 'owner' : null,
    isOwner: owner,
    isAdmin: admin,
  }
}
