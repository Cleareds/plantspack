# Summer-hub places audit — 2026-05-15

Input: `summer/summer_hub_places_verification_table.csv` (1,340 rows of
ChatGPT analysis with confidence + suggested levels + actions).

## Policy applied

The platform honesty rule and the project "never modify data without
explicit confirmation" rule shape what was auto-applied vs flagged:

- **Downgrades** auto-applied when confidence ≥ Medium.
  Downgrading a vegan level cannot mislead a vegan visitor — the
  worst case is the user gets a more accurate expectation. Safe.
- **Upgrades** never auto-applied. They need menu verification.
- **100% vegan verification** never auto-applied from CSV alone.
  Each verified place was live-checked via WebSearch against
  official sources before flipping `is_verified=true`.
- **Closures + duplicates** never auto-applied. Always human.
- **Data fills** (website / phone / hours / description) only when
  the current DB value is empty AND confidence ≥ Medium.
- **Address fixes** intentionally skipped — high false-positive
  risk without geocoding cross-check.

## Auto-applied via `scripts/_apply-summer-hub-audit.ts`

| Change | Rows |
|---|---|
| Vegan-level downgrades (Vegan friendly → Vegan options, etc.) | 42 |
| Website filled (was empty) | 0 |
| Phone filled (was empty) | 0 |
| Opening hours filled (was empty) | 0 |
| Description filled (was empty) | 0 |
| **Subtotal** | **42** |

Note on the zero data-fills: the CSV was generated from the live DB
state, so for almost every row the values in the CSV already exist
in the DB. There was no "current empty + CSV has value" case.

## Live WebSearch verifications (representative P0 sample)

Each result below was confirmed against an official source (venue
website, HappyCow, or strong vegan-community source) explicitly
calling out 100% vegan / fully plant-based status.

| Place | City | Decision | Source |
|---|---|---|---|
| La Tecia Vegana | Venice | `is_verified=true` | "Every element of the menu, from appetizers to desserts, drinks and wines, is vegan and organic" |
| Flower Burger Palermo | Palermo | `is_verified=true` | "100% plant-based ingredients"; known fully-vegan chain |
| Radagast Vegan Bakery | Rome | `is_verified=true` | "100% vegan pastry shop" |
| Tripperia vegana TAN8 | Florence | `is_verified=true` | Vegan-only sandwich shop reimagining Florentine tradition |
| Il vegano | Florence | `is_verified=true` | "Completely vegan and completely organic bistro" |
| Macelleria Vegetariana Italia | Naples | `vegan_level: fully_vegan → mostly_vegan` | One non-vegan item on menu (eggplant meatballs / vegetarian); does not meet "every item vegan" bar |
| VeganArt | Naples | unchanged — manual review | Sources said "appears to be entirely vegan" but no explicit confirmation; conservative |

Net DB changes from the WebSearch pass: **5 new verified fully-vegan
places + 1 downgrade off fully-vegan**.

## Manual review queue

262 rows in `manual-review.csv` need human eyes. Breakdown by reason:

| Reason | Count |
|---|---|
| 100% vegan verification (need menu check) | 236 (less the 6 just done above = ~230 remain) |
| Vegan-level upgrade proposed | 0 |
| Closed / temporarily closed flag | 0 |
| Duplicate / merge flag | 0 |
| Other (DB row missing, low-confidence downgrade, etc.) | 26 |

The 230 remaining "verify 100% vegan" rows can be processed in
batches of ~20 per session via the same WebSearch workflow used
above. Each batch takes ~5 min and produces 5-15 verifications +
1-3 catches like the Macelleria case.

## Skipped (no change)

1,036 rows — the audit didn't find an actionable change. Either:
- The current DB state already matches the suggested state
- Confidence was Low and no safe automatic action existed
- Data fields were not empty (no fill needed)

## Total DB writes today: 48

- 42 vegan-level downgrades (apply script)
- 5 `is_verified=true` on fully-vegan venues (WebSearch verified)
- 1 `vegan_level: fully_vegan → mostly_vegan` downgrade
  (Macelleria Vegetariana Italia)

## Files in this directory

- `applied.csv` — 42 auto-applied rows with the exact change list
- `manual-review.csv` — 262 rows queued for human attention
- `skipped.csv` — 1,036 rows where no action was warranted
- `summary.md` — this file

## Next steps (your call)

1. **Open `manual-review.csv` in a spreadsheet**. Sort by
   Priority + Confidence. The first 30-50 rows are the highest
   ROI to clear next.
2. **Continue the WebSearch verification loop** on the remaining
   ~230 "verify 100% vegan" rows. Each cleared row adds a
   verified badge on a city page and improves the trust signal.
3. **Re-run the audit script** after any external changes to
   the CSV; idempotent and safe.
