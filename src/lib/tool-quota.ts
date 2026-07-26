import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export type ToolName = 'ingredient' | 'menu'
export type UserTier = 'guest' | 'user' | 'supporter'

// Per-month guest limit. Cheap signal - cookies/device-ids clear easily so this
// is a nudge, not a hard wall. The IP-hash join makes casual abuse mildly
// annoying. Bump later once we see how much people like the tools.
const GUEST_MONTHLY_LIMIT = 1

// Per-month limit for signed-in non-supporters.
const USER_MONTHLY_LIMIT = 3

// Monthly $ ceiling for supporters. Stops a single user burning the budget.
const SUPPORTER_MONTHLY_BUDGET_USD = 1.0

// Global daily $ ceiling. Kill switch if something goes wrong.
const GLOBAL_DAILY_BUDGET_USD = 5.0

// Guest scans are counted per guest_id, which is a client-supplied value (a
// cookie on web, an `x-guest-id` header from the app). Anyone can rotate it and
// get a fresh monthly allowance, so guest_id alone is a nudge, not a limit.
// These two per-IP daily caps are the actual backstop: generous enough that a
// shared café/carrier NAT never blocks real users, tight enough that grinding
// the endpoint costs us cents rather than the whole daily budget.
const GUEST_IP_DAILY_LIMIT = 8

// Pre-classifier rejects don't consume a monthly scan (the user got nothing),
// but they DO cost money — roughly $0.0005 each. Without a cap, rejects are a
// free unlimited spend channel. Applies to every non-admin tier.
const REJECT_IP_DAILY_LIMIT = 10

// Real paid subscription_tier values in the DB are 'medium' (the €3/month
// Supporter tier) and legacy 'premium'. The earlier set used 'supporter' /
// 'business', which NEVER exist in the DB — so paying 'medium' supporters were
// silently capped at the free 3/month and the advertised "unlimited scans"
// perk did not work for them. Fixed 2026-07-24.
const SUPPORTER_TIERS = new Set(['medium', 'premium'])

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
  items?: {
    name: string
    /** Vegan judgement ONLY. Never carries allergen information. */
    status: 'vegan' | 'not_vegan' | 'uncertain'
    note?: string
    /** Which of the user's allergens this item contains, if any. A vegan item
     *  can carry an allergen — the two signals are independent. */
    allergen?: string
  }[]
  /** Union of the user's allergens found anywhere in this scan. Reported by the
   *  model and cross-checked server-side against the shared keyword matcher.
   *  Kept as a plain string array for clients that predate allergenMatches. */
  allergenHits?: string[]
  /** Same findings, split by whether the allergen is an actual ingredient or
   *  only a precautionary "may contain" warning. */
  allergenMatches?: { allergen: string; kind: 'contains' | 'may_contain' }[]
  /** E-codes detected in the OCR'd / submitted text (ingredient scanner).
   *  Populated by api/tools/scan after the model returns its verdict;
   *  surfaces additive-level explanations in the UI. */
  eCodeHits?: {
    code: string
    name: string
    status: 'vegan' | 'non_vegan' | 'maybe'
    note: string
    allergen?: string
  }[]
}

export interface QuotaContext {
  userId: string | null
  guestId: string | null
  ip: string | null
  tool: ToolName
  imageHash?: string
}

async function isAdmin(sb: ReturnType<typeof adminClient>, userId: string): Promise<boolean> {
  const { data } = await sb.from('users').select('role').eq('id', userId).maybeSingle()
  return data?.role === 'admin'
}

async function getTier(userId: string | null): Promise<UserTier> {
  if (!userId) return 'guest'
  const sb = adminClient()
  const { data } = await sb
    .from('users')
    .select('subscription_tier, subscription_status, role')
    .eq('id', userId)
    .maybeSingle()
  // Site admins skip tier limits (handled by early-return in checkQuota).
  // Still report 'supporter' so any UI that reads back the tier string
  // shows the unlimited-style messaging.
  if (data?.role === 'admin') return 'supporter'
  const tier = data?.subscription_tier ?? 'free'
  const status = data?.subscription_status ?? 'inactive'
  if (SUPPORTER_TIERS.has(tier) && status === 'active') return 'supporter'
  return 'user'
}

/**
 * Sum cost_usd over a window. PostgREST caps a single read at 1000 rows, so the
 * previous `select('cost_usd').gte(...)` + JS reduce silently under-counted once
 * a day crossed ~1000 scans — at ~$0.005/scan that ceiling sits just under the
 * $5 kill switch, so the switch could never actually trip. Page through instead
 * and stop early once we're past the ceiling we're testing against.
 */
async function sumCostSince(
  sb: ReturnType<typeof adminClient>,
  sinceIso: string,
  opts: { userId?: string; stopAtUsd?: number } = {},
): Promise<number> {
  const PAGE = 1000
  let total = 0
  for (let page = 0; page < 100; page++) {
    let q = sb
      .from('tool_scans')
      .select('cost_usd')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (opts.userId) q = q.eq('user_id', opts.userId)
    const { data, error } = await q
    if (error || !data) break
    total += data.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
    if (data.length < PAGE) break
    if (opts.stopAtUsd !== undefined && total >= opts.stopAtUsd) break
  }
  return total
}

/**
 * Daily abuse counters. Guests are keyed on IP hash — the one identifier they
 * can't rotate at will — while signed-in users are keyed on their own account so
 * that a shared carrier/office IP can never block them for someone else's
 * behaviour.
 */
