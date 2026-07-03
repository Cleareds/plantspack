# Belgium menu-integration pilot — plan

Status: PLAN (not started). Created 2026-07-03. Ties together tasks #1 (menu data),
#2 (per-city engagement), #6 (`<V5>` badge), #7 (stickers). See also memory
`ideas_backlog`.

## Hypothesis
The hardest problem for every vegan directory (HappyCow, Google Maps, us) is **keeping
data current** — restaurants open/close and change menus constantly. If a place's menu
is pulled from the system *they already use*, it stays fresh with zero manual upkeep.
Show the **actual, current menu + a vegan-item/entrée count** on the place page; the
restaurant "supports the project" in return (low-friction, not money). Prove the loop in
one region before scaling.

## Why Belgium / Ghent
- We already hold the data: **681 live BE places, 110 fully-vegan (87 verified), 88 `eat`**
  — concentrated in **Ghent 22, Antwerp 21, Brussels 15** (Bruges 5, Leuven 8). A ~50-60
  place pilot pool. (Counts as of 2026-07-03; refresh via a `places` query.)
- **Ghent = Europe's vegan capital** (birthplace of Thursday Veggie Day) — dense, receptive.
- Small enough for **high-touch onboarding** (~15-20 cafés), which sidesteps the low-traffic
  chicken-and-egg: you personally onboard, you don't ask strangers to self-serve.
- Bonus: **Deliverect is a Ghent company** (see landscape below).

## The value exchange (keep it low-friction, NOT money)
Small cafés can't pay. Fair trade:
- **They get:** a free, always-current menu listing + vegan-item count + `<V5>`-style
  recognition + featured placement + (later) a monthly "you got N views/clicks" stat.
- **We get:** a window sticker / QR code on their door + word-of-mouth ("we're on PlantsPack").

## Phased plan (do NOT lead with heavy API integration)
- **Phase 0 — prove the loop manually.** Shortlist ~15-20 fully-vegan cafés in
  Ghent/Antwerp/Brussels. Ingest each menu the *cheapest way available* (their website /
  PDF / Deliveroo page / hand-entered). Ship `place_menu_items` + menu display + vegan-item
  count (task #1). No API yet. High-touch.
- **Phase 1 — automate the ones that share a system.** Survey which POS/platform the pilot
  cafés actually use. If several cluster on one (likely Lightspeed or Deliverect), build
  **one** auto-sync integration → the "menus never go stale" magic + the real differentiator.
- **Phase 2 — instrument + prove value.** Per-listing views / website clicks / direction
  taps (task #2) → show each partner their numbers = the evidence for the exchange + expansion.
- Measure ~8-12 weeks: do partners promote? does it drive views? does auto-sync hold freshness
  with zero effort? If yes → expand region by region.

## POS / delivery-platform API landscape (researched 2026-07-03)
Key cross-cutting reality: **all four are designed for restaurants/POS to _push_ menus TO
platforms, not for a third party to _read_ an arbitrary restaurant's menu.** Reading a
specific café's menu therefore needs that café's authorization (per-merchant OAuth / keys),
or us being positioned as an integration "channel". Confirm cost + terms before committing
(cost posture: no spend without explicit per-run approval).

| Provider | Access model | Menu data | Cost | Fit for pilot |
|---|---|---|---|---|
| **Lightspeed Restaurant (K/O-Series)** | REST API, **partner-approval gated** ("reserved for Lightspeed partners and approved merchants"); apply to Developer Portal; merchants request access via account managers | Full menu/items via REST | Partner program (approval); merchant needs a Lightspeed subscription | Good IF pilot cafés use Lightspeed. Per-merchant + partner approval. |
| **Deliverect** (Ghent) | **Integration-partner program**; Developer Hub + staging + certification; 1000+ integrations; real-time menu/price/order sync across POS↔channels | Structured menu sync (its core product) | **Custom quote** (by locations/scale) — paid B2B, likely not free | Most strategic (local, aggregates many POS). If a café is already on Deliverect, routing its menu to PlantsPack as a "channel" could be low-effort. Gate: partner approval + cost. |
| **Deliveroo** | **Self-serve Developer Portal** (developers.deliveroo.com); OAuth; suites: Partner Platform / Retail / Signature | **Menu API**: publish/maintain menus incl. stock, prices, POS IDs, allergens — but oriented to *pushing* menus onto Deliveroo | Free dev portal; access to a given restaurant still needs its credentials/authorization | Self-serve signup is a plus. But it's a *delivery* menu (may differ from dine-in) and reading a specific café needs its authorization. |
| **Just Eat Takeaway.com (JET Connect)** | Public Developers Portal (developers.just-eat.com); **partner-issued API keys** (`JE-API-KEY`); menu **ingestion** (push → goes live on JET) | Menu ingest payloads (push model) | Partner keys; T&Cs | Same push-oriented model; BE market is strong (Takeaway.com origin), but read access needs merchant/partner status. |

**Takeaways for us:**
1. There is **no clean public "read any restaurant's menu" API** — every path needs the
   café's cooperation. That's *fine* for a pilot (they're partners) and actually reinforces
   the "restaurant supports us" framing.
2. **Deliverect is the highest-leverage integration** (Belgian, POS-agnostic aggregator) —
   worth a direct partner conversation, but it's paid/custom-quote → confirm cost first.
3. **Deliveroo** has the friendliest (self-serve) developer onboarding; useful if pilot cafés
   are on Deliveroo and authorize us.
4. **Phase 0 needs none of this** — hand-ingest menus. Only invest in an API once the pilot
   cafés reveal a shared platform (avoid building 4 integrations for 20 cafés).

## Risks / open questions
- Smallest vegan cafés often have **no integrated POS** (till + chalkboard) → manual for them.
- Delivery-platform menus ≠ dine-in menus (subsets, delivery pricing). Prefer POS or the
  café's own menu for accuracy.
- **Menu display consent** — trivial with pilot partners; get it explicitly.
- **Cost** — Deliverect/Lightspeed partner programs may carry fees; do not commit spend
  without an explicit cap + approval.
- Define the **vegan-count unit** precisely (vegan items vs entrées); for fully-vegan places
  every item counts (easy), which is why the pilot starts with fully-vegan spots.

## Success metrics (pilot)
- # cafés onboarded with a live menu + count.
- % of menus kept fresh with zero manual effort (auto-sync cohort).
- Per-listing views / clicks / directions uplift vs non-pilot BE places.
- # cafés that display the sticker / actively promote.
