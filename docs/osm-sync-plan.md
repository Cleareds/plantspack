# Two-way OSM sync — plan

**Status:** proposed. Step 0 (ODbL attribution) shipped 2026-09-08.
**Author:** drafted 2026-09-08 from a full provenance audit of `places`.

---

## 1. Where we actually stand

Measured 2026-09-08 against production.

| | |
|---|---|
| `places` rows | 61,122 (52,746 live, 8,376 archived) |
| OSM-derived | **46,059 — 87.3% of live** |
| VegGuide | 3,332 (6.3%) |
| Distinct `source` values | **121** |
| Live rows linked to an OSM element (`osm_ref`) | **45,007** |
| `osm_ref` element types | 39,451 `node`, 5,566 `way`, 2 `relation` |
| Live rows with no OSM link | 7,739 (7,733 of them carry a description) |
| Places *created by* a community user | **180**, from 64 contributors |
| `is_verified` / `admin_review` / L3+ | 285 / 305 / 5,926 |

`osm_ref` format is `node:123` / `way:456` (colon, not slash — `intake.ts` writes it).

### What already exists

- **`.github/workflows/osm-sync.yml`** — Sundays 05:00 UTC, runs `scripts/osm-sync.mjs --import`.
  Queries Overpass with a `newer:` filter and **inserts** new high-signal vegan places
  (`diet:vegan=only` / `cuisine=vegan`, non-chain), tagged `osm-auto-sync-<date>` for rollback.
- **`.github/workflows/osm-audit.yml`** — manual, read-only Overpass-vs-DB comparison.
- `scripts/import-osm-all-countries.ts` — the full tag→column mapping.

**The gap:** `osm-sync.mjs` is *insert-only*. Modified elements are returned by the same
`newer:` query and then discarded as "existing". Nothing propagates OSM updates to the 45,007
linked rows, nothing notices retagging, and nothing notices deletion.

---

## 2. Blockers, in the order they bite

### 2.1 The join key is not yet trustworthy

`idx_places_osm_ref` is a **non-unique** index (`20260417200000_data_quality_pipeline.sql:36`).

- **287 `osm_ref` values are held by two live rows each** (574 rows).
- At least one is a genuine mis-link to *two different businesses*:

  ```
  way:337127148  ->  "Ravi Shankar"    (vegguide-import-2026-04-17)
  way:337127148  ->  "Crown & Anchor"  (openstreetmap)
  ```

- `source_id` is not a usable fallback: set on only 36,025 / 45,007, in three formats
  (`osm:node/123`, `osm-node-123`, bare VegGuide integers, `null`).

A sync keyed on `osm_ref` today would write one venue's OSM data onto another venue's row.

> Overlaps with the pending duplicate work — "The Pink House" (Gibsons/Gibson) is both an
> `osm_ref` collision and one of the 229 held pairs in
> `scripts/_merge-auto-duplicates-2026-09-08.mjs`.

### 2.2 There is no field-level provenance

None of `place_edits`, `place_revisions`, `place_field_provenance`, `osm_sync_state` exist.

`updated_at` cannot substitute: **44,987 of 45,007** OSM-linked rows have been modified since
creation, nearly all by bulk scripts. There is currently no way to ask *"did a human set this
field?"* — so **"user data is never overridden" is unenforceable until this is built.**

### 2.3 Licensing (blocks the outbound half only)

Current ToS (`src/app/legal/terms/page.tsx`):

> "you grant Plants Pack a non-exclusive, worldwide, royalty-free license to use, reproduce,
> modify, and display your content **in connection with providing our services**"

Not sublicensable, not redistributable, and scoped to our own service. **This does not permit
relicensing user contributions under ODbL.**

Data that must never reach OSM under any circumstances:

| Source | Live rows | Why |
|---|---|---|
| Google Maps derived | 67 | Categorically prohibited in OSM |
| Foursquare | 87 | Proprietary |
| Scraped directories (VeggieHotels, BioHotels…) | 252 | Unclear rights |
| Web-scraped / AI-written | 762 | Unclear rights |
| AI descriptions generally | ~7,700 | 37% contradicted by the venue's own site |
| User-submitted | 177 | ToS gives no redistribution right |

### 2.4 OSM's own rules

