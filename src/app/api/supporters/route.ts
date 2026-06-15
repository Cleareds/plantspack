import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/supporters - Get list of supporters for the supporter wall
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Two paths to be on the supporters wall:
    //  1. Active Stripe subscription (subscription_tier != 'free')
    //  2. Non-Stripe donation tracked via donor_source (e.g. Buy Me a Coffee
    //     one-time donations, direct transfers). We do not have a BMC
    //     integration yet so these are set manually for now.
    const { data: supporters, error } = await supabase
      .from('users')
      .select('username, first_name, avatar_url, subscription_tier, donor_source')
      .or('and(subscription_tier.neq.free,subscription_tier.not.is.null),donor_source.not.is.null')
      .eq('is_banned', false)
      // Exclude internal/operational accounts that hold a paid tier for a
      // non-financial reason. The 'reviewer' account is provisioned with
      // subscription_tier='premium' so Apple App Store and Google Play
      // reviewers can exercise the gated AI features during submission
      // review — they are not real supporters. Per data policy we never
      // present a non-supporter as a supporter.
      .neq('username', 'reviewer')
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('[Supporters API] Error:', error)
      throw error
    }

    return NextResponse.json({ supporters: supporters || [] })
  } catch (error) {
    console.error('[Supporters API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supporters' },
      { status: 500 }
    )
  }
}
