# Places Data-Quality Runbook

Last updated: 2026-04-17

This is the how-to for keeping the `places` table clean as we ingest from more sources over time. It covers the unified intake pipeline, the admin tools, and the day-to-day cleanup flow.

---

## Architecture in one picture

```
     ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
     │  OSM sync    │   │  VegGuide    │   │ Foursquare   │   ... future
     │  (Overpass)  │   │  (dump)      │   │ (match/enrich)│
     └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
            │                  │                  │
            └─────── adapters emit IntakeRecord[] ┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │ src/lib/places/intake.ts │
                   │   decideIntake()         │
                   │     1. external-id match │
                   │     2. source rerun      │
                   │     3. spatial fuzzy     │
                   │     4. chain filter      │
                   │     5. region gate       │
                   │     6. import            │
                   └────────────┬─────────────┘
                                │
                  ┌─────────────┼─────────────┐
                  ▼             ▼             ▼
                link         import         skip
          (backfill null  (+categorize   (log reason)
           fields only)     +source tag)
                  │             │
                  └──────┬──────┘
                         ▼
                 places table (no dupes)
                         │
                         ▼
               ┌──────────────────┐
               │ /admin/data-quality │ ← merge, verify, archive, reclassify
               └──────────────────┘
```

**DB-first**: the decision engine only hits external APIs for places our DB doesn't already have. Re-ingesting a source you've seen before is a no-op.

---

## The intake decision engine

Everything new must call `decideIntake()` in `src/lib/places/intake.ts`. It returns one of:

| action   | What it means                               | Caller does                                    |
|----------|---------------------------------------------|-----------------------------------------------|
| `link`   | Already in our DB; matched by ID or coords  | Write the new external id, backfill null fields only |
| `import` | New place                                   | INSERT with auto-detected category + source tag |
| `skip`   | Chain / excluded region / bad data          | Log reason, move on                           |

The decision order (see `intake.ts`) always checks cheap DB-side matches first, so external quota is preserved.

### Category detection

`src/lib/places/categorize.ts` picks one of `'eat' | 'store' | 'hotel' | 'event' | 'organisation' | 'other'` from available hints (OSM tags, Foursquare categories, VegGuide category, name regex). Low-confidence (0.3) picks land in the **Suspected Wrong Category** admin tab so you can reclassify.

---

## Adding a new source

1. Create a tiny adapter under `scripts/adapters/<source>.ts` that:
   - Fetches/reads the raw data
   - Maps to `IntakeRecord[]` (defined in `intake.ts`)
   - Sets `source = '<slug>-import-YYYY-MM-DD'` so you can roll back the batch
2. Loop: for each record, `decideIntake()` → apply the action.
3. Keep existing `scripts/foursquare-match.ts` and `scripts/vegguide-match-import.ts` as worked examples. Both should be refactored onto the shared lib when you touch them next (they currently carry duplicated helpers — fine, but marked for cleanup).
4. Never hand-roll Levenshtein, haversine, or chain detection — import from `src/lib/places/matching.ts`.

---

## Admin workflows (`/admin/data-quality`)

### Tabs

| Tab | What it shows | Typical actions |
|---|---|---|
| **Pending Verify** | Community-imported places (OSM, VegGuide) that no human has confirmed | Verify (mark admin_verified), Archive if closed/wrong |
| **FSQ Weak Matches** | Places our Foursquare match scored 0.55–0.75 against | Confirm match (promote to 'matched'), Reject match (clear FSQ id) |
| **Duplicates** | Groups sharing a `foursquare_id` or `vegguide_id` | Merge all siblings into the first row |
| **Suspected Wrong Category** | Places whose `categorization_note` starts with `default:` (low confidence) | Reclassify via dropdown |
| **Suspected Chain** | Places tagged `chain-candidate` | Archive if chain, dismiss tag if not |
| **Community Reports** | `reported_closed`, `reported_hours`, `not_vegan` etc. | Investigate → dismiss or archive |
| **Website Down / Google Closed** | Automated flags from the daily workflow | Investigate → dismiss or archive |
| **Archived** | Soft-deleted rows | Unarchive to restore |
| **Corrections** | User-submitted place edits awaiting review | Approve → apply diff; Reject |

### Merge (dedup)

Hit **Merge into first** on a duplicate group. The endpoint at `POST /api/admin/data-quality/merge`:
- Backfills null fields on the kept row from the removed row (no overwrites).
- Repoints `place_reviews`, `favorite_places`, `pack_places`, `place_corrections` to the kept row.
- Sets `archived_at` + `archived_reason = 'merged into <keepId>'` on the removed row (soft-delete; CLAUDE.md never-delete rule).
- Revalidates both place pages.

### Archive vs Delete

We **don't** DELETE from `places` (CLAUDE.md). Instead, archive sets `archived_at`. The public place-detail API (`src/app/api/places/[id]/route.ts`) filters `archived_at IS NULL`, so archived rows stop showing publicly but remain restorable. If you truly need a hard delete, stop and ask the user — you need "Yes delete" per CLAUDE.md.

---

## Front-end verification banner

Community-sourced places (`source` starting with `vegguide-`, `osm`, or equal to `openstreetmap`) whose `verification_status` is still `unverified` render an amber **"Help us verify this listing"** banner above `PlaceVerifyPrompt` on the place page. When a visitor clicks **Yes, looks correct**, we flip `verification_status` to `community_verified` and revalidate the page so the banner disappears.

The mapping:
- `is_verified=true` or `verification_status='admin_verified'` → no banner (trusted)
- `verification_status='community_verified'` → no banner (enough community confirms)
- community source + `unverified` → amber "help verify" banner
- user-submitted + `unverified` → existing light prompt

---

## Closure detection (no Google Places)

As of 2026-04-17 we do **not** call the Google Places API anywhere. The closure pipeline is:

1. Daily `verify-places.yml` does HTTP HEAD on every place website. Sets `website_unreachable` or `possibly_closed` tag if the site is dead or the homepage text contains "permanently closed" / equivalent in 12 languages.
2. Visitors report closures via the verify prompt → `community_report:permanently_closed` tag.
3. Admin reviews both in the **Website Down** / **Possibly Closed** / **Reported Closed** tabs and archives confirmed cases.

If we ever re-enable a paid API, update this doc + remove the deprecation header from `scripts/check-google-closed.ts`.

---

## Source tag conventions

Always use `source = '<slug>-YYYY-MM-DD'` for ingestion batches (e.g. `vegguide-import-2026-04-17`). That way `DELETE FROM places WHERE source = 'X'` (only with user approval) rolls back a whole batch cleanly.

Stable external IDs go on dedicated columns so they survive a source re-tag:
- `foursquare_id` (text)
- `vegguide_id` (integer)
- `osm_ref` (text, e.g. `node:1234567`)
- `happycow_id` (text)

---

## Checklist for a new ingest batch

- [ ] Adapter emits `IntakeRecord[]` with accurate `externalIds` and `categorize` hints
- [ ] `source` is `<slug>-YYYY-MM-DD` and unique
- [ ] Dry-run first (log counts per action); review a sample of 20 imports
- [ ] `--commit` only after review
- [ ] Add a project memory note summarizing what was imported and any surprises
- [ ] Post-import: glance at the admin **Suspected Wrong Category** and **Pending Verify** tabs to see what needs human review
