// Basemap raster tile source. Single point of truth for every map surface
// (/map, city maps, place-page previews) so the provider can be swapped in
// one place.
//
// TEMPORARY (2026-08-26): the Stadia Maps account ran out of free-tier credits
// (200K/mo) and started returning HTTP 429 with an "Account Limit Exceeded"
// error-PNG, so /map, city maps and place-page previews all rendered grey
// error tiles. Swapped to MapTiler `positron`, which is the closest match to
// Stadia `alidade_smooth`, using the MapTiler key already in use on
// /vegan-score.
//
// This is a stopgap, not a fix: MapTiler's free tier is 100K requests/mo, half
// of Stadia's, and is also non-commercial only. To restore properly, either
// move Stadia to Starter ($20/mo, 1M credits, commercial use allowed - the old
// key and style keep working) or cut tile volume (PlaceMap fetches 9 tiles per
// place-page view).
//
// MapTiler authenticates on the Referer header, so every consumer must send the
// origin. A no-referrer request gets a 403 error-PNG, which is why the layers
// and <img> tags below pin referrerPolicy to 'origin'.

// Inline fallback mirrors what VeganScoreMap already ships, so the swap cannot
// silently degrade to raw OSM tiles if NEXT_PUBLIC_MAPTILER_KEY is missing from
// the Vercel environment. Not a secret: NEXT_PUBLIC_* keys are inlined into the
// client bundle either way, and this key is locked to the plantspack.com origin.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '1p2MO19pmpo5G5xadgDF'
const MAPTILER_STYLE = 'positron'

const MAPTILER_ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'

/** Referrer policy every MapTiler request needs, or auth fails with a 403. */
export const MAP_TILE_REFERRER_POLICY = 'origin' as const

/**
 * Keyed basemap for Leaflet surfaces, or `null` when no key is configured so
 * callers fall back to raw OSM tiles.
 */
export const MAP_TILES = MAPTILER_KEY
  ? {
      url: `https://api.maptiler.com/maps/${MAPTILER_STYLE}/{z}/{x}/{y}{r}.png?key=${MAPTILER_KEY}`,
      attribution: MAPTILER_ATTRIBUTION,
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
export const MAP_TILE_CREDIT = MAPTILER_KEY
  ? '© MapTiler © OpenStreetMap'
  : '© OpenStreetMap'

/** True when a keyed provider is configured (drives the static preview grid). */
export const MAP_TILES_ENABLED = Boolean(MAPTILER_KEY)

/**
 * Concrete @2x tile URL for the non-interactive place-page preview grid, which
 * builds plain <img> tags rather than going through Leaflet.
 */
export function staticTileUrl(z: number, x: number, y: number): string {
  return `https://api.maptiler.com/maps/${MAPTILER_STYLE}/${z}/${x}/${y}@2x.png?key=${MAPTILER_KEY}`
}
