// Real-tree ceremony constants + price math - single source of truth shared
// by the server lib (src/lib/sprouts.ts), the sprouts page, and the client
// ceremony component. Client components must import from HERE, not from
// sprouts.ts (which pulls the service-role Supabase client into scope).
//
// Design (2026-07-11): the tree is reachable from EITHER direction, and the
// two engagement loops combine as a sliding price instead of an AND-gate:
//
//   price = 1,500 Sprouts  -  2 x VeganCityScore   (floored at 0)
//
//   - Pure contributor: no game at all  -> 1,500 Sprouts
//   - Mixed (score 400)                 ->   700 Sprouts
//   - Pure player: score 750+           ->  FREE
//
// Only a CLOUD-SYNCED city counts (the game pushes to
// game_saves.state.city3d while signed in - localStorage cities don't).
// Anti-abuse: one real tree per account per 90 days, plus every order goes
// through the human-reviewed /admin/tree-orders queue before money moves.

export const REAL_TREE_BASE_COST = 1500
/** Sprouts knocked off the price per Vegan City Score point. */
export const REAL_TREE_SCORE_DISCOUNT = 2
/** Score at which the tree becomes free: BASE / DISCOUNT. */
export const REAL_TREE_FREE_SCORE = REAL_TREE_BASE_COST / REAL_TREE_SCORE_DISCOUNT
export const REAL_TREE_COOLDOWN_DAYS = 90

export function realTreeCost(score: number): number {
  const s = Math.max(0, Number(score) || 0)
  return Math.max(0, REAL_TREE_BASE_COST - REAL_TREE_SCORE_DISCOUNT * Math.floor(s))
}
