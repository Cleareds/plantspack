import { toSlug } from '@/lib/slug'

/**
 * City / country slug normalization for building URLs.
 *
 * This was advertised as an exact mirror of the SQL that fills
 * `directory_cities.city_slug` / `directory_countries.country_slug`
 * (supabase/migrations/20260324000006_add_city_slug_to_views.sql:17-23):
 *
 *   SQL: regexp_replace(regexp_replace(lower(unaccent(name)), '[^a-z0-9]+', '-', 'g'), '^-|-$', '', 'g')
 *
 * It never was, in either direction, and the mismatch was silent:
 *   - the old NFKD pass here could not fold stroke letters, so "Thủ Đức"
 *     came out as "thu-uc" (the D-with-stroke was dropped, not transliterated);
 *   - Postgres `unaccent` ships no rules for Latin Extended Additional, so the
 *     SQL side yields "th-c" for that same name and "h-i-an-tay-ward" for
 *     "Hội An Tây Ward".
 *
 * Both were wrong and neither matched the other. We now emit the properly
 * transliterated form ("thu-duc", "hoi-an-tay-ward"), and `resolveCity()` in
 * @/lib/city-resolve accepts either alphabet so existing `city_slug` links keep
 * resolving while newly generated links are readable.
 *
 * Do NOT use this to look a row up by `city_slug` - use `resolveCity()`.
 */
export function slugifyCityOrCountry(name: string | null | undefined): string {
  if (!name) return ''
  return toSlug(name)
}

/** Display-casing from a slug: "united-kingdom" → "United Kingdom". */
export function slugToDisplay(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
