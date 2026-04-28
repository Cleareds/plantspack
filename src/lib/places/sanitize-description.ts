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
  // Heuristic: if the text has too many `=` signs (likely attributes/code),
  // drop it. Real prose has very few.
  const eqCount = (s.match(/=/g) || []).length
  if (eqCount >= 3 && eqCount / s.length > 0.01) return null
  return s
}
