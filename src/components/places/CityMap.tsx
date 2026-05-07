'use client'

// Leaflet + cluster CSS scoped to the city-directory route. Webpack chunks
// these so non-map routes don't ship them. Do NOT also load the same
// stylesheets from a CDN at runtime — that turns them into render-blocking
// critical-path resources.
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import { useEffect, useRef, useState } from 'react'

interface CityMapPlace {
  id: string
  slug?: string
  name: string
  category: string
  vegan_level?: string | null
  average_rating?: number | null
  review_count?: number | null
  latitude: number
  longitude: number
}

interface CityMapProps {
  places: CityMapPlace[]
  className?: string
}

export default function CityMap({ places, className = '' }: CityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // Persist map + cluster group across renders so we can update markers in
  // place when the parent re-renders with a different `places` array
  // (e.g. when the user changes filters). Previously we mounted markers
  // exactly once and the map went stale on filter changes.
  const mapInstanceRef = useRef<any>(null)
  const clusterGroupRef = useRef<any>(null)
  const LRef = useRef<any>(null)
  // State counter that flips when the map+cluster finish initializing. Refs
  // alone don't trigger re-renders, so without this the markers effect
  // would fire on first paint (when refs are null), bail out, and never
  // re-run — leaving the map host empty. Bumping this triggers React to
  // re-evaluate the markers effect once the map is actually ready.
  const [mapReady, setMapReady] = useState(0)

  // One-time map + cluster setup
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let cancelled = false

    // CRITICAL: leaflet.markercluster is a UMD plugin that expects L to be
    // present on window at module-evaluation time (it does
    // `var MarkerClusterGroup = L.MarkerClusterGroup = L.FeatureGroup.extend(...)`
    // at the top of its IIFE). If we import it in parallel with leaflet,
    // its evaluation throws "L is not defined" and the entire promise
    // chain rejects silently — leaving the map host empty. Load leaflet
    // first, expose it globally, *then* pull in the cluster plugin.
    ;(async () => {
      const Lmod = await import('leaflet')
      const L = (Lmod as any).default || Lmod
      ;(window as any).L = L
      // @ts-expect-error — leaflet.markercluster ships no .d.ts; we use it
      // as a side-effect import that augments L with markerClusterGroup().
      await import('leaflet.markercluster')
      await import('@/lib/leaflet-config')
      if (cancelled || !mapRef.current) return
      LRef.current = L

      // Default center over the world; the markers effect below will fit
      // bounds the moment the first batch arrives.
      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
        worldCopyJump: true,
      }).setView([20, 0], 2)

      // Tile source: prefer Stadia (matches /map page) with OSM fallback.
      const stadiaKey = process.env.NEXT_PUBLIC_STADIA_KEY
      if (stadiaKey) {
        L.tileLayer(
          `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${stadiaKey}`,
          {
            attribution:
              '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            tileSize: 256,
            maxZoom: 19,
          }
        ).addTo(map)
      } else {
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          maxZoom: 19,
          referrerPolicy: 'origin',
        }).addTo(map)
      }

      const cluster = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true,
        maxClusterRadius: 60,
      })
      map.addLayer(cluster)

      mapInstanceRef.current = map
      clusterGroupRef.current = cluster
      // Force the markers effect to re-run now that map + cluster exist.
      setMapReady(n => n + 1)
      // Tile sizing fix in case the host's height was 0 at mount time.
      setTimeout(() => map.invalidateSize(), 0)
    })().catch((err) => {
      // Surface failures instead of swallowing them silently — the previous
      // bug (parallel-import of leaflet.markercluster) failed silently and
      // left the map host empty for ~24h.
      console.error('[CityMap] init failed:', err)
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        clusterGroupRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers whenever the `places` prop changes (filter changes,
  // pagination, etc.). Cheap because cluster.clearLayers + addLayers
  // is O(n) and we hand-roll the icon lookups via the cached helper.
  useEffect(() => {
    const map = mapInstanceRef.current
    const cluster = clusterGroupRef.current
    const L = LRef.current
    if (!map || !cluster || !L) {
      // Map still initializing; the init effect's resolution will trigger
      // a re-render that lands here on the next tick.
      return
    }

    cluster.clearLayers()
    if (places.length === 0) return

    // Lazy-load the icon factory only on the first render that has data.
    // The promise resolves quickly because leaflet-config was already
    // pre-loaded by the init effect's Promise.all.
    import('@/lib/leaflet-config').then((mod) => {
      const layers: any[] = []
      const lats: number[] = []
      const lngs: number[] = []
      for (const p of places) {
        const icon = mod.getCategoryIcon(
          p.category || 'eat',
          p.vegan_level ?? undefined,
          p.average_rating ?? undefined,
          p.review_count ?? undefined
        )
        const marker = L.marker([p.latitude, p.longitude], { icon }).bindPopup(
          `<a href="/place/${p.slug || p.id}" style="font-weight:600;text-decoration:none;color:#16a34a">${escapeHtml(p.name)}</a>`
        )
        layers.push(marker)
        lats.push(p.latitude)
        lngs.push(p.longitude)
      }
      cluster.addLayers(layers)

      const bounds = L.latLngBounds(
        [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
        [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01]
      )
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })
    })
  }, [places, mapReady])

  if (places.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <div
          className="rounded-xl overflow-hidden h-full w-full bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-50 flex items-center justify-center text-sm text-on-surface-variant"
          style={{ minHeight: '300px' }}
        >
          No places match the current filters.
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="rounded-xl overflow-hidden h-full w-full" style={{ minHeight: '300px' }} />
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
