// Server-verified Sprouts awards. Client sends an `action` keyword + the
// reference ID; the server looks up the row and confirms the calling user
// actually owns it before awarding. Never trusts the client's amount.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { awardSprouts, type ActionType } from '@/lib/sprouts'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

type ClientAction = 'place_added' | 'post_published' | 'profile_field_filled' | 'correction_submitted'

export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'unauth' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = body.action as ClientAction
  const referenceId = body.referenceId as string | undefined

  let mapped: { actionType: ActionType; referenceType: string } | null = null

  switch (action) {
    case 'place_added': {
      if (!referenceId) return NextResponse.json({ ok: false, reason: 'missing_ref' }, { status: 400 })
      const { data: place } = await admin.from('places')
        .select('id, created_by, main_image_url').eq('id', referenceId).maybeSingle()
      if (!place || place.created_by !== user.id) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 })
      mapped = { actionType: place.main_image_url ? 'add_place_with_image' : 'add_place', referenceType: 'place' }
      break
    }
    case 'post_published': {
      if (!referenceId) return NextResponse.json({ ok: false, reason: 'missing_ref' }, { status: 400 })
      const { data: post } = await admin.from('posts')
        .select('id, user_id, category, content_type').eq('id', referenceId).maybeSingle()
      if (!post || post.user_id !== user.id) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 })
      const cat = post.category || post.content_type
      const actionType: ActionType | null =
        cat === 'journey' ? 'post_share_journey'
        : cat === 'recipe' ? 'post_recipe'
        : cat === 'tip' ? 'post_tip' : null
      if (!actionType) return NextResponse.json({ ok: false, reason: 'unmapped_category' }, { status: 400 })
      mapped = { actionType, referenceType: 'post' }
      break
    }
    case 'correction_submitted': {
      // Note: actual award happens when correction is approved, not submitted.
      // Returning ok=false reason=pending so the client knows it's not yet credited.
      return NextResponse.json({ ok: false, reason: 'awaits_approval' })
    }
    case 'profile_field_filled': {
      const field = body.field as string
      const ALLOWED = new Set([
        'is_vegan','vegan_since','vegan_reasons','transition_story','favourite_vegan_meal',
        'current_challenges','dietary_specifics','cooking_frequency','home_city','bio','avatar',
      ])
      if (!ALLOWED.has(field)) return NextResponse.json({ ok: false, reason: 'bad_field' }, { status: 400 })
      // Verify the field actually has a value
      const { data: prof } = await admin.from('users').select(field === 'avatar' ? 'avatar_url' : field).eq('id', user.id).single()
      const v = (prof as any)?.[field === 'avatar' ? 'avatar_url' : field]
      const present = Array.isArray(v) ? v.length > 0 : Boolean(v)
      if (!present) return NextResponse.json({ ok: false, reason: 'field_empty' }, { status: 400 })
      const r = await awardSprouts({
        userId: user.id, actionType: `profile.${field}` as ActionType,
        referenceType: 'profile_field', referenceId: null, metadata: { field },
      })
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    default:
      return NextResponse.json({ ok: false, reason: 'unknown_action' }, { status: 400 })
  }

  const r = await awardSprouts({
    userId: user.id, actionType: mapped.actionType,
    referenceType: mapped.referenceType, referenceId,
  })
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
