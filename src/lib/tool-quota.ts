import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export type ToolName = 'ingredient' | 'menu'
export type UserTier = 'guest' | 'user' | 'supporter'

// Lifetime guest limit. Cheap signal - cookies clear easily so this is a
// nudge, not a hard wall. The IP-hash join makes casual abuse mildly annoying.
const GUEST_LIFETIME_LIMIT = 1

// Per-month limit for signed-in non-supporters.
const USER_MONTHLY_LIMIT = 3

// Monthly $ ceiling for supporters. Stops a single user burning the budget.
const SUPPORTER_MONTHLY_BUDGET_USD = 1.0

// Global daily $ ceiling. Kill switch if something goes wrong.
const GLOBAL_DAILY_BUDGET_USD = 5.0

const SUPPORTER_TIERS = new Set(['supporter', 'premium', 'business'])

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'plantspack-tools'
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

export function hashImage(buf: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

export interface QuotaCheck {
  allowed: boolean
  tier: UserTier
  reason?: string
  remaining?: number
  cached?: ScanResult
}

export interface ScanResult {
  verdict: 'vegan' | 'not_vegan' | 'uncertain' | 'unclear' | 'invalid_image'
  summary: string
  visibility?: { fully_readable: boolean; issues?: string }
  items?: { name: string; status: 'vegan' | 'not_vegan' | 'uncertain'; note?: string }[]
}

export interface QuotaContext {
  userId: string | null
  guestId: string | null
  ip: string | null
  tool: ToolName
  imageHash?: string
}

async function getTier(userId: string | null): Promise<UserTier> {
  if (!userId) return 'guest'
  const sb = adminClient()
  const { data } = await sb
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .maybeSingle()
  const tier = data?.subscription_tier ?? 'free'
  const status = data?.subscription_status ?? 'inactive'
  if (SUPPORTER_TIERS.has(tier) && status === 'active') return 'supporter'
  return 'user'
}

export async function checkQuota(ctx: QuotaContext): Promise<QuotaCheck> {
  const sb = adminClient()
  const tier = await getTier(ctx.userId)

  // 0. Image-hash cache: if this exact image was successfully scanned before
  //    by anyone, return that result for free.
  if (ctx.imageHash) {
    const { data: cached } = await sb
      .from('tool_scans')
      .select('result')
      .eq('image_hash', ctx.imageHash)
      .eq('tool', ctx.tool)
      .eq('rejected', false)
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cached?.result) {
      return { allowed: true, tier, cached: cached.result as ScanResult }
    }
  }

  // 1. Global kill switch
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const { data: dailySpend } = await sb
    .from('tool_scans')
    .select('cost_usd')
    .gte('created_at', dayStart.toISOString())
  const todayUsd = (dailySpend ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
  if (todayUsd >= GLOBAL_DAILY_BUDGET_USD) {
    return { allowed: false, tier, reason: 'Daily scan budget reached. Try again tomorrow.' }
  }

  // 2. Per-user limits
  if (tier === 'guest') {
    const ipHash = ctx.ip ? hashIp(ctx.ip) : null
    let query = sb.from('tool_scans').select('id', { count: 'exact', head: true }).eq('tool', ctx.tool).eq('rejected', false)
    if (ctx.guestId) query = query.eq('guest_id', ctx.guestId)
    else if (ipHash) query = query.eq('ip_hash', ipHash)
    else return { allowed: false, tier, reason: 'Cannot verify guest identity.' }
    const { count } = await query
    const used = count ?? 0
    if (used >= GUEST_LIFETIME_LIMIT) {
      return {
        allowed: false,
        tier,
        reason: `You've used your free scan. Sign in for ${USER_MONTHLY_LIMIT} per month, or back PlantsPack for unlimited.`,
        remaining: 0,
      }
    }
    return { allowed: true, tier, remaining: GUEST_LIFETIME_LIMIT - used }
  }

  if (tier === 'user') {
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { count } = await sb
      .from('tool_scans')
      .select('id', { count: 'exact', head: true })
      .eq('tool', ctx.tool)
      .eq('rejected', false)
      .eq('user_id', ctx.userId!)
      .gte('created_at', monthStart.toISOString())
    const used = count ?? 0
    if (used >= USER_MONTHLY_LIMIT) {
      return {
        allowed: false,
        tier,
        reason: `You've used your ${USER_MONTHLY_LIMIT} free scans this month. Back PlantsPack for unlimited use.`,
        remaining: 0,
      }
    }
    return { allowed: true, tier, remaining: USER_MONTHLY_LIMIT - used }
  }

  // supporter: enforce $/month budget
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const { data: spend } = await sb
    .from('tool_scans')
    .select('cost_usd')
    .eq('user_id', ctx.userId!)
    .gte('created_at', monthStart.toISOString())
  const usedUsd = (spend ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
  if (usedUsd >= SUPPORTER_MONTHLY_BUDGET_USD) {
    return {
      allowed: false,
      tier,
      reason: `You've used your monthly tool budget ($${SUPPORTER_MONTHLY_BUDGET_USD.toFixed(2)}). Resets on the 1st.`,
    }
  }
  return { allowed: true, tier }
}

export async function logScan(args: {
  ctx: QuotaContext
  costUsd: number
  result?: ScanResult
  rejected?: boolean
  rejectReason?: string
}) {
  const sb = adminClient()
  await sb.from('tool_scans').insert({
    user_id: args.ctx.userId,
    guest_id: args.ctx.guestId,
    ip_hash: args.ctx.ip ? hashIp(args.ctx.ip) : null,
    tool: args.ctx.tool,
    cost_usd: args.costUsd,
    image_hash: args.ctx.imageHash ?? null,
    verdict: args.result?.verdict ?? null,
    result: args.result ?? null,
    rejected: args.rejected ?? false,
    reject_reason: args.rejectReason ?? null,
  })
}

export const LIMITS = {
  GUEST_LIFETIME_LIMIT,
  USER_MONTHLY_LIMIT,
  SUPPORTER_MONTHLY_BUDGET_USD,
  GLOBAL_DAILY_BUDGET_USD,
} as const
