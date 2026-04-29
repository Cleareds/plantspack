// Shared slug utilities. URLs must be clean ASCII (no %C3%BC for ü, etc.)
// so users get readable links, search engines index them, and routes match.

export function stripDiacritics(s: string): string {
  // Decompose accented chars then drop combining marks.
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Lowercase, strip diacritics, replace runs of non-alphanumerics with '-'.
 * "Düsseldorf" -> "dusseldorf"
 * "São Paulo"  -> "sao-paulo"
 * "United Kingdom" -> "united-kingdom"
 */
export function toSlug(s: string): string {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
