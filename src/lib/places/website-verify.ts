/**
 * Lightweight website verification used by the staging pipeline (Tier 2).
 *
 * No browser — native fetch + regex parsing. Matches the patterns already in
 * `.github/workflows/verify-places.yml` (HEAD + GET with closure keywords) and
 * `scripts/enrich-places.js` (meta tag regex extraction).
 *
 * Exports:
 *   verifyWebsite(url, opts?) → WebsiteSignal
 *
 * The returned `signal` is stored as-is in `place_staging.website_signal`
 * (JSONB) and later consumed by:
 *   - src/lib/places/vegan-signal.ts  (reads text fields + ld_json)
 *   - src/lib/places/score.ts         (reads ok, status, ld_json presence, lang)
 */

export interface WebsiteSignal {
  ok: boolean
  status: number | null
  reason: string | null                     // e.g. 'timeout', 'parking_page', 'dead'
  final_url: string | null                  // after redirects
  title: string | null
  description: string | null
  og: Record<string, string>
  lang: string | null
  /** Parsed JSON-LD blocks (schema.org). May include LocalBusiness, Restaurant, etc. */
  ld_json: any[]
  /** Raw body excerpt (first 64K chars) — for downstream scanners. NOT persisted. */
  body_excerpt?: string
  /** Internal menu links detected on the page */
  menu_links: string[]
  /** body byte size */
  body_size: number
  /** true if we suspect the page is a parked/for-sale/expired-domain page */
  parking: boolean
  /** Closed-business text detected verbatim (one of several closure keywords) */
  closure_hint: string | null
  /** Checked timestamp */
  checked_at: string
}

export interface VerifyOptions {
  /** Abort the HEAD / GET after this many ms. Default 6000. */
  timeoutMs?: number
  /** Include the body_excerpt in the returned signal (callers should strip before DB). Default true for local scanners. */
  includeExcerpt?: boolean
  /** User-Agent to send */
  userAgent?: string
}

const DEFAULT_UA = 'PlantsPack-Verify/1.0 (+https://plantspack.com)'

// Closure keywords in 12 languages — same set that already ships in verify-places.yml.
const CLOSURE_KEYWORDS = [
  'permanently closed',
  'definitively closed',
  'we have closed',
  'no longer open',
  'ceased trading',
  'this business has closed',
  'this restaurant has closed',
  'out of business',
  'chiuso definitivamente',              // it
  'dauerhaft geschlossen',               // de
  'définitivement fermé',                // fr
  'cerrado permanentemente',             // es
  'permanentemente fechado',             // pt
  'постоянно закрыт',                    // ru
  '永久歇業', '永久閉店',                 // zh/ja
  '영업 종료',                            // ko
]

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
const closureRe = new RegExp(CLOSURE_KEYWORDS.map(escapeRe).join('|'), 'i')

const PARKED_HINT = /\b(domain (for sale|parked|expired|is available|may be for sale))\b|\bbuy this domain\b/i

// Regexes for lightweight HTML extraction — no DOM library needed.
const titleRe = /<title[^>]*>([\s\S]*?)<\/title>/i
const descriptionRe = /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
const htmlLangRe = /<html[^>]+lang=["']?([a-zA-Z-]{2,8})["']?/i
const ogRe = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']*)["']/gi
const ldJsonRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
// Menu link detector: anchor with href containing /menu|/carte|/speisekarte or .pdf near "menu"
const menuLinkRe = /<a\s[^>]*href=["']([^"']*(menu|carte|speisekarte|karta|meni|ementa)[^"']*|[^"']+\.pdf)["']/gi

function absoluteUrl(rawHref: string, base: string): string | null {
  try {
    return new URL(rawHref, base).href
  } catch {
    return null
  }
}

function extractTitle(html: string): string | null {
  const m = html.match(titleRe)
  if (!m) return null
  return decodeHtml(m[1].trim()).replace(/\s+/g, ' ').slice(0, 300) || null
}

function extractDescription(html: string): string | null {
  const m = html.match(descriptionRe)
  return m ? decodeHtml(m[1]).slice(0, 500) : null
}

function extractLang(html: string): string | null {
  const m = html.match(htmlLangRe)
  return m ? m[1].toLowerCase() : null
}

function extractOg(html: string): Record<string, string> {
  const out: Record<string, string> = {}
  let m: RegExpExecArray | null
  ogRe.lastIndex = 0
  while ((m = ogRe.exec(html)) !== null) {
    out[m[1]] = decodeHtml(m[2])
  }
  return out
}

function extractLdJson(html: string): any[] {
  const out: any[] = []
  let m: RegExpExecArray | null
  ldJsonRe.lastIndex = 0
  while ((m = ldJsonRe.exec(html)) !== null) {
    const raw = m[1].trim()
    try {
      const parsed = JSON.parse(raw)
      out.push(parsed)
    } catch {
      // Some sites wrap multiple objects in an array without brackets. Try loose parse.
      try {
        const fixed = '[' + raw.replace(/}\s*{/g, '},{') + ']'
        const parsed = JSON.parse(fixed)
        if (Array.isArray(parsed)) out.push(...parsed)
      } catch { /* give up on this block */ }
    }
  }
  return out
}

function extractMenuLinks(html: string, base: string): string[] {
  const set = new Set<string>()
  let m: RegExpExecArray | null
  menuLinkRe.lastIndex = 0
  while ((m = menuLinkRe.exec(html)) !== null) {
    const abs = absoluteUrl(m[1], base)
    if (abs) set.add(abs)
  }
  return [...set].slice(0, 10) // cap — some sites have many
}

// Very small HTML entity decoder — we only need common ones for titles/meta.
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…').replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018')
}

