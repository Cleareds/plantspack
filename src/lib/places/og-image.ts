// Detect URLs that look like illustrations, sketches, decorative graphics,
// or other non-photo assets that pollute social-share previews and Google's
// quality signals. Patterns picked from observed bad data (see Tofu Vegan
// London using a Victorian-era engraving as og:image).
const ILLUSTRATION_PATTERNS: RegExp[] = [
  /illustration[_\-./]/i,
  /\bdrawing[_\-./]/i,
  /\bsketch[_\-./]/i,
  /\bengraving[_\-./]/i,
  /\blithograph[_\-./]/i,
  /\bpainting[_\-./]/i,
  /map[_\-]of[_\-]/i,
  /plan[_\-]of[_\-]/i,
  /coat[_\-]of[_\-]arms/i,
  /_c\.1[78]\d{2}/i,
  /_c\.19\d{2}/i,
  /1[789]th[_\-]century/i,
  /handsketched/i,
  /hand[_\-]drawn/i,
]

export function isLikelyRealPhoto(url: string | null | undefined): boolean {
  if (!url) return false
  if (!/^https?:\/\//i.test(url)) return false
  // Common asset paths used for site chrome, not real photos
  if (/\/(icons?|logos?|backgrounds?|patterns?|chrome)\//i.test(url)) return false
  if (/\.svg(\?|$)/i.test(url)) return false
  for (const re of ILLUSTRATION_PATTERNS) {
    if (re.test(url)) return false
  }
  return true
}

// Return the first URL that passes the photo heuristic, or undefined.
export function pickOgImage(...candidates: (string | null | undefined)[]): string | undefined {
  for (const url of candidates) {
    if (isLikelyRealPhoto(url)) return url as string
  }
  return undefined
}
