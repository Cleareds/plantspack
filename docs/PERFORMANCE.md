# Performance — running log

Track PSI baselines, what's been shipped, what's verified, and what's left so future sessions can pick up where the last one stopped. Keep entries in reverse-chronological order.

---

## Session 2026-05-11 — homepage + city-page push

### Starting baseline (before this session)

PSI on `https://www.plantspack.com/` (guest):
- **Desktop: 52**
- **Mobile: 54**
- Visible symptom: featured-places block painted before the hero banner / stats / community section → "bouncy" top of page
- Berlin city page HTML weight: **1.98 MB** (single inline RSC Flight script: 1.62 MB)
- 14 image preloads on homepage, including 3 third-party origins (`buddyroma.com`, `ecrurawfood.it`, `flowerburger.it`)
- Homepage Amsterdam city tile: **5.5 MB downloaded** for a 168×112 displayed image
- Avatar in sidebar: **1.6 MB** for a 16×16 displayed image
- City-image bucket Cache-Control: `max-age=3600` (per Supabase upload default; actually served as `no-cache` from origin)

### Shipped (commits on `main`)

1. **`ba9f142` — Homepage top-block streaming gap fixed.** `HomeContent` was wrapped in `<Suspense fallback={null}>` purely to satisfy `useSearchParams()` for the `?create=true` modal opener. During streaming SSR the entire top block emitted `null` first and streamed in after Featured Places (which sits outside the boundary). Replaced `useSearchParams()` with a one-time `window.location.search` read in a `useEffect`; dropped the Suspense wrapper.
2. **Analytics deferred.** GA / GTM / Microsoft Clarity moved from `strategy="afterInteractive"` → `"lazyOnload"`. They now fire after first paint instead of competing for bandwidth + main thread during the LCP window. Expected TBT win: 100-300ms.
3. **`dc323fc` — Library upgrades (Phase A + B) + homepage `next/image`.**
   - Lib bumps (all semver-safe): next 16.2.1→16.2.6, react 19.2.3→19.2.6, @sentry/nextjs 10.32→10.52, @supabase/supabase-js 2.53→2.105, @supabase/ssr 0.6→0.10, eslint-config-next 15.4→16.2 (matches Next 16, unblocks `next lint`), plus all minors/patches (openai, pg, marked, postcss, autoprefixer, anthropic, dotenv, types, supabase CLI, playwright).
   - New `src/components/ui/SmartImg.tsx` — wraps `next/image` when the URL host is on the `remotePatterns` allowlist, falls back to a raw `<img>` for one-off external CDNs (`buddyroma.com` etc.) so the homepage gets optimized images without breaking on un-allowlisted origins.
   - Homepage spots converted: GuestSignInBanner hero, signed-in city hero, top-cities grid tiles, activity-sidebar avatars + thumbnails, Featured Places cards.
   - `next.config.ts`: `minimumCacheTTL: 31536000` (1y) on Vercel's image CDN; narrowed `deviceSizes` + `imageSizes` to limit variant count (Pro-tier source-image budget conservation).
4. **Supabase city-images bucket cleanup.** `scripts/fix-city-image-cache-ttl.ts` re-uploaded 1,761 / 1,777 objects with `cacheControl=31536000`. 16 transient socket failures — re-runnable. Fixed `scripts/upgrade-city-hero-images.ts` so future uploads default to 1y (was hardcoded to 3600s — original source of the issue).
5. **`c786bff` — City/country page payload slim.**
   - `/api/places/directory` (both city + country branches) now:
     - Collapses `images[]` → `main_image_url` server-side (cards only use the first image; full array was wasted bytes).
     - Truncates `description` to 240 chars + ellipsis (cards show ~150 chars; full text only matters on `/place/[slug]`).
   - City page fetches: `cache: 'no-store'` → `revalidate: 1800` (places) and `revalidate: 600` (experiences).
   - `CityExperienceCard` avatar swapped from `next/image` → `SmartImg`. City pages no longer route avatar transformations through Vercel's image optimizer; preserves the source-image budget for the homepage.