function normalizeUrl(url: string): string | null {
  if (!url) return null
  let u = url.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    return new URL(u).href
  } catch {
    return null
  }
}

export async function verifyWebsite(urlInput: string, opts: VerifyOptions = {}): Promise<WebsiteSignal> {
  const nowIso = new Date().toISOString()
  const empty: WebsiteSignal = {
    ok: false, status: null, reason: null, final_url: null,
    title: null, description: null, og: {}, lang: null,
    ld_json: [], menu_links: [], body_size: 0, parking: false,
    closure_hint: null, checked_at: nowIso,
  }

  const url = normalizeUrl(urlInput)
  if (!url) return { ...empty, reason: 'bad_url' }

  const timeoutMs = opts.timeoutMs ?? 6000
  const ua = opts.userAgent ?? DEFAULT_UA

  // HEAD first to cheaply filter 404 / 5xx / timeouts.
  try {
    const headCtrl = new AbortController()
    const headT = setTimeout(() => headCtrl.abort(), timeoutMs)
    const headRes = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: headCtrl.signal,
      headers: { 'User-Agent': ua, Accept: '*/*' },
    })
    clearTimeout(headT)
    if (!(headRes.ok || headRes.status === 403 || headRes.status === 405)) {
      return { ...empty, status: headRes.status, reason: 'dead', final_url: headRes.url }
    }
  } catch (e: any) {
    return { ...empty, reason: e?.name === 'AbortError' ? 'timeout' : 'network_error' }
  }

  // GET to read body.
  try {
    const getCtrl = new AbortController()
    const getT = setTimeout(() => getCtrl.abort(), timeoutMs * 2)
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: getCtrl.signal,
      headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    })
    clearTimeout(getT)
    const finalUrl = res.url || url
    const rawBody = await res.text()
    const body = rawBody.slice(0, 64 * 1024)  // cap for safety
    const body_size = rawBody.length

    const signal: WebsiteSignal = {
      ok: res.ok,
      status: res.status,
      reason: res.ok ? null : 'http_error',
      final_url: finalUrl,
      title: extractTitle(body),
      description: extractDescription(body),
      og: extractOg(body),
      lang: extractLang(body),
      ld_json: extractLdJson(body),
      menu_links: extractMenuLinks(body, finalUrl),
      body_size,
      parking: false,
      closure_hint: null,
      checked_at: nowIso,
    }

    if (opts.includeExcerpt !== false) signal.body_excerpt = body

    // Parking-page detection.
    const titleDesc = `${signal.title ?? ''} ${signal.description ?? ''}`
    if (body_size < 400 || PARKED_HINT.test(titleDesc) || PARKED_HINT.test(body.slice(0, 4000))) {
      signal.parking = true
      signal.ok = false
      signal.reason = 'parking_page'
    }

    // Closure-keyword detection.
    const closureMatch = body.match(closureRe)
    if (closureMatch) {
      signal.closure_hint = closureMatch[0].slice(0, 120)
    }

    return signal
  } catch (e: any) {
    return { ...empty, reason: e?.name === 'AbortError' ? 'timeout' : 'network_error' }
  }
}

/** Strip body_excerpt before persisting the signal (it's 64K of HTML). */
export function persistableSignal(s: WebsiteSignal): Omit<WebsiteSignal, 'body_excerpt'> {
  const { body_excerpt, ...rest } = s
  return rest
}
