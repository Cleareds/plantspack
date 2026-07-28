// Shared slug utilities. URLs must be clean ASCII (no %C3%BC for ü, etc.)
// so users get readable links, search engines index them, and routes match.

/**
 * Letters whose diacritic is baked into the glyph rather than carried as a
 * separate combining mark, plus ligatures. NFD decomposition does NOT touch
 * these, so a decompose-and-drop-marks pass alone leaves them non-ASCII:
 *   'Thủ Đức'   -> 'Thu Đuc'   (Đ survives)
 *   'København' -> 'Kbenhavn'  (ø survives)
 *   'Straße'    -> 'Straße'    (ß survives)
 *
 * That gap is what silently disabled the middleware ASCII redirect and let
 * Vietnamese / Nordic / Polish URLs fall through to a route-level 500
 * (GSC "Server error (5xx)" cluster, 2026-07-28).
 */
const FOLD: Record<string, string> = {
  'đ': 'd', 'Đ': 'D', 'ð': 'd', 'Ð': 'D',
  'ø': 'o', 'Ø': 'O', 'œ': 'oe', 'Œ': 'OE',
  'ł': 'l', 'Ł': 'L',
  'æ': 'ae', 'Æ': 'AE',
  'ß': 'ss', 'ẞ': 'SS',
  'þ': 'th', 'Þ': 'TH',
  'ı': 'i', 'İ': 'I',
  'ħ': 'h', 'Ħ': 'H',
  'ŧ': 't', 'Ŧ': 'T',
  'ŋ': 'n', 'Ŋ': 'N',
  'ĸ': 'k', 'ƒ': 'f', 'ſ': 's',
  // Typographic punctuation that turns up in scraped place names.
  '‘': "'", '’': "'", '“': '"', '”': '"',
  '–': '-', '—': '-', '−': '-', ' ': ' ',
}

const NON_ASCII_RE = /[^\u0000-\u007F]/
const NON_ASCII_RE_G = /[^\u0000-\u007F]/gu

/** True when every character is plain ASCII. */
export function isAscii(s: string): boolean {
  return !NON_ASCII_RE.test(s)
}

/** True when the string contains at least one non-ASCII character. */
export function hasNonAscii(s: string): boolean {
  return NON_ASCII_RE.test(s)
}

/**
 * Best-effort transliteration to ASCII: decompose accents, drop the combining
 * marks, then map the glyphs NFD cannot reach (see FOLD above).
 *
 * Characters with no ASCII equivalent (Cyrillic, Greek, CJK, Arabic) are left
 * in place on purpose — callers check `isAscii()` on the result to decide
 * whether folding actually succeeded, instead of silently emitting a mangled
 * slug built from whatever happened to survive.
 */
export function asciiFold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(NON_ASCII_RE_G, ch => FOLD[ch] ?? ch)
}

/** Decompose accented chars, then drop combining marks and folded glyphs. */
export function stripDiacritics(s: string): string {
  return asciiFold(s)
}

/**
 * Lowercase, strip diacritics, replace runs of non-alphanumerics with '-'.
 * "Düsseldorf" -> "dusseldorf"
 * "São Paulo"  -> "sao-paulo"
 * "Thủ Đức"    -> "thu-duc"
 * "United Kingdom" -> "united-kingdom"
 */
export function toSlug(s: string): string {
  return asciiFold(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
