/**
 * Shared string + geometry helpers for place matching.
 *
 * Used by both ingestion scripts (tsx, server) and server-only code.
 * Safe to import in scripts via `src/lib/places/matching.ts`.
 *
 * Units: distances in meters. UI hooks that want km should wrap these.
 */

export function normalize(s: string): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[''`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance → similarity in [0, 1]. */
export function similarityLev(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return na ? 1 : 0
  if (!na || !nb) return 0
  const m = na.length
  const n = nb.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = na[i - 1] === nb[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return 1 - dp[m][n] / Math.max(m, n)
}

/** Haversine distance between two coords in meters. */
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Grid cell key for coarse spatial bucketing (~1.1 km at the equator). */
export function toGridKey(lat: number, lng: number, size = 0.01): string {
  return `${Math.floor(lat / size)}|${Math.floor(lng / size)}`
}

/** 3x3 neighborhood around (lat, lng) grid keys. */
export function neighborGridKeys(lat: number, lng: number, size = 0.01): string[] {
  const clat = Math.floor(lat / size)
  const clng = Math.floor(lng / size)
  const out: string[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      out.push(`${clat + dy}|${clng + dx}`)
    }
  }
  return out
}

// Chain-restaurant names we never ingest. Lowercase normalized tokens; match as
// exact or prefix-word (so "Subway Inn" doesn't hit "subway" accidentally — if
// that becomes an issue we can add allowlist overrides).
const CHAIN_NAMES = new Set([
  'subway', 'mcdonalds', "mcdonald's", 'starbucks', 'kfc', 'burger king',
  'taco bell', 'chipotle', 'panera', 'panera bread', 'pizza hut', 'dominos',
  "domino's", 'dunkin', 'dunkin donuts', 'whole foods', 'whole foods market',
  'trader joes', "trader joe's", 'costco', 'walmart', 'target', "wendy's",
  'wendys', 'shake shack', 'five guys', 'in-n-out', 'in n out',
  'chick-fil-a', 'chick fil a', 'carls jr', "carl's jr", 'arbys', "arby's",
  'sonic', 'dairy queen', 'jack in the box',
  'aldi', 'lidl', 'tesco', 'sainsburys', "sainsbury's", 'asda', 'morrisons',
  'rewe', 'edeka', 'kaufland', 'netto', 'penny',
])

export function isChainName(name: string): boolean {
  const n = normalize(name)
  if (!n) return false
  for (const c of CHAIN_NAMES) {
    if (n === c) return true
    if (n.startsWith(c + ' ')) return true
  }
  return false
}

/** Normalize a URL into https://… form with no trailing slash. */
export function cleanWebsite(url: string | null | undefined): string | null {
  if (!url) return null
  let u = url.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return u.replace(/\/+$/, '')
}
