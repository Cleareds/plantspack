// Sprouts: PlantsPack contribution-rewards ledger + tier helpers.
//
// Phase 1 (2026-05-22): ADMIN-ONLY. The library is wired everywhere it
// belongs, but `awardSprouts`/`spendSprouts`/`seedTree` early-return if
// the target user isn't role='admin'. Flip the gate in one place
// (SPROUTS_ENABLED_FOR_ALL) once we open this up to everyone.

import { createClient } from '@supabase/supabase-js'

const SPROUTS_ENABLED_FOR_ALL = false  // gate; flip when public-launching

type SupporterTier = 'free' | 'medium' | 'premium' | null

export type ActionType =
  // Places
  | 'add_place' | 'add_place_with_image' | 'place_correction_approved'
  // Reviews
  | 'review_text' | 'review_with_photo' | 'review_with_video' | 'review_helpful_vote_received'
  // Posts / community
  | 'post_share_journey' | 'post_recipe' | 'post_tip' | 'post_engagement_milestone'
  // Profile (one-time, per field)
  | 'profile.is_vegan' | 'profile.vegan_since' | 'profile.vegan_reasons'
  | 'profile.transition_story' | 'profile.favourite_vegan_meal'
  | 'profile.current_challenges' | 'profile.dietary_specifics'
  | 'profile.cooking_frequency' | 'profile.home_city' | 'profile.bio' | 'profile.avatar'
  // Streaks
  | 'daily_visit' | 'weekly_streak' | 'monthly_streak'
  // Onboarding
  | 'verify_email' | 'follow_first_city' | 'first_trip_created'
  // Internal (no multiplier, no daily-cap)
  | 'seed_tree' | 'admin_grant'
  // Negative
  | 'spend.cleareds_discount' | 'spend.real_tree' | 'spend.supporter_month'
  | 'spend.featured_placement' | 'spend.custom'

export const ACTION_AMOUNTS: Record<ActionType, number> = {
  // Places
  add_place: 200,
  add_place_with_image: 250,
  place_correction_approved: 40,
  // Reviews
  review_text: 30,
  review_with_photo: 80,
  review_with_video: 120,
  review_helpful_vote_received: 5,
  // Posts
  post_share_journey: 150,
  post_recipe: 100,
  post_tip: 40,
  post_engagement_milestone: 50,
  // Profile (one-time)
  'profile.is_vegan': 10,
  'profile.vegan_since': 20,
  'profile.vegan_reasons': 15,
  'profile.transition_story': 80,
  'profile.favourite_vegan_meal': 10,
  'profile.current_challenges': 15,
  'profile.dietary_specifics': 15,
  'profile.cooking_frequency': 10,
  'profile.home_city': 10,
  'profile.bio': 15,
  'profile.avatar': 20,
  // Streaks
  daily_visit: 2,
  weekly_streak: 25,
  monthly_streak: 150,
  // Onboarding
  verify_email: 30,
  follow_first_city: 15,
  first_trip_created: 50,
  // Internal
  seed_tree: 0,            // amount comes from caller
  admin_grant: 0,
  // Spend
  'spend.cleareds_discount': -500,
  'spend.real_tree': -1000,
  'spend.supporter_month': -1500,
  'spend.featured_placement': -300,
  'spend.custom': 0,
}

// Per-day caps to discourage farming. 0 = no cap.
export const DAILY_CAPS: Partial<Record<ActionType, number>> = {
  review_helpful_vote_received: 50,
  daily_visit: 2,
  review_text: 4,
  review_with_photo: 5,
  review_with_video: 3,
  add_place: 8,
  add_place_with_image: 8,
}

export const TIERS = [
  { key: 'sprout',   label: 'Sprout',   min: 0 },
  { key: 'bronze',   label: 'Bronze',   min: 500 },
  { key: 'silver',   label: 'Silver',   min: 2000 },
  { key: 'gold',     label: 'Gold',     min: 5000 },
  { key: 'platinum', label: 'Platinum', min: 10000 },
] as const

export type TierKey = (typeof TIERS)[number]['key']

export function tierFor(lifetime: number): { key: TierKey; label: string; min: number } {
  let current: { key: TierKey; label: string; min: number } = TIERS[0]
  for (const t of TIERS) if (lifetime >= t.min) current = t
  return current
}