### Verified post-deploy

- **Vercel `/_next/image` cache-control**: `public, max-age=31536000, must-revalidate` ✓
- **Supabase `/storage/v1/render/image/public/...`**: `max-age=31536000` ✓ (image transformer honours stored metadata)
- **Direct `/storage/v1/object/public/...`**: still returns `no-cache` (Supabase intentional default for raw object reads — metadata is stored, just not echoed on this path). Routes that load raw `<img src=supabase-url>` outside the homepage still pay this cost.

### Outstanding (pick up next)

Ordered roughly by ROI / effort ratio.

#### Easy wins (1-2 hours each)

- **Verify Berlin payload drop.** After this session's deploy fully propagates, re-fetch `/vegan-places/germany/berlin` and confirm the HTML dropped from 1.98 MB to ~700 KB. Sample command:
  ```bash
  curl -s -A "Mozilla/5.0" "https://www.plantspack.com/vegan-places/germany/berlin?_=$(date +%s)" \
    -o /tmp/city.html -w "%{size_download}\n"
  ```
- **Material Symbols font** is still render-blocking (~150ms). Tried the `media="print" onload="this.media='all'"` swap pattern, but React 19 JSX strips the `onload` string attribute, so the swap doesn't kick in client-side. Needs either an inline raw `<script>` injection via `dangerouslySetInnerHTML` or moving the icon set off Google Fonts entirely. Self-host as a Next.js font would also work.
- **Lucide-react 0.x → 1.x bump.** 1.x rewrote tree-shaking; estimated 20-50 KB gzip savings on every page that imports icons (i.e. all of them). Audit the icon imports first (a handful of renamed icons in v1). Run bundle-analyzer before/after to confirm.
- **Duplicate ItemList JSON-LD on city pages.** 47 KB inline twice — once as `<script type="application/ld+json">` and once re-serialized inside the Flight hydration payload. Known React 19 streaming SSR issue (already worked around for the brand JSON-LD in `layout.tsx` by placing it in `<head>`). Per-page metadata JSON-LD needs the same `<head>`-slot pattern.
- **3 third-party image preloads** on the homepage Featured Places block (`buddyroma.com`, `ecrurawfood.it`, `flowerburger.it`). Featured-place hero images for places imported before the rehost-via-Supabase pipeline existed. Rehost via `scripts/attach-place-image.ts --slug <slug>` per place — bounded cleanup. Wins 500-1500 ms of cold-cache LCP for guests who hit a cold homepage cache.

#### Medium effort (half-day each)

- **Blog page audit.** Run the homepage playbook on `/blog/[slug]`: fetch HTML, measure RSC payload + preload count + script chunks; identify Suspense-around-`useSearchParams` patterns; identify image preload culprits + Cache-Control; identify render-blocking CSS/scripts. Apply fixes in one push.
- **Place page audit.** Highest traffic page. Already uses raw `<img>` (no Vercel image budget exposure on 50k routes). Likely already in better shape than the homepage was. Worth a measurement before deciding whether to invest.
- **Supabase auth-helpers consolidation.** Still using both `@supabase/auth-helpers-nextjs` (deprecated) and `@supabase/ssr` for session handling. Migrate all `auth-helpers` usage to `ssr`. Touches auth/session code — staging-test critical.
- **Stripe major bumps (18 → 22).** Server-only — no PSI impact, but security hygiene. Each major bumps the API version pin; test webhook flow against staging Stripe account.
- **TS 6 / ESLint 10 / @types/node 25.** Compile-only. Pick up after the others are stable.

#### High effort, biggest single perf win

- **Tailwind v3 → v4.** Built on Lightning CSS (Rust); 5-10× build speed, smaller emitted CSS via native cascade layers + better dead-code elimination. Realistically 5-10 PSI points and 30-100 KB of CSS off every page. **But it's a major rewrite** — config format changes (`@tailwind` → `@import "tailwindcss"`, CSS-first config, no `tailwind.config.js`), custom utilities (`editorial-shadow`, `ghost-border`, `silk-gradient`) need verification, visual regression QA on every breakpoint. Plan as a dedicated session, not bundled with feature work. Tailwind ships a codemod (`npx @tailwindcss/upgrade`) that handles most of the syntax.

