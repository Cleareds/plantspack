/**
 * Reply to a place review. Verified place owners and site admins only.
 *
 * - POST upserts a reply for the calling user. Each review can carry at most
 *   one owner reply and one admin reply (DB unique constraint on
 *   review_id + author_role). If the same user posts again, we update the
 *   existing row and bump edit_count / edited_at.
 * - DELETE soft-deletes the calling user's reply (only theirs).
 *
 * Authorisation:
 *   - The server resolves the user's role via src/lib/place-owner.ts
 *     (admin > owner). The role is set on the row and the DB-side RLS
 *     policy independently verifies it. A user with neither role gets 403.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getAuthority } from '@/lib/place-owner'

const MAX_LENGTH = 1000

async function revalidatePlace(placeId: string) {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await admin
      .from('places')
      .select('slug,id')
      .eq(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(placeId) ? 'id' : 'slug', placeId)
      .maybeSingle()
    if (data?.slug) revalidatePath(`/place/${data.slug}`)
    if (data?.id) revalidatePath(`/place/${data.id}`)
  } catch { /* non-blocking */ }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const { id: placeRef, reviewId } = await params

  try {
    const { createClient: createAuthClient } = await import('@/lib/supabase-server')
    const supabase = await createAuthClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Banned-user guard
    const { data: profile } = await admin
      .from('users')
      .select('is_banned')
      .eq('id', session.user.id)
      .single()
    if (profile?.is_banned) {
      return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })
    }

    // Resolve the review and its place
    const { data: review } = await admin
      .from('place_reviews')
      .select('id, place_id, deleted_at')
      .eq('id', reviewId)
      .maybeSingle()
    if (!review || review.deleted_at) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Authority check
    const authority = await getAuthority(admin, session.user.id, review.place_id)
    if (!authority.role) {
      return NextResponse.json(
        { error: 'Only the place owner or a PlantsPack admin can reply' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const rawContent = typeof body?.content === 'string' ? body.content.trim() : ''
    if (!rawContent || rawContent.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: `Reply must be 1-${MAX_LENGTH} characters` },
        { status: 400 },
      )
    }

    // Upsert: try update first; if no row, insert. Using two-step to stay
    // explicit about edit_count bumps and to not over-trust ON CONFLICT.
    const { data: existing } = await admin
      .from('place_review_replies')
      .select('id, edit_count')
      .eq('review_id', reviewId)
      .eq('author_role', authority.role)
      .maybeSingle()

    let saved
    if (existing) {
      // Only the original author may edit. Different admins editing each
      // other's replies is blocked.
      const { data: ownedCheck } = await admin
        .from('place_review_replies')
        .select('user_id')
        .eq('id', existing.id)
        .single()
      if (ownedCheck?.user_id !== session.user.id) {
        return NextResponse.json(
          { error: 'Another ' + authority.role + ' has already replied to this review' },
          { status: 409 },
        )
      }
      const { data, error } = await admin
        .from('place_review_replies')
        .update({
          content: rawContent,
          edited_at: new Date().toISOString(),
          edit_count: (existing.edit_count ?? 0) + 1,
        })
        .eq('id', existing.id)
        .select(`
          id, review_id, user_id, author_role, content,
          edited_at, edit_count, created_at, updated_at,
          users:user_id ( id, username, first_name, last_name, avatar_url )
        `)
        .single()
      if (error) throw error
      saved = data
    } else {
      const { data, error } = await admin
        .from('place_review_replies')
        .insert({
          review_id: reviewId,
          user_id: session.user.id,
          author_role: authority.role,
          content: rawContent,
        })
        .select(`
          id, review_id, user_id, author_role, content,
          edited_at, edit_count, created_at, updated_at,
          users:user_id ( id, username, first_name, last_name, avatar_url )
        `)
        .single()
      if (error) throw error
      saved = data
    }

    await revalidatePlace(placeRef)
    return NextResponse.json({ reply: saved })
  } catch (e: unknown) {
    console.error('[Reply POST]', e)
    const msg = e instanceof Error ? e.message : 'Failed to save reply'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const { id: placeRef, reviewId } = await params
  try {
    const { createClient: createAuthClient } = await import('@/lib/supabase-server')
    const supabase = await createAuthClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Soft-delete the user's own reply on this review (any role).
    const { data, error } = await admin
      .from('place_review_replies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('review_id', reviewId)
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .select('id')
    if (error) throw error
    if (!data?.length) {
      return NextResponse.json({ error: 'No reply to delete' }, { status: 404 })
    }
    await revalidatePlace(placeRef)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[Reply DELETE]', e)
    const msg = e instanceof Error ? e.message : 'Failed to delete reply'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