// Digital-tree stages by cumulative seeded Sprouts.
export const TREE_STAGES = [
  { stage: 0, min: 0,     label: 'Empty plot' },
  { stage: 1, min: 100,   label: 'Seedling' },
  { stage: 2, min: 300,   label: 'Sapling' },
  { stage: 3, min: 700,   label: 'Young tree' },
  { stage: 4, min: 1500,  label: 'Mature tree' },
  { stage: 5, min: 3000,  label: 'Flowering tree' },
  { stage: 6, min: 6000,  label: 'Heritage tree' },
  { stage: 7, min: 10000, label: 'Ancient grove' },
] as const

export function treeStageFor(seeded: number): { stage: number; min: number; label: string } {
  let current: { stage: number; min: number; label: string } = TREE_STAGES[0]
  for (const s of TREE_STAGES) if (seeded >= s.min) current = s
  return current
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

async function getUserGateContext(userId: string) {
  const sb = adminClient()
  const { data } = await sb.from('users').select('id, role, subscription_tier').eq('id', userId).maybeSingle()
  return data as { id: string; role: string | null; subscription_tier: SupporterTier } | null
}

function multiplierFor(tier: SupporterTier): number {
  if (tier === 'premium' || tier === 'medium') return 1.5
  return 1.0
}

export interface AwardArgs {
  userId: string
  actionType: ActionType
  referenceType?: string | null
  referenceId?: string | null
  amountOverride?: number      // used for admin_grant + seed_tree
  metadata?: Record<string, unknown>
  applySupporterMultiplier?: boolean  // default true for earn; false for seed/admin
}

export interface AwardResult {
  ok: boolean
  reason?: 'gated' | 'duplicate' | 'daily_cap' | 'no_amount' | 'insufficient_balance' | 'user_not_found' | 'db_error'
  awarded?: number
  ledgerId?: string
  balance?: number
  lifetime?: number
}

export async function awardSprouts(args: AwardArgs): Promise<AwardResult> {
  const sb = adminClient()
  const user = await getUserGateContext(args.userId)
  if (!user) return { ok: false, reason: 'user_not_found' }
  if (!SPROUTS_ENABLED_FOR_ALL && user.role !== 'admin') return { ok: false, reason: 'gated' }

  const baseAmount = args.amountOverride ?? ACTION_AMOUNTS[args.actionType]
  if (!baseAmount || baseAmount <= 0) return { ok: false, reason: 'no_amount' }

  // Idempotency: existing non-reversed ledger entry with same (user, action, reference)?
  if (args.referenceId) {
    const { data: existing } = await sb.from('user_sprouts_ledger')
      .select('id').eq('user_id', args.userId).eq('action_type', args.actionType)
      .eq('reference_id', args.referenceId).is('reversed_at', null).maybeSingle()
    if (existing) return { ok: false, reason: 'duplicate', ledgerId: existing.id }
  }

  // Daily cap check
  const cap = DAILY_CAPS[args.actionType]
  if (cap && cap > 0) {
    const today = new Date(); today.setUTCHours(0,0,0,0)
    const { count } = await sb.from('user_sprouts_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', args.userId).eq('action_type', args.actionType)
      .gte('created_at', today.toISOString()).is('reversed_at', null)
    if ((count ?? 0) >= cap) return { ok: false, reason: 'daily_cap' }
  }

  const applyMult = args.applySupporterMultiplier !== false
  const mult = applyMult ? multiplierFor(user.subscription_tier) : 1.0
  const finalAmount = Math.round(baseAmount * mult)

  const { data: ledger, error: lerr } = await sb.from('user_sprouts_ledger').insert({
    user_id: args.userId,
    amount: finalAmount,
    base_amount: baseAmount,
    multiplier: mult,
    action_type: args.actionType,
    reference_type: args.referenceType ?? null,
    reference_id: args.referenceId ?? null,
    metadata: args.metadata ?? {},
  }).select('id').single()
  if (lerr || !ledger) return { ok: false, reason: 'db_error' }

  const totals = await recomputeUserTotals(args.userId)
  return { ok: true, awarded: finalAmount, ledgerId: ledger.id, balance: totals.balance, lifetime: totals.lifetime }
}

export async function spendSprouts(args: {
  userId: string
  actionType: 'spend.cleareds_discount' | 'spend.real_tree' | 'spend.supporter_month' | 'spend.featured_placement' | 'spend.custom'
  amount?: number        // for spend.custom
  referenceType?: string
  referenceId?: string
  metadata?: Record<string, unknown>
}): Promise<AwardResult> {
  const sb = adminClient()
  const user = await getUserGateContext(args.userId)
  if (!user) return { ok: false, reason: 'user_not_found' }
  if (!SPROUTS_ENABLED_FOR_ALL && user.role !== 'admin') return { ok: false, reason: 'gated' }

  const cost = args.actionType === 'spend.custom'
    ? -Math.abs(args.amount ?? 0)
    : ACTION_AMOUNTS[args.actionType]
  if (!cost || cost >= 0) return { ok: false, reason: 'no_amount' }

  const { data: u } = await sb.from('users').select('sprouts_balance').eq('id', args.userId).single()
  if (!u || u.sprouts_balance + cost < 0) return { ok: false, reason: 'insufficient_balance' }

  const { data: ledger, error } = await sb.from('user_sprouts_ledger').insert({
    user_id: args.userId,
    amount: cost,
    base_amount: cost,
    multiplier: 1.0,
    action_type: args.actionType,
    reference_type: args.referenceType ?? null,
    reference_id: args.referenceId ?? null,
    metadata: args.metadata ?? {},
  }).select('id').single()
  if (error || !ledger) return { ok: false, reason: 'db_error' }

  const totals = await recomputeUserTotals(args.userId)
  return { ok: true, awarded: cost, ledgerId: ledger.id, balance: totals.balance, lifetime: totals.lifetime }
}

// Seed: spend from balance into the user's digital tree. Does not reduce lifetime.
export async function seedTree(userId: string, amount: number): Promise<AwardResult & { newStage?: number }> {
  if (amount <= 0) return { ok: false, reason: 'no_amount' }
  const sb = adminClient()
  const user = await getUserGateContext(userId)
  if (!user) return { ok: false, reason: 'user_not_found' }
  if (!SPROUTS_ENABLED_FOR_ALL && user.role !== 'admin') return { ok: false, reason: 'gated' }

  const { data: u } = await sb.from('users').select('sprouts_balance').eq('id', userId).single()
  if (!u || u.sprouts_balance < amount) return { ok: false, reason: 'insufficient_balance' }

  const { data: ledger, error } = await sb.from('user_sprouts_ledger').insert({
    user_id: userId,
    amount: -amount,
    base_amount: -amount,
    multiplier: 1.0,
    action_type: 'seed_tree',
    reference_type: 'tree',
    reference_id: null,
    metadata: {},
  }).select('id').single()
  if (error || !ledger) return { ok: false, reason: 'db_error' }

  // Update tree state
  const { data: existing } = await sb.from('user_trees').select('*').eq('user_id', userId).maybeSingle()
  const prevSeeded = existing?.total_seeded ?? 0
  const prevStage = existing?.current_stage ?? 0
  const newSeeded = prevSeeded + amount
  const newStage = treeStageFor(newSeeded).stage
  const stageReached = { ...(existing?.stage_reached_at ?? {}) } as Record<string, string>
  if (newStage > prevStage) {
    for (let s = prevStage + 1; s <= newStage; s++) {
      stageReached[String(s)] = new Date().toISOString()
    }
  }
  if (existing) {
    await sb.from('user_trees').update({
      total_seeded: newSeeded, current_stage: newStage, stage_reached_at: stageReached,
    }).eq('user_id', userId)
  } else {
    await sb.from('user_trees').insert({
      user_id: userId, total_seeded: newSeeded, current_stage: newStage, stage_reached_at: stageReached,
    })
  }

  const totals = await recomputeUserTotals(userId)
  return { ok: true, awarded: -amount, ledgerId: ledger.id, balance: totals.balance, lifetime: totals.lifetime, newStage }
}

// Recompute cached lifetime/balance/seeded sums on the users row from the ledger.
export async function recomputeUserTotals(userId: string) {
  const sb = adminClient()
  const { data: rows } = await sb.from('user_sprouts_ledger')
    .select('amount').eq('user_id', userId).is('reversed_at', null)
  let lifetime = 0, balance = 0
  for (const r of rows ?? []) {
    if (r.amount > 0) lifetime += r.amount
    balance += r.amount
  }
  const { data: tree } = await sb.from('user_trees').select('total_seeded').eq('user_id', userId).maybeSingle()
  const seeded = tree?.total_seeded ?? 0
  await sb.from('users').update({
    sprouts_lifetime: lifetime,
    sprouts_balance: balance,
    sprouts_seeded: seeded,
  }).eq('id', userId)
  return { lifetime, balance, seeded }
}

export interface SproutsState {
  lifetime: number
  balance: number
  seeded: number
  tier: ReturnType<typeof tierFor>
  nextTier: { key: TierKey; label: string; min: number } | null
  toNext: number
  tree: { stage: number; label: string; nextStageAt: number | null; seeded: number }
  recent: Array<{ id: string; amount: number; action_type: string; created_at: string; metadata: Record<string, unknown> }>
}

export async function getMyState(userId: string): Promise<SproutsState | null> {
  const sb = adminClient()
  const { data: user } = await sb.from('users').select('sprouts_lifetime, sprouts_balance, sprouts_seeded').eq('id', userId).maybeSingle()
  if (!user) return null
  const tier = tierFor(user.sprouts_lifetime)
  const idx = TIERS.findIndex(t => t.key === tier.key)
  const nextTier = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const toNext = nextTier ? Math.max(0, nextTier.min - user.sprouts_lifetime) : 0
  const stage = treeStageFor(user.sprouts_seeded)
  const stageIdx = TREE_STAGES.findIndex(s => s.stage === stage.stage)
  const nextStageAt = stageIdx >= 0 && stageIdx < TREE_STAGES.length - 1 ? TREE_STAGES[stageIdx + 1].min : null
  const { data: recent } = await sb.from('user_sprouts_ledger')
    .select('id, amount, action_type, created_at, metadata')
    .eq('user_id', userId).is('reversed_at', null).order('created_at', { ascending: false }).limit(25)
  return {
    lifetime: user.sprouts_lifetime,
    balance: user.sprouts_balance,
    seeded: user.sprouts_seeded,
    tier,
    nextTier: nextTier ? { key: nextTier.key, label: nextTier.label, min: nextTier.min } : null,
    toNext,
    tree: { stage: stage.stage, label: stage.label, nextStageAt, seeded: user.sprouts_seeded },
    recent: (recent ?? []) as SproutsState['recent'],
  }
}

// Helper for redemption flows. Records both the ledger debit and a redemption row.
export async function redeem(args: {
  userId: string
  rewardType: 'cleareds_discount_50pct' | 'real_tree' | 'supporter_month' | 'featured_placement_7d'
  payload?: Record<string, unknown>
  silverPlusRequired?: boolean
}): Promise<{ ok: boolean; reason?: string; redemptionId?: string; code?: string }> {
  const sb = adminClient()
  const COST: Record<string, { actionType: 'spend.cleareds_discount' | 'spend.real_tree' | 'spend.supporter_month' | 'spend.featured_placement'; cost: number; tierGate?: number }> = {
    cleareds_discount_50pct: { actionType: 'spend.cleareds_discount', cost: 500 },
    real_tree: { actionType: 'spend.real_tree', cost: 1000, tierGate: 2000 }, // Silver+
    supporter_month: { actionType: 'spend.supporter_month', cost: 1500 },
    featured_placement_7d: { actionType: 'spend.featured_placement', cost: 300 },
  }
  const spec = COST[args.rewardType]
  if (!spec) return { ok: false, reason: 'unknown_reward' }

  if (spec.tierGate) {
    const { data: u } = await sb.from('users').select('sprouts_lifetime').eq('id', args.userId).single()
    if (!u || u.sprouts_lifetime < spec.tierGate) return { ok: false, reason: 'tier_locked' }
  }

  const debit = await spendSprouts({
    userId: args.userId, actionType: spec.actionType,
    referenceType: 'redemption', metadata: { reward: args.rewardType, ...(args.payload ?? {}) },
  })
  if (!debit.ok) return { ok: false, reason: debit.reason }

  const code = args.rewardType === 'cleareds_discount_50pct'
    ? `CLEAREDS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    : null

  const { data: r, error } = await sb.from('sprouts_redemptions').insert({
    user_id: args.userId,
    reward_type: args.rewardType,
    sprouts_spent: spec.cost,
    ledger_id: debit.ledgerId,
    status: 'pending',
    code,
    payload: args.payload ?? {},
  }).select('id').single()
  if (error || !r) return { ok: false, reason: 'db_error' }
  return { ok: true, redemptionId: r.id, code: code ?? undefined }
}
