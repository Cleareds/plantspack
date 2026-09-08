'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAP_TILES,
  OSM_TILES,
  MAP_TILE_CREDIT,
  TILE_ERROR_THRESHOLD,
  cachedTileHealth,
  probeTileProvider,
  reportTileFailure,
} from '@/lib/map-tiles'

/**
 * Picks the basemap every map surface should actually draw, and demotes to raw
 * OSM tiles when the keyed provider stops serving.
 *
 * Before this hook the OSM fallback only triggered when the key was *absent*,
 * so a quota blowout or a revoked key showed users grey error tiles instead of
 * degrading. Two detectors, because neither is sufficient alone:
 *
 *  - `probeTileProvider()` reads a real HTTP status via `fetch`. This is the
 *    one that catches a provider serving 429/403 error-PNGs, which an <img>
 *    reports as a successful `load`.
 *  - `onTileError` counts Leaflet `tileerror` events, which is all we get for
 *    DNS failures, refused connections and truncated bodies.
 *
 * The verdict is cached in sessionStorage, so the probe costs one tile request
 * per browser session and later map views start on the right provider with no
 * flash.
 */
export function useTileSource() {
  // Always start from what is already known. On a first visit that is
  // 'unknown', which optimistically means the keyed provider - the fast path,
  // and correct nearly always. Deliberately not read during render on the
  // server, so hydration stays stable.
  const [degraded, setDegraded] = useState(false)
  const errorCount = useRef(0)

  useEffect(() => {
    if (!MAP_TILES) {
      setDegraded(true)
      return
    }

    if (cachedTileHealth() === 'bad') {
      setDegraded(true)
      return
    }

    let alive = true
    probeTileProvider().then(health => {
      if (alive && health === 'bad') setDegraded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  /**
   * Hand this to Leaflet's `tileerror`. A stray 404 at the edge of a style's
   * zoom range must not demote a working provider, so it takes a run of
   * failures rather than a single one.
   */
  const onTileError = useCallback(() => {
    errorCount.current += 1
    if (errorCount.current < TILE_ERROR_THRESHOLD) return
    reportTileFailure()
    setDegraded(true)
  }, [])

  const tiles = degraded ? OSM_TILES : MAP_TILES ?? OSM_TILES

  return {
    tiles,
    /** True once we have given up on the keyed provider for this session. */
    degraded,
    onTileError,
    /** Credit line matching whichever provider is actually being drawn. */
    credit: degraded ? '© OpenStreetMap' : MAP_TILE_CREDIT,
  }
}
