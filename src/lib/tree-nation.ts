/**
 * Tree-Nation integration seam (2026-07-11). NOT yet live - nothing imports
 * this until the API token exists. Kept ready so fulfillment can flip from
 * manual to API the day the token lands.
 *
 * Activation checklist (user-side, per kb.tree-nation.com/knowledge/api-availability):
 *   1. Create a Tree-Nation TEST account + request API tokens via their form.
 *   2. Put the TEST token in .env.local as TREE_NATION_TOKEN and
 *      TREE_NATION_ENV=test; pick a project id into TREE_NATION_PROJECT_ID.
 *   3. Verify a test plant end-to-end (this module against their test env),
 *      confirm with their account manager, swap in the LIVE token.
 *   4. Set TREE_NATION_MONTHLY_CAP (whole trees/month) - the hard spend
 *      ceiling required by our cost policy. No cap, no planting.
 *
 * The exact request/response field names must be confirmed against their
 * Postman docs once the TEST token arrives - marked CONFIRM below. The
 * plant response includes a unique tree URL that serves as the public
 * certificate (goes into real_world_tree_orders and the player's profile).
 */
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.TREE_NATION_ENV === 'live'
  ? 'https://tree-nation.com/api'
  : 'https://tree-nation.com/api/tests' // CONFIRM test base URL from Postman docs

export function treeNationEnabled(): boolean {
  return !!process.env.TREE_NATION_TOKEN && !!process.env.TREE_NATION_PROJECT_ID && !!process.env.TREE_NATION_MONTHLY_CAP
}

/** Trees already ordered via API this calendar month - the cap denominator. */
export async function treesPlantedThisMonth(): Promise<number> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const monthStart = new Date()
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const { count } = await sb.from('real_world_tree_orders')
    .select('id', { count: 'exact', head: true })
    .gte('ordered_at', monthStart.toISOString())
    .not('partner_ref', 'is', null)
  return count ?? 0
}

export interface PlantResult {
  ok: boolean
  reason?: 'disabled' | 'monthly_cap' | 'api_error'
  /** Public certificate URL for the planted tree. */
  treeUrl?: string
  raw?: unknown
}

/**
 * Plant one tree. Enforces the monthly cap BEFORE any network call - this
 * is the code-level guarantee behind the cost policy (client-influenceable
 * state may queue orders, but money only moves inside this cap).
 */
export async function plantTree(args: { message?: string }): Promise<PlantResult> {
  if (!treeNationEnabled()) return { ok: false, reason: 'disabled' }
  const cap = parseInt(process.env.TREE_NATION_MONTHLY_CAP || '0')
  const used = await treesPlantedThisMonth()
  if (used >= cap) return { ok: false, reason: 'monthly_cap' }

  const res = await fetch(`${BASE}/plant`, { // CONFIRM path + body schema
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TREE_NATION_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_id: Number(process.env.TREE_NATION_PROJECT_ID),
      quantity: 1,
      ...(args.message ? { message: args.message.slice(0, 200) } : {}),
    }),
  })
  if (!res.ok) return { ok: false, reason: 'api_error', raw: await res.text() }
  const data = await res.json()
  // CONFIRM response field carrying the certificate URL (tree URL)
  const treeUrl = data?.tree_url || data?.url || data?.trees?.[0]?.url
  return { ok: true, treeUrl, raw: data }
}
