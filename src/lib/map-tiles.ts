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
