import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * Roadmap voting API.
 *
 * What changed in this iteration:
 *   - Votes are now toggle-able (insert or delete a single row) instead
 *     of one-shot batch submission. Re-voting is allowed; supporters
 *     can change their mind as the roadmap evolves.
 *   - Validation moves to a single allowlist of vote IDs that mirrors
 *     the page's roadmap items + country/city expansion options.
 *   - Supporters-only enforcement happens at both the app layer (here)
 *     and the DB layer (RLS policy). Defense in depth.
 *
 * Endpoints:
 *   GET  /api/roadmap/votes
 *     Returns: { votes: { [id]: count }, userVotes: string[] }
 *   POST /api/roadmap/votes  body: { id: string }
 *     Toggles the caller's vote on that item.
 */

// Single source of truth for valid vote IDs. Mirrors the roadmap page's
// items + the new country_city expansion options.
const VALID_VOTE_IDS = new Set<string>([
  // Existing feature items
  'packs',
  'trips',
  'social-feed',
  'mobile-app',
  'recipe-collection',
  'event-calendar',
  'browser-extension',
  'companion',
  'fixes-stability',
  'improve-notifications',
  'ios-app',
  'android-app',
  'better-packs',
  'internal-messaging',
  'remove-ai',
  'improve-ai',
  // Country/city expansion items
  'expand-germany-tier2',
  'expand-brazil',
  'expand-netherlands-beyond-amsterdam',
  'expand-greece',
  'expand-austria-portugal',
  'expand-eastern-europe',
  'expand-uk-tier2',
  'expand-spain-tier2',
])

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: allVotes, error: votesError } = await supabase
      .from('roadmap_votes')
      .select('feature_id, user_id')

    if (votesError) throw votesError

    const votes: Record<string, number> = {}
    for (const row of allVotes || []) {
      const id = (row as { feature_id: string }).feature_id
      if (VALID_VOTE_IDS.has(id)) votes[id] = (votes[id] || 0) + 1
    }

    const { data: { session } } = await supabase.auth.getSession()
    let userVotes: string[] = []
    if (session) {
      userVotes = (allVotes || [])
        .filter((v) => (v as { user_id: string }).user_id === session.user.id)
        .map((v) => (v as { feature_id: string }).feature_id)
        .filter((id) => VALID_VOTE_IDS.has(id))
    }

    return NextResponse.json({ votes, userVotes })
  } catch (error) {
    console.error('[Roadmap API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const tier = (user as { subscription_tier?: string }).subscription_tier
    if (!tier || !['medium', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Voting is a supporter perk. Become a supporter at /support to cast your vote.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : null
    if (!id || !VALID_VOTE_IDS.has(id)) {
      return NextResponse.json({ error: 'Invalid vote id' }, { status: 400 })
    }

    // Toggle: delete-if-exists, otherwise insert.
    const { data: existing } = await supabase
      .from('roadmap_votes')
      .select('feature_id')
      .eq('user_id', userId)
      .eq('feature_id', id)
      .maybeSingle()

    if (existing) {
      const { error: delErr } = await supabase
        .from('roadmap_votes')
        .delete()
        .eq('user_id', userId)
        .eq('feature_id', id)
      if (delErr) throw delErr
      return NextResponse.json({ voted: false })
    }

    const { error: insErr } = await supabase
      .from('roadmap_votes')
      .insert({ user_id: userId, feature_id: id })
    if (insErr) throw insErr
    return NextResponse.json({ voted: true })
  } catch (error) {
    console.error('[Roadmap API] POST error:', error)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}