### Useful measurement commands (snapshot from this session)

```bash
# Fetch the public HTML for a page and measure key metrics.
URL='https://www.plantspack.com/vegan-places/germany/berlin'
curl -s -A "Mozilla/5.0" "$URL?_=$(date +%s)" -o /tmp/page.html \
  -w "bytes=%{size_download} ttfb=%{time_starttransfer}s\n"

# Body + Flight payload sizes
python3 <<'PY'
import re
h = open('/tmp/page.html').read()
inlines = re.findall(r'<script(?:\s[^>]*)?>(.+?)</script>', h, flags=re.DOTALL)
print('total HTML:', len(h))
print('biggest inline script:', max((len(c) for c in inlines), default=0))
print('image preloads:', len(re.findall(r'<link rel="preload" as="image"', h)))
print('JS chunk count:', len(re.findall(r'src="/_next/static/chunks/', h)))
PY

# Check Supabase image Cache-Control
curl -s -I "https://mfeelaqjbtnypoojhfjp.supabase.co/storage/v1/object/public/city-images/amsterdam--netherlands.jpg" \
  | grep -iE "cache-control|cf-cache"

# Check Vercel image-optimizer cache
curl -s -I "https://www.plantspack.com/_next/image?url=<encoded-url>&w=384&q=75" \
  | grep -iE "cache-control"

# PSI API (when not rate-limited — needs Cloud project + API key)
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$URL&strategy=desktop&category=performance&key=<API_KEY>" \
  | jq '.lighthouseResult.categories.performance.score, .lighthouseResult.audits["largest-contentful-paint"].displayValue'
```

### Reference: where things live

- Homepage rendering: `src/app/page.tsx` (server) + `src/components/home/HomeClient.tsx` (client).
- City page: `src/app/vegan-places/[country]/[city]/page.tsx`. List rendering: `src/components/places/CityPlacesList.tsx`.
- Country page: `src/app/vegan-places/[country]/page.tsx`.
- Place page: `src/app/place/[id]/page.tsx`.
- Place / city image directory API: `src/app/api/places/directory/route.ts`.
- Image helper that picks `next/image` vs raw `<img>` based on host allowlist: `src/components/ui/SmartImg.tsx`.
- `next.config.ts` — `images.remotePatterns`, `minimumCacheTTL`, `deviceSizes`, `imageSizes`, header cache rules.
- Storage upload defaults — fix in the relevant script (`scripts/attach-place-image.ts`, `scripts/upgrade-city-hero-images.ts`, `scripts/scrape-place-og-images.ts`).

### Architecture decisions worth remembering

- **`SmartImg` is the canonical image wrapper.** Use it whenever rendering Supabase or known-CDN images so we get `next/image` optimization on allowlisted hosts and a clean `<img>` fallback elsewhere. Never call `<Image>` from `next/image` directly outside of the homepage — preserves the Vercel Pro source-image budget.
- **City page filtering is fully client-side.** `CityPlacesList` needs every place's data to compute pill counts + apply category/vegan-level/pet filters without server round-trips. The payload slim (drop `images[]`, truncate `description`) is the right way to attack this; switching to server-side filtering would cost UX.
- **JSON-LD in `<body>` double-renders under React 19 streaming SSR.** Once for the real `<script type="application/ld+json">` tag and once inside the Flight hydration payload. Workaround: put it in `<head>` with a stable `id` (see `layout.tsx` brand JSON-LD).
- **Supabase Storage `cacheControl` upload metadata is stored but not always echoed.** The image-transformer (`/render/image/public/`) and Vercel-via-`/_next/image` both honour it. The raw object endpoint (`/storage/v1/object/public/`) returns `no-cache` regardless — Supabase intentional default.