async function dailyCounts(
  sb: ReturnType<typeof adminClient>,
  ctx: QuotaContext,
  tier: UserTier,
  dayStartIso: string,
): Promise<{ rejects: number; guestScans: number }> {
  const ipHash = ctx.ip ? hashIp(ctx.ip) : null
  const actor: { col: 'ip_hash' | 'guest_id' | 'user_id'; val: string } | null =
    tier === 'guest'
      ? ipHash
        ? { col: 'ip_hash', val: ipHash }
        : ctx.guestId
          ? { col: 'guest_id', val: ctx.guestId }
          : null
      : ctx.userId
        ? { col: 'user_id', val: ctx.userId }
        : null

  // Only the two AI tools cost money. Barcode/cosmetics lookups also land in
  // tool_scans (as free history rows) and must never consume an AI allowance.
  const AI_TOOLS = ['ingredient', 'menu']
  const rejectQ = sb.from('tool_scans').select('id', { count: 'exact', head: true })
    .in('tool', AI_TOOLS).eq('rejected', true).gte('created_at', dayStartIso)
  const guestQ = sb.from('tool_scans').select('id', { count: 'exact', head: true })
    .in('tool', AI_TOOLS).is('user_id', null).eq('rejected', false).gte('created_at', dayStartIso)
  if (actor) {
    rejectQ.eq(actor.col, actor.val)
    guestQ.eq(actor.col, actor.val)
  }
  const [rej, gst] = await Promise.all([rejectQ, guestQ])
  return { rejects: rej.count ?? 0, guestScans: gst.count ?? 0 }
}

export async function checkQuota(ctx: QuotaContext): Promise<QuotaCheck> {
  const sb = adminClient()
  const tier = await getTier(ctx.userId)

  // Site admins bypass every cap (per-user, per-month, daily-global). They
  // still flow through the cache path and their scans are still logged for
  // cost telemetry — they just don't get blocked.
  if (ctx.userId && (await isAdmin(sb, ctx.userId))) {
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
      if (cached?.result) return { allowed: true, tier, cached: cached.result as ScanResult }
    }
    return { allowed: true, tier }
  }

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
  const todayUsd = await sumCostSince(sb, dayStart.toISOString(), {
    stopAtUsd: GLOBAL_DAILY_BUDGET_USD,
  })
  if (todayUsd >= GLOBAL_DAILY_BUDGET_USD) {
    return { allowed: false, tier, reason: 'Daily scan budget reached. Try again tomorrow.' }
  }

  // 2. Daily backstops. These sit in front of the monthly per-identity limits
  //    because guest_id is client-supplied and trivially rotated. Supporters are
  //    skipped: their rejects are already billed against the $1 monthly budget
  //    below, so they're bounded without an extra wall in a paying user's face.
  const daily =
    tier === 'supporter'
      ? { rejects: 0, guestScans: 0 }
      : await dailyCounts(sb, ctx, tier, dayStart.toISOString())
  if (daily.rejects >= REJECT_IP_DAILY_LIMIT) {
    return {
      allowed: false,
      tier,
      reason: 'Too many unreadable photos today. Try again tomorrow with a clearer shot.',
    }
  }
  if (tier === 'guest' && daily.guestScans >= GUEST_IP_DAILY_LIMIT) {
    return {
      allowed: false,
      tier,
      reason: 'This network has used its free scans for today. Sign in to keep scanning.',
    }
  }

  // 3. Per-identity monthly limits
  if (tier === 'guest') {
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const ipHash = ctx.ip ? hashIp(ctx.ip) : null
    let query = sb.from('tool_scans').select('id', { count: 'exact', head: true })
      .eq('tool', ctx.tool).eq('rejected', false).gte('created_at', monthStart.toISOString())
    if (ctx.guestId) query = query.eq('guest_id', ctx.guestId)
    else if (ipHash) query = query.eq('ip_hash', ipHash)
    else return { allowed: false, tier, reason: 'Cannot verify guest identity.' }
    const { count } = await query
    const used = count ?? 0
    if (used >= GUEST_MONTHLY_LIMIT) {
      return {
        allowed: false,
        tier,
        reason: `You've used your free scan this month. Sign in for ${USER_MONTHLY_LIMIT} per month, or back Plants Pack for unlimited.`,
        remaining: 0,
      }
    }
    return { allowed: true, tier, remaining: GUEST_MONTHLY_LIMIT - used }
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
        reason: `You've used your ${USER_MONTHLY_LIMIT} free scans this month. Back Plants Pack for unlimited use.`,
        remaining: 0,
      }
    }
    return { allowed: true, tier, remaining: USER_MONTHLY_LIMIT - used }
  }

  // supporter: enforce $/month budget
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const usedUsd = await sumCostSince(sb, monthStart.toISOString(), {
    userId: ctx.userId!,
    stopAtUsd: SUPPORTER_MONTHLY_BUDGET_USD,
  })
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
  allergens?: string[]
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
    allergens: args.allergens ?? [],
  })
}

export const LIMITS = {
  GUEST_MONTHLY_LIMIT,
  USER_MONTHLY_LIMIT,
  SUPPORTER_MONTHLY_BUDGET_USD,
  GLOBAL_DAILY_BUDGET_USD,
  GUEST_IP_DAILY_LIMIT,
  REJECT_IP_DAILY_LIMIT,
} as const
