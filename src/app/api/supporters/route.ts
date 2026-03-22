import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/supporters - Get list of supporters for the supporter wall
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: supporters, error } = await supabase
      .from('users')
      .select('username, first_name, avatar_url, subscription_tier')
      .neq('subscription_tier', 'free')
      .not('subscription_tier', 'is', null)
      .eq('is_banned', false)
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
