'use client'

import { useInView } from '@/lib/hooks/use-in-view'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface PlaceMapProps {
  latitude: number
  longitude: number
  name: string
  address: string
  category?: string
  veganLevel?: string
  // When present, /map centers on this exact place and auto-focuses its marker.
  placeId?: string
  placeSlug?: string | null
}

// Free Stadia raster tiles (same provider + key as the main /map). We do NOT use
// any Static Maps API here: MapTiler's and Stadia's /static/ endpoints are gated
// behind paid plans (they return a 403 error-PNG on the free tier - that was the
// gray placeholder bug). Raster tiles are on the free tier and cost nothing extra
// on Stadia. Auth is via the api_key query param, so no Referer/origin lock to
// break. This preview is non-interactive (it links to the full /map) and only
// fetches tiles when scrolled near the viewport, so bots/crawlers cost nothing
// and we never ship Leaflet to the place-page bundle.
const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_KEY
const TILE = 256 // CSS px per tile (the @2x URL delivers 512px for retina crispness)
const ZOOM = 15
const GRID = 3 // 3x3 tiles = 768x768, enough to keep the point centered for any offset

// Standard Web Mercator projection: fractional tile coordinates at a given zoom.
function lngToTileX(lng: number, z: number) {
  return ((lng + 180) / 360) * 2 ** z
}
function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
}

export default function PlaceMap({ latitude, longitude, name, placeId, placeSlug }: PlaceMapProps) {
  const { ref, inView } = useInView<HTMLAnchorElement>({ rootMargin: '300px' })

  const href = (() => {
    const params = new URLSearchParams()
    params.set('lat', latitude.toString())
    params.set('lng', longitude.toString())
    params.set('zoom', '17')
    if (placeId) params.set('place', placeId)
    else if (placeSlug) params.set('place', placeSlug)
    return `/map?${params.toString()}`
  })()

  // Center tile + sub-tile fraction, so we can position the grid to put the exact
  // coordinate at the container's center regardless of its (fluid) width.
  const n = 2 ** ZOOM
  const cx = lngToTileX(longitude, ZOOM)
  const cy = latToTileY(latitude, ZOOM)
  const centerTileX = Math.floor(cx)
  const centerTileY = Math.floor(cy)
  const half = (GRID - 1) / 2
  // The point sits `half + frac` tiles from the grid's top-left origin.
  const pointOffsetX = (half + (cx - centerTileX)) * TILE
  const pointOffsetY = (half + (cy - centerTileY)) * TILE

  const tiles = []
  if (STADIA_KEY && inView) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const tx = ((centerTileX - half + c) % n + n) % n // wrap around the antimeridian
        const ty = centerTileY - half + r
        if (ty < 0 || ty >= n) continue // above/below the projected world -> skip (blank)
        tiles.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${c}-${r}`}
            src={`https://tiles.stadiamaps.com/tiles/alidade_smooth/${ZOOM}/${tx}/${ty}@2x.png?api_key=${STADIA_KEY}`}
            alt=""
            aria-hidden
            width={TILE}
            height={TILE}
            loading="lazy"
            className="absolute max-w-none select-none"
            style={{ left: c * TILE, top: r * TILE, width: TILE, height: TILE }}
          />
        )
      }
    }
  }

  return (
    <Link
      ref={ref}
      href={href}
      aria-label={`View ${name} on the full map`}
      className="block h-64 rounded-lg overflow-hidden ghost-border relative z-0 group cursor-pointer bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-50"
    >
      {STADIA_KEY && inView ? (
        <>
          {/* Tile grid, translated so the exact coordinate lands at the container center. */}
          <div
            className="absolute"
            style={{
              left: `calc(50% - ${pointOffsetX}px)`,
              top: `calc(50% - ${pointOffsetY}px)`,
              width: GRID * TILE,
              height: GRID * TILE,
            }}
          >
            {tiles}
          </div>
          {/* Marker: pin tip points at the exact location (container center). */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
            <MapPin className="h-8 w-8 text-primary drop-shadow-md" fill="currentColor" stroke="white" strokeWidth={1.5} />
          </div>
          {/* Attribution (Stadia + OSM ToS). Non-link text since this whole
              preview is already a <Link>; full clickable credits live on /map. */}
          <span className="absolute bottom-0 right-0 z-10 px-1 text-[9px] leading-tight text-on-surface-variant/80 bg-surface-container-lowest/70 rounded-tl pointer-events-none">
            © Stadia Maps © OpenStreetMap
          </span>
        </>
      ) : (
        // Lightweight placeholder: no network, becomes the map when scrolled near.
        <div className="h-full w-full flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-lowest shadow-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-on-surface">View on map</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center pointer-events-none z-20">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-lowest px-4 py-2 rounded-lg shadow-ambient flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-on-surface">View on full map</span>
        </div>
      </div>
    </Link>
  )
}
