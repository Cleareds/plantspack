/**
 * City / country slug normalization matching the SQL implementation used by
 * `directory_cities.city_slug` and `directory_countries.country_slug`
 * (see supabase/migrations/20260324000006_add_city_slug_to_views.sql:17–23).
 *
 * SQL: regexp_replace(regexp_replace(lower(unaccent(name)), '[^a-z0-9]+', '-', 'g'), '^-|-$', '', 'g')
 *
 * JS equivalent: lower-case → strip diacritics via NFKD → regex non-alphanumeric → hyphens → trim.
 * Used by both the client (building URLs) and server (looking up the right row by slug).
 */
export function slugifyCityOrCountry(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Display-casing from a slug: "united-kingdom" → "United Kingdom". */
export function slugToDisplay(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
