// Basemap raster tile source. Single point of truth for every map surface
// (/map, city maps, /vegan-score, place-page previews) so the provider can be
// swapped in one place.
//
// History:
//  - 2026-08-26: the Stadia Maps free tier (200K credits/mo) ran out and tiles
//    started coming back as HTTP 429 "Account Limit Exceeded" error-PNGs, so we
//    swapped to MapTiler `positron` as a stopgap.
//  - 2026-09-08: MapTiler turned out to be worse, not better - the key returns
//    HTTP 403 "Invalid key" on every request, with or without a Referer, so all
//    maps rendered grey. Stadia's monthly credits had meanwhile reset and its
//    tiles serve 200 again, so we swapped back.
//
// Stadia authenticates on the `api_key` query param, so there is no Referer or
// origin lock to break. The trade-off is the monthly cap: at ~200K credits the
// free tier will run dry again if tile volume keeps growing (PlaceMap alone
// fetches 9 tiles per place-page view). The durable fixes are Stadia Starter
// ($20/mo, 1M credits, commercial use allowed - the same key and style keep
// working) or cutting tile volume.
// `.trim()` is load-bearing, not defensive tidiness: the Vercel production
// value was stored with a trailing newline, which got inlined straight into the
// `?api_key=` query string and made Stadia answer 401 on every tile. Any stray
// whitespace in the env var must never be able to grey out every map again.
const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_KEY?.trim() || undefined
const STADIA_STYLE = 'alidade_smooth'

const STADIA_ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'

/**
 * Referrer policy for tile requests. Stadia does not need it (auth is on the
 * query param), but sending the origin is harmless and keeps the OSM fallback
 * within OSM's tile policy, which wants an identifiable referrer.
 */
export const MAP_TILE_REFERRER_POLICY = 'origin' as const

/**
 * Keyed basemap for Leaflet surfaces, or `null` when no key is configured so
 * callers fall back to raw OSM tiles.
 */
export const MAP_TILES = STADIA_KEY
  ? {
      url: `https://tiles.stadiamaps.com/tiles/${STADIA_STYLE}/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`,
      attribution: STADIA_ATTRIBUTION,
      maxZoom: 19,
    }
  : null

/**
 * Concrete OSM tile URL for the place-page preview grid when the keyed
 * provider has failed. OSM serves 256px tiles and has no @2x variant, so this
 * is softer than the keyed tile at the same CSS size - acceptable for a
 * degraded state, and far better than a grid of error tiles.
 */
export function osmStaticTileUrl(z: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
}

/** Keyless fallback. Fine at low volume; OSM's tile policy caps heavy use. */
export const OSM_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  maxZoom: 19,
}

/** Short credit line for surfaces too small for clickable attribution. */
export const MAP_TILE_CREDIT = STADIA_KEY
  ? '© Stadia Maps © OpenStreetMap'
  : '© OpenStreetMap'

/** True when a keyed provider is configured (drives the static preview grid). */
export const MAP_TILES_ENABLED = Boolean(STADIA_KEY)

/**
 * Concrete @2x tile URL for the non-interactive place-page preview grid, which
 * builds plain <img> tags rather than going through Leaflet.
 */
export function staticTileUrl(z: number, x: number, y: number): string {
  return `https://tiles.stadiamaps.com/tiles/${STADIA_STYLE}/${z}/${x}/${y}@2x.png?api_key=${STADIA_KEY}`
}

// ---------------------------------------------------------------------------
// Runtime health check
// ---------------------------------------------------------------------------
//
// Why this is a `fetch` and not an `onerror` handler: raster tile providers
// ship their failures as a *valid PNG* with the reason drawn into the pixels
// ("Account Limit Exceeded", "Invalid key"). Verified in Chrome 2026-09-08 -
// an <img> pointing at a 401, 403, 429 or 500 whose body decodes as an image
// fires `load`, NOT `error`, so Leaflet's `tileerror` never sees it. That is
// precisely how both the 2026-08 quota blowout and the MapTiler dead key
// rendered grey for weeks with nothing to catch them. `fetch()` is the only
// client-side path to the real HTTP status, and Stadia sends
// `access-control-allow-origin: *` on its error responses so the status is
// readable cross-origin.
//
// Cost: one tile request per browser session. The probe deliberately asks for
// a fixed low-zoom tile (z3, ~33KB @2x) that is identical for every user and
// every page, so the CDN and the browser cache absorb almost all of it, and it
// goes through staticTileUrl() on purpose - probing the exact URL shape the
// place-page grid uses, rather than a separate code path that could pass while
// the real one fails.

/** Fixed, tiny, user-independent tile used only for the health check. */
const PROBE_TILE = { z: 3, x: 4, y: 3 }

/** sessionStorage key holding the verdict, so it is one probe per session. */
const PROBE_CACHE_KEY = 'pp:tile-provider'

export type TileHealth = 'ok' | 'bad' | 'unknown'

let memoized: TileHealth = 'unknown'
let inFlight: Promise<TileHealth> | null = null

function readCachedHealth(): TileHealth {
  if (memoized !== 'unknown') return memoized
  try {
    const v = sessionStorage.getItem(PROBE_CACHE_KEY)
    if (v === 'ok' || v === 'bad') return (memoized = v)
  } catch {
    // Private mode / blocked site data. Fall through and just re-probe.
  }
  return 'unknown'
}

function cacheHealth(v: TileHealth) {
  memoized = v
  try {
    if (v !== 'unknown') sessionStorage.setItem(PROBE_CACHE_KEY, v)
  } catch {
    // Non-fatal: we keep the module-level memo either way.
  }
}

/**
 * Synchronous read of an already-known verdict. Lets a component start on the
 * right provider with no error-tile flash on the second and later map views of
 * a session.
 */
export function cachedTileHealth(): TileHealth {
  if (!MAP_TILES) return 'bad'
  if (typeof window === 'undefined') return 'unknown'
  return readCachedHealth()
}

/**
 * Fetch one tile and report whether the keyed provider is really serving.
 *
 * A non-OK status is the only thing treated as `bad`. A thrown fetch is
 * `unknown` on purpose and is never cached: an offline blip or a blocked
 * request would otherwise pin the whole session to OSM tiles, which is a worse
 * outcome than briefly trusting a provider that is probably fine.
 */
export function probeTileProvider(): Promise<TileHealth> {
  if (!MAP_TILES) return Promise.resolve<TileHealth>('bad')
  if (typeof window === 'undefined') return Promise.resolve<TileHealth>('unknown')

  const cached = readCachedHealth()
  if (cached !== 'unknown') return Promise.resolve(cached)
  if (inFlight) return inFlight

  const { z, x, y } = PROBE_TILE
  inFlight = fetch(staticTileUrl(z, x, y), {
    method: 'GET',
    // Same referrer the tile layers send, so the probe authenticates exactly
    // the way the real tiles do rather than testing a different code path.
    referrerPolicy: MAP_TILE_REFERRER_POLICY,
  })
    .then((res): TileHealth => {
      const verdict: TileHealth = res.ok ? 'ok' : 'bad'
      cacheHealth(verdict)
      return verdict
    })
    .catch((): TileHealth => 'unknown')
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

/**
 * Records that Leaflet reported dead tiles. This is the second net, not the
 * first: it cannot see an error-PNG (see the note above), but it does catch
 * what the probe cannot - DNS failure, a refused connection, and truncated or
 * non-image bodies.
 */
export function reportTileFailure() {
  cacheHealth('bad')
}

/** Consecutive Leaflet tile errors tolerated before dropping to OSM. */
export const TILE_ERROR_THRESHOLD = 4
