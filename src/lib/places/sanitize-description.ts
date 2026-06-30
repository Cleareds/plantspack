// Some scraped place descriptions contain raw HTML (head/meta tags, scripts,
// or boilerplate). Strip tags, collapse whitespace, and drop the description
// entirely if it looks like HTML/CSS/JS boilerplate rather than prose.
const BOILERPLATE_PATTERNS: RegExp[] = [
  /charset\s*=/i,
  /http-equiv\s*=/i,
  /viewport\s*=/i,
  /content-type\s*:\s*text\/html/i,
  /apple-mobile-web-app/i,
  /<!doctype/i,
  /<!--/,
  /\bwindow\.\w+\s*=/,
  /font-family\s*:/i,
]

// Parked-domain / dead-site / placeholder text that must NEVER become a public
// description (e.g. an expired venue domain now showing a registrar sale page,
// the "Ship Inn" / "domain is available for sale" case). Checked at render too,
// so any junk already in the DB is hidden, not just blocked at import.
const DEAD_SITE_PATTERNS: RegExp[] = [
  /domain (is )?(for sale|available)/i,
  /\bthis domain\b/i,
  /buy this domain/i,
  /website is for sale/i,
  /under construction/i,
  /parking page/i,
  /\bgodaddy\b/i,
  /\bnamecheap\b/i,
  /\bdovendi\b/i,
  /lorem ipsum/i,
  /page not found/i,
]

// Generic AI "filler" clichés that signal an invented, low-trust description.
// Not stripped from existing prose, but the enrichment writer rejects output
// matching these so the "cozy atmosphere / locally sourced" pattern can't recur.
const FILLER_PATTERNS: RegExp[] = [
  /cozy atmosphere/i,
  /locally sourced/i,
  /must-visit/i,
  /delightful (array|fusion|twist)/i,
  /culinary (journey|delight|experience)/i,
  /vibrant (vegan |plant-based )?(caf[ée]|atmosphere|spot)/i,
]

/** True if the text reads like generic AI filler rather than a real description. */
export function isGenericFiller(input: string | null | undefined): boolean {
  if (!input) return false
  return FILLER_PATTERNS.some((re) => re.test(input))
}

export function sanitizeDescription(input: string | null | undefined): string | null {
  if (!input) return null
  // Strip HTML tags and decode common entities
  let s = input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return null
  for (const re of BOILERPLATE_PATTERNS) {
    if (re.test(s)) return null
  }
  for (const re of DEAD_SITE_PATTERNS) {
    if (re.test(s)) return null
  }
  // Heuristic: if the text has too many `=` signs (likely attributes/code),
  // drop it. Real prose has very few.
  const eqCount = (s.match(/=/g) || []).length
  if (eqCount >= 3 && eqCount / s.length > 0.01) return null
  return s
}