[Automated Edits code of conduct](https://wiki.openstreetmap.org/wiki/Automated_Edits_code_of_conduct)
and [Import/Guidelines](https://wiki.openstreetmap.org/wiki/Import/Guidelines) require, before
any bulk or scripted write: prior community discussion and consensus, a documented wiki page in
the automated-edits log, and a dedicated account (`PlantsPack_Import` convention) linking to it.

An unattended weekly bot push is exactly what these govern. Breaching them gets edits
mass-reverted and the account blocked — and costs us the goodwill of the community supplying
87% of our data.

---

## 3. Design: asymmetric sync

Same weekly cadence, deliberately different trust levels.

```
        OSM  ──────── automated, three-way merge ────────►  PlantsPack
        OSM  ◄── human-gated, curated, consulted ──────────  PlantsPack
```

### 3.1 Field ownership

| Field | Owner | Rule |
|---|---|---|
| `latitude` / `longitude` | OSM | OSM wins unless user-corrected |
| `name` | OSM | three-way merge |
| `address`, `city` | OSM | OSM wins when we never edited |
| `opening_hours` | OSM | OSM wins when we never edited |
| `phone`, `website` | OSM | OSM wins when ours is empty; differing → conflict |
| `cuisine_types` | OSM | OSM is the better authority on origin cuisine |
| `is_pet_friendly` | OSM (`dog=*`) | OSM wins when we never edited |
| `vegan_level` | **PlantsPack** | editorial; informed by `diet:vegan`, never dictated by it |
| `description`, images | **PlantsPack** | no OSM equivalent (and OSM does not want them) |
| `verification_*`, `is_verified` | **PlantsPack** | ours entirely |
| reviews, ratings | **PlantsPack** | never leaves our DB |

**Any field a human touches — admin or community — is locked to us permanently.**

### 3.2 Three-way merge

Base = the OSM value recorded at last sync. Theirs = OSM now. Ours = our current value.

| ours vs base | theirs vs base | action |
|---|---|---|
| unchanged | changed | **take OSM** (fast-forward) |
| changed | unchanged | **keep ours** → outbound candidate |
| changed | changed, differs | **conflict → human queue**, never auto-resolve |
| user-locked | anything | **keep ours**, always |

This is what makes "no data loss" and "user data is source of truth" mechanical rather than
aspirational.

### 3.3 Deletion and retagging are never automatic

If an element vanishes or loses `diet:vegan`, **queue it for review — never auto-archive.**
Two counter-examples from a single afternoon (2026-09-08):

- **Katzentempel Minden** was flagged "not on the official locator"; it *is* on it. The note was
  simply wrong.
- **Goodstore Skånegatan** needed a human to establish it had *relocated* to Åsögatan, not closed.

### 3.4 Schema to add

```sql
-- Which OSM element a place tracks, and what OSM looked like at last sync.
CREATE TABLE public.osm_sync_state (
  place_id        UUID PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  osm_ref         TEXT NOT NULL,              -- 'node:123'
  osm_version     INTEGER,                    -- element version at last sync
  osm_timestamp   TIMESTAMPTZ,
  osm_changeset   BIGINT,
  base_tags       JSONB NOT NULL DEFAULT '{}',-- OSM tags as of last sync (merge base)
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status     TEXT NOT NULL DEFAULT 'ok', -- ok | conflict | vanished | retagged
  UNIQUE (osm_ref)
);

-- Per-field ownership. A row here means "a human set this; OSM must not touch it".
CREATE TABLE public.place_field_provenance (
  place_id     UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  field        TEXT NOT NULL,
  source       TEXT NOT NULL,                 -- 'user' | 'admin' | 'osm' | 'import:<tag>'
  locked       BOOLEAN NOT NULL DEFAULT false,
  updated_by   UUID REFERENCES public.users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, field)
);

-- Only after the 287 collisions are resolved, or this migration fails.
CREATE UNIQUE INDEX CONCURRENTLY idx_places_osm_ref_unique
  ON public.places (osm_ref)
  WHERE osm_ref IS NOT NULL AND archived_at IS NULL;
```

Backfill `place_field_provenance` with `locked = true` for every field on the 180
community-created places, every applied `place_corrections` row, and everything with
`verification_method = 'admin_review'`.

> **Note:** writes must also come from Postgres triggers, not only route handlers — the mobile
> app writes straight to Supabase and skips Next entirely.

---

## 4. Outbound: what to actually offer OSM

**Our value to OSM is not new POIs. It is freshness of a tag nobody else maintains.**

OSM already has these venues. What no one does systematically is *re-check* `diet:vegan`. So the
contribution to offer is:

- `check_date:diet:vegan=YYYY-MM-DD` — an established tag, genuinely useful, uncontroversial
- Closure reports for venues we have confirmed shut
- Corrections on the ~300 places a human at Plants Pack has actually verified

That reframes us from "a directory dumping its database" into "a vegan-specialist project
maintaining a tag the wider community cannot easily keep fresh" — a proposition that can
plausibly survive consultation.

### 4.1 Mechanism, in ascending order of risk

1. **Weekly ODbL GeoJSON diff**, published openly. Zero risk. Low pickup.
2. **MapRoulette challenge** — purpose-built for third-party bulk suggestions; local mappers
   review and apply each one. **Recommended landing point; stay here a long time.**
3. **Direct API edits** — only for the curated, human-verified, licence-clean slice, only after
   community consultation, only from a dedicated account.

OSM Notes are deliberately *not* recommended at volume: mass note creation reads as spam.

### 4.2 How the Plants Pack reference is carried

**On the changeset, never on the element:**

```
created_by = plantspack-sync/1.0
source     = Plants Pack verification sweep
comment    = Refresh diet:vegan check_date for <area> (see wiki)
website    = https://wiki.openstreetmap.org/wiki/Automated_edits/PlantsPack
```

**Do not add a `plantspack:id` tag to elements.** Third-party directory IDs are contested and
would be the fastest way to sour the consultation. Our side of the link is the `osm_ref` column
we already hold.

---

## 5. Sequencing

| # | Step | Depends on | Risk |
|---|---|---|---|
| **0** | **ODbL attribution on the site** — *shipped 2026-09-08* | — | none |
| 1 | Resolve 287 `osm_ref` collisions; re-verify mis-links; add unique index | duplicate merge | low |
| 2 | `osm_sync_state` + `place_field_provenance` + backfill locks | 1 | low |
| 3 | Upgrade `osm-sync.mjs` to three-way merge; conflict queue in Data Quality | 2 | medium |
| 4 | Monthly full per-country reconciliation (deletions/retags), review-only | 3 | low |
| 5 | ToS amendment + contributor opt-in for ODbL relicensing | legal | — |
| 6 | Licence-provenance filter (exclude Google/Foursquare/AI/unconsented) | 5 | low |
| 7 | OSM wiki page + community consultation | 0, 6 | — |
| 8 | MapRoulette challenge from the verified slice | 7 | medium |

**Steps 1–4 deliver the whole "we get updates from OSM" half and are safe today.**
Steps 5–8 are mostly legal and diplomatic work, not engineering.

---

## 6. Step 0 — what shipped 2026-09-08

ODbL attribution was absent from the entire codebase while 87% of the data is OSM-derived. Fixed:

| Surface | What |
|---|---|
| `src/app/legal/attribution/page.tsx` | New canonical attribution page: OSM credit, ODbL link, what we add on top, other sources, map tiles, corrections contact |
| `src/components/layout/Footer.tsx` | Persistent credit line on every page + "Data Attribution" link in the Legal column |
| `src/components/places/VerificationFooter.tsx` | Per-record ODbL credit on the 45,007 OSM-linked place pages, deep-linking to the element |
| `src/app/api/export/places/[country]/route.ts` | `attribution` / `license` / `license_url` / `attribution_url` fields in the JSON payload |
| `src/app/llms.txt/route.ts` | Licence sentence + link to the attribution page |

---

## 7. Known issues found while auditing

- **`scripts/osm-sync.mjs:112`** paginates with `.range()` and no `.order()`. Per our own DB
  notes this can repeat rows across pages, so the dedup set it builds may be incomplete — it can
  miss existing places and re-insert them.
- `source_id` is written in at least three incompatible formats; either normalise it or retire it
  in favour of `osm_ref`.
- 7,733 of the 7,739 non-OSM-linked live places carry a description, most of them AI-written and
  unaudited. These are the rows least eligible to ever go outbound.
