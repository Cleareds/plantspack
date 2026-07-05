# src/shared — code shared between web and the mobile app

This directory is the **single source of truth** for platform-neutral code
used by both the Next.js site and the Expo app (`mobileapp/`, its own git
repo at github.com/papasoft23/plantspack-mobile).

Rules:

- **Pure TypeScript only.** No React, no Next.js, no React Native, no DOM,
  no Node APIs. Data, types, and pure functions.
- **Presentation stays per-platform.** Tailwind classes live in `src/lib/*`,
  native colors in `mobileapp/src/constants/*`. Only the semantics (enums,
  ordering, labels, weights, datasets) live here.
- **Web consumes it directly** (`src/lib/e-codes.ts` etc. are re-export shims,
  so existing `@/lib/...` imports keep working).
- **Mobile consumes a vendored copy.** `cd mobileapp && npm run sync:shared`
  copies this directory to `mobileapp/src/shared/` with a DO-NOT-EDIT header.
  The copy is committed in the mobile repo (EAS cloud builds only upload that
  repo, so a `file:../` dependency would break them). Mobile CI fails if the
  copy has drifted — never edit `mobileapp/src/shared/` by hand.

Contents:

- `database.types.ts` — generated from the live Supabase schema:
  `npx supabase gen types typescript --project-id mfeelaqjbtnypoojhfjp --schema public > src/shared/database.types.ts`
  Regenerate after running migrations.
- `vegan-level-core.ts` — vegan-level enum, ordering, labels, and city-score
  weights (must mirror the SQL CASE in the `city_scores` materialized view).
- `e-codes.ts` — E-number additive vegan-status dataset (barcode, ingredient
  and menu scanners on both platforms).
- `vegan-drinks-data.ts` — drinks vegan-status dataset.
- `baking-substitutes.ts` — baking substitution calculator dataset.
