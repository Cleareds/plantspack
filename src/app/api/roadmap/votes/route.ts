import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const ROADMAP_FEATURES = [
  'ios-app',
  'android-app',
  'better-packs',
  'internal-messaging',
  'fixes-stability',
  'remove-ai',
  'improve-ai',
  'improve-notifications'
]

/**
 * GET /api/roadmap/votes - Get all votes and check if user has voted
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all votes
    const { data: allVotes, error: votesError } = await supabase
      .from('roadmap_votes')
      .select('feature_id')

    if (votesError) {
      console.error('[Roadmap API] Error fetching votes:', votesError)
      throw votesError
    }

    // Count votes per feature
    const votes: Record<string, number> = {}
    ROADMAP_FEATURES.forEach(feature => {
      votes[feature] = 0
    })

    allVotes?.forEach(vote => {
      if (votes[vote.feature_id] !== undefined) {
        votes[vote.feature_id]++
      }
    })

    // Check if current user has voted
    const { data: { session } } = await supabase.auth.getSession()
    let hasVoted = false

    if (session) {
      const { data: userVotes } = await supabase
        .from('roadmap_votes')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)

      hasVoted = (userVotes?.length || 0) > 0
    }

    return NextResponse.json({
      votes,
      hasVoted
    })
  } catch (error) {
    console.error('[Roadmap API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/roadmap/votes - Submit votes (Support/Premium only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user profile to check subscription
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has Support or Premium subscription
    if (user.subscription_tier !== 'medium' && user.subscription_tier !== 'premium') {
      return NextResponse.json(
        { error: 'Voting is only available for Support and Premium members' },
        { status: 403 }
      )
    }

    // Check if user has already voted
    const { data: existingVotes } = await supabase
      .from('roadmap_votes')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json(
        { error: 'You have already voted' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { features } = body

    if (!Array.isArray(features) || features.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one feature' },
        { status: 400 }
      )
    }

    // Validate features
    const validFeatures = features.filter(f => ROADMAP_FEATURES.includes(f))
    if (validFeatures.length === 0) {
      return NextResponse.json(
        { error: 'No valid features selected' },
        { status: 400 }
      )
    }

    // Insert votes
    const votesToInsert = validFeatures.map(featureId => ({
      user_id: userId,
      feature_id: featureId
    }))

    const { error: insertError } = await supabase
      .from('roadmap_votes')
      .insert(votesToInsert)

    if (insertError) {
      console.error('[Roadmap API] Error inserting votes:', insertError)
      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: 'Votes submitted successfully'
    })
  } catch (error) {
    console.error('[Roadmap API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit votes' },
      { status: 500 }
    )
  }
}
