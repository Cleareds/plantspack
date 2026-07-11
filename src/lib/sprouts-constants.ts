// Real-tree ceremony constants - single source of truth shared by the
// server lib (src/lib/sprouts.ts), the sprouts page, and the client
// ceremony component. Client components must import from HERE, not from
// sprouts.ts (which pulls the service-role Supabase client into scope).
//
// The ceremony gates, in the order they are checked:
//   1. A cloud-synced Vegan City in PlantsPack Play with score >= 400
//      (the game pushes to game_saves.state.city3d every 45s while
//      signed in - localStorage-only cities do NOT count).
//   2. Sapling tier: 2,000 lifetime Sprouts earned.
//   3. 1,000 Sprouts balance to spend.

export const REAL_TREE_CITY_SCORE = 400
export const REAL_TREE_COST = 1000
export const REAL_TREE_TIER_GATE = 2000 // lifetime Sprouts = Sapling tier
export const REAL_TREE_TIER_LABEL = 'Sapling'
