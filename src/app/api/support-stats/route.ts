import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { unstable_cache } from 'next/cache'

/**
 * GET /api/support-stats — honest, live numbers for the on-site supporter ask.
 *
 * Returns the real running cost, the real supporter count, and the % of cost
 * those supporters cover. Cached 1h so it's ~free per request across the app.
 * Numbers are deliberately un-inflated per the platform honesty rule: if 1
 * supporter covers ~4%, that's exactly what we show.
 */
const MONTHLY_COST_EUR = 70 // owner-confirmed 2026 total running cost (infra + services)
const SUPPORTER_MONTHLY_EUR = 3 // single Supporter tier price

const getStats = unstable_cache(
  async () => {
    const db = createAdminClient()
    // Same definition as the Supporters wall: active paid tier OR a tracked
    // donation, excluding the App Store 'reviewer' account and banned users.
    const { count } = await db
      .from('users')
      .select('id', { count: 'exact', head: true })
      .or('and(subscription_tier.neq.free,subscription_tier.not.is.null),donor_source.not.is.null')
      .eq('is_banned', false)
      .neq('username', 'reviewer')
    const supporterCount = count || 0
    const coveragePct = Math.round(((supporterCount * SUPPORTER_MONTHLY_EUR) / MONTHLY_COST_EUR) * 100)
    return { supporterCount, monthlyCostEur: MONTHLY_COST_EUR, coveragePct }
  },
  ['support-stats-v1'],
  { revalidate: 3600 },
)

export async function GET() {
  try {
    return NextResponse.json(await getStats())
  } catch {
    // Never break the caller; fall back to cost-only (no count claim).
    return NextResponse.json({ supporterCount: 0, monthlyCostEur: MONTHLY_COST_EUR, coveragePct: 0 })
  }
}
