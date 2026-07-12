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

// Tiers are named for tree life, not metals. Each tier carries its own
// Tailwind classes so chips/labels render in tier-appropriate colour.
// 'forest-guardian' uses a silvery platinum-style gradient.
// One coherent ramp: neutral seed -> deepening greens -> gold for the top.
export const TIERS = [
  { key: 'seed', label: 'Seed', min: 0,
    chip: 'bg-gray-50 border-gray-300 text-gray-700',
    bar:  'bg-gray-400' },
  { key: 'sprout', label: 'Sprout', min: 500,
    chip: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    bar:  'bg-emerald-300' },
  { key: 'sapling', label: 'Sapling', min: 2000,
    chip: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    bar:  'bg-emerald-500' },
  { key: 'grove', label: 'Grove', min: 5000,
    chip: 'bg-emerald-200 border-emerald-400 text-emerald-900',
    bar:  'bg-emerald-700' },
  { key: 'forest-guardian', label: 'Forest Guardian', min: 10000,
    chip: 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm',
    bar:  'bg-gradient-to-r from-amber-400 to-yellow-500' },
] as const

export type TierKey = (typeof TIERS)[number]['key']

export type TierInfo = { key: TierKey; label: string; min: number; chip: string; bar: string }

export function tierFor(lifetime: number): TierInfo {
  let current: TierInfo = TIERS[0]
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
  reason?: 'gated' | 'duplicate' | 'daily_cap' | 'no_amount' | 'insufficient_balance' | 'user_not_found' | 'db_error' | 'tree_mature'
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

  // spend.custom always takes the caller's amount; spend.real_tree may too -
  // the tree price slides with the player's Vegan City Score (see
  // sprouts-constants.realTreeCost), so the fixed ACTION_AMOUNTS entry is
  // only the no-game default.
  const cost = args.actionType === 'spend.custom' || (args.actionType === 'spend.real_tree' && typeof args.amount === 'number')
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

export const FOREST_THRESHOLD = TREE_STAGES[TREE_STAGES.length - 1].min  // 10,000 Sprouts matures a tree

// Seed: spend from balance into the user's digital tree. Does not reduce
// lifetime. If seeding pushes the tree past the maturity threshold, the
// excess Sprouts are NOT spent (capped at remaining-to-mature). When the
// tree matures, a row is inserted into user_forest_trees and the current
// tree state is reset for a fresh planting in an empty pot.
export async function seedTree(userId: string, amount: number): Promise<AwardResult & { newStage?: number; matured?: boolean }> {
  if (amount <= 0) return { ok: false, reason: 'no_amount' }
  const sb = adminClient()
  const user = await getUserGateContext(userId)
  if (!user) return { ok: false, reason: 'user_not_found' }
  if (!SPROUTS_ENABLED_FOR_ALL && user.role !== 'admin') return { ok: false, reason: 'gated' }

  const { data: u } = await sb.from('users').select('sprouts_balance').eq('id', userId).single()
  if (!u) return { ok: false, reason: 'user_not_found' }

  const { data: existing } = await sb.from('user_trees').select('*').eq('user_id', userId).maybeSingle()
  const prevSeeded = existing?.total_seeded ?? 0
  const prevStage = existing?.current_stage ?? 0

  // Cap the requested amount: don't take more than what's needed to mature
  // and don't take more than the user can afford.
  const remainingToMature = Math.max(0, FOREST_THRESHOLD - prevSeeded)
  const actualAmount = Math.min(amount, remainingToMature, u.sprouts_balance)
  if (actualAmount <= 0) {
    return { ok: false, reason: remainingToMature <= 0 ? 'tree_mature' : 'insufficient_balance' }
  }

  const newSeeded = prevSeeded + actualAmount
  const matured = newSeeded >= FOREST_THRESHOLD

  // Ledger entry for the actual spend
  const { data: ledger, error } = await sb.from('user_sprouts_ledger').insert({
    user_id: userId,
    amount: -actualAmount,
    base_amount: -actualAmount,
    multiplier: 1.0,
    action_type: 'seed_tree',
    reference_type: 'tree',
    reference_id: null,
    metadata: { matured },
  }).select('id').single()
  if (error || !ledger) return { ok: false, reason: 'db_error' }

  if (matured) {
    // Graduate this tree to the forest, then reset current tree state.
    const nowIso = new Date().toISOString()
    await sb.from('user_forest_trees').insert({
      user_id: userId,
      sprouts_seeded: newSeeded,
      matured_at: nowIso,
    })
    await sb.from('user_sprouts_ledger').insert({
      user_id: userId,
      amount: 0, base_amount: 0, multiplier: 1.0,
      action_type: 'tree_matured',
      reference_type: 'tree',
      metadata: { final_seeded: newSeeded },
      created_at: nowIso,
    })
    if (existing) await sb.from('user_trees').delete().eq('user_id', userId)
    // Recompute forest_size cache
    const { count: forestCount } = await sb.from('user_forest_trees')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId)
    await sb.from('users').update({ forest_size: forestCount ?? 0 }).eq('id', userId)
  } else {
    const newStage = treeStageFor(newSeeded).stage
    const stageReached = { ...(existing?.stage_reached_at ?? {}) } as Record<string, string>
    if (newStage > prevStage) {
      const nowIso = new Date().toISOString()
      // Insert one zero-amount ledger entry per stage reached so the
      // activity log shows clear "Reached <stage>" rows alongside the
      // -<amount> seed entry.
      for (let s = prevStage + 1; s <= newStage; s++) {
        stageReached[String(s)] = nowIso
        const stageInfo = TREE_STAGES.find(x => x.stage === s)
        await sb.from('user_sprouts_ledger').insert({
          user_id: userId,
          amount: 0, base_amount: 0, multiplier: 1.0,
          action_type: 'tree_stage_reached',
          reference_type: 'tree',
          metadata: { stage: s, label: stageInfo?.label },
          created_at: nowIso,
        })
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
  }

  const totals = await recomputeUserTotals(userId)
  return {
    ok: true, awarded: -actualAmount, ledgerId: ledger.id,
    balance: totals.balance, lifetime: totals.lifetime,
    newStage: matured ? 0 : treeStageFor(newSeeded).stage,
    matured,
  }
}

export interface ForestTree {
  id: string
  matured_at: string
  sprouts_seeded: number
  species: string | null
  dedication: string | null
}

export async function getForest(userId: string): Promise<ForestTree[]> {
  const sb = adminClient()
  const { data } = await sb.from('user_forest_trees')
    .select('id, matured_at, sprouts_seeded, species, dedication')
    .eq('user_id', userId).order('matured_at', { ascending: true })
  return (data ?? []) as ForestTree[]
}

// Recompute cached lifetime/balance/seeded sums on the users row from the ledger.
export async function recomputeUserTotals(userId: string) {
  const sb = adminClient()
  const { data: rows } = await sb.from('user_sprouts_ledger')
    .select('amount, reversal_of').eq('user_id', userId).is('reversed_at', null)
  let lifetime = 0, balance = 0
  for (const r of rows ?? []) {
    // Lifetime = positive earnings only. Reversal entries (which carry
    // reversal_of) and spend rows do not count toward lifetime.
    if (r.amount > 0 && !r.reversal_of) lifetime += r.amount
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

// ---- PlantsPack Play bridge (read-only) ------------------------------------
// Vegan City Score of the user's current city in the game, computed
// server-side from the cloud save (game_saves.state.city3d.tiles). Weights
// mirror the game's lib/cityStore.ts SCORE_WEIGHT - keep in sync.
const GAME_SCORE_WEIGHT: Record<string, number> = {
  falafel: 2, smoothie: 2, bakery: 3, garden: 3, ramen: 3, zerowaste: 3, cheese: 3,
  verifydesk: 4, windmill: 4, school: 5, hotel: 6, festival: 6, lab: 7, sanctuary: 8,
}
interface GameCityState {
  tiles?: Record<string, { b?: string; lvl?: number }>
  cityName?: string
  citiesBuilt?: number
}
function scoreOfTiles(tiles: GameCityState['tiles']): number {
  if (!tiles || typeof tiles !== 'object') return 0
  let score = 0
  for (const k of Object.keys(tiles)) {
    const t = tiles[k]
    if (!t || typeof t.b !== 'string') continue
    // Cosmetic landmarks (lm_*) are beauty, not power - the game scores
    // them 0 and so must we, or the web gate disagrees with the score the
    // player sees in the game (mirrors SCORE_WEIGHT in the game repo's
    // lib/cityStore.ts - keep the two in sync).
    if (t.b.startsWith('lm_')) continue
    const w = GAME_SCORE_WEIGHT[t.b] ?? 2
    if (w === 0) continue
    score += w + Math.max(0, (Number(t.lvl) || 1) - 1)
  }
  return score
}
export async function gameCityScore(userId: string): Promise<number> {
  const sb = adminClient()
  const { data } = await sb.from('game_saves').select('state').eq('user_id', userId).maybeSingle()
  const city = (data?.state as { city3d?: GameCityState } | null)?.city3d
  return scoreOfTiles(city?.tiles)
}

// full summary for the profile Vegan City card
export interface GameCitySummary {
  score: number
  cityName: string
  citiesBuilt: number
  buildings: number
  hasSave: boolean
}
export async function gameCitySummary(userId: string): Promise<GameCitySummary> {
  const sb = adminClient()
  const { data } = await sb.from('game_saves').select('state').eq('user_id', userId).maybeSingle()
  const city = (data?.state as { city3d?: GameCityState } | null)?.city3d
  if (!city) return { score: 0, cityName: '', citiesBuilt: 0, buildings: 0, hasSave: false }
  return {
    score: scoreOfTiles(city.tiles),
    cityName: typeof city.cityName === 'string' ? city.cityName : '',
    citiesBuilt: Number(city.citiesBuilt) || 0,
    buildings: city.tiles && typeof city.tiles === 'object' ? Object.keys(city.tiles).length : 0,
    hasSave: true,
  }
}
// real-tree price math lives in sprouts-constants (client-safe module)
import { realTreeCost, REAL_TREE_COOLDOWN_DAYS } from '@/lib/sprouts-constants'

// Helper for redemption flows. Records both the ledger debit and a redemption row.
export async function redeem(args: {
  userId: string
  rewardType: 'cleareds_discount_50pct' | 'real_tree' | 'supporter_month' | 'featured_placement_7d'
  payload?: Record<string, unknown>
  silverPlusRequired?: boolean
}): Promise<{ ok: boolean; reason?: string; redemptionId?: string; code?: string }> {
  const sb = adminClient()
  const COST: Record<string, { actionType: 'spend.cleareds_discount' | 'spend.real_tree' | 'spend.supporter_month' | 'spend.featured_placement'; cost: number }> = {
    cleareds_discount_50pct: { actionType: 'spend.cleareds_discount', cost: 500 },
    real_tree: { actionType: 'spend.real_tree', cost: 1500 }, // no-game default; slides with score below
    supporter_month: { actionType: 'spend.supporter_month', cost: 1500 },
    featured_placement_7d: { actionType: 'spend.featured_placement', cost: 300 },
  }
  const spec = COST[args.rewardType]
  if (!spec) return { ok: false, reason: 'unknown_reward' }

  // The real tree is reachable from EITHER loop: pure contributors pay the
  // full Sprouts price with no game requirement; a cloud-synced Vegan City
  // discounts it (2 Sprouts per score point) down to free at score 750.
  // Anti-abuse for the free path: one tree per account per cooldown window,
  // and the human-reviewed /admin/tree-orders queue sits before any money.
  let realTreePrice: number | null = null
  if (args.rewardType === 'real_tree') {
    const since = new Date(Date.now() - REAL_TREE_COOLDOWN_DAYS * 864e5).toISOString()
    const { count: recent } = await sb.from('real_world_tree_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', args.userId).gte('created_at', since)
    if ((recent ?? 0) > 0) return { ok: false, reason: 'cooldown' }
    realTreePrice = realTreeCost(await gameCityScore(args.userId))
  }

  let debitLedgerId: string | null = null
  if (args.rewardType === 'real_tree' && realTreePrice === 0) {
    // Free tree (score >= 750). No debit - but the phase-1 admin gate that
    // spendSprouts would normally enforce must still apply.
    const gateUser = await getUserGateContext(args.userId)
    if (!gateUser) return { ok: false, reason: 'user_not_found' }
    if (!SPROUTS_ENABLED_FOR_ALL && gateUser.role !== 'admin') return { ok: false, reason: 'gated' }
  } else {
    const debit = await spendSprouts({
      userId: args.userId, actionType: spec.actionType,
      ...(realTreePrice !== null ? { amount: realTreePrice } : {}),
      referenceType: 'redemption', metadata: { reward: args.rewardType, ...(args.payload ?? {}) },
    })
    if (!debit.ok) return { ok: false, reason: debit.reason }
    debitLedgerId = debit.ledgerId ?? null
  }
  const spent = realTreePrice ?? spec.cost

  const code = args.rewardType === 'cleareds_discount_50pct'
    ? `CLEAREDS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    : null

  const { data: r, error } = await sb.from('sprouts_redemptions').insert({
    user_id: args.userId,
    reward_type: args.rewardType,
    sprouts_spent: spent,
    ledger_id: debitLedgerId,
    status: 'pending',
    code,
    payload: args.payload ?? {},
  }).select('id').single()
  if (error || !r) return { ok: false, reason: 'db_error' }

  // real trees also enter the fulfillment queue (admin orders with the
  // partner, then marks it planted with the certificate details)
  if (args.rewardType === 'real_tree') {
    await sb.from('real_world_tree_orders').insert({
      user_id: args.userId,
      sprouts_spent: spent,
      ledger_id: debitLedgerId,
      status: 'queued',
      user_message: typeof args.payload?.dedication === 'string' ? (args.payload.dedication as string).slice(0, 200) : null,
    })
  }
  return { ok: true, redemptionId: r.id, code: code ?? undefined }
}
