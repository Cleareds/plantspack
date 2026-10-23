/**
 * City labels that are administrative units, not towns. Imports (OSM
 * addr:city, Nominatim) leave these; the public city hub only lists a row
 * once the label reads like a town ("Lviv", not "Lviv Urban Hromada").
 * Keep this regex in sync with admin_country_dq_summary() in the DB.
 */
export const ODD_CITY_RE = /\b(hromada|municipality|district|gemeinde|bezirk|oblast|raion|county|province|arrondissement|landkreis|kreis|metropolitan borough|london borough)\b/i

export function isOddCity(city: string | null | undefined): boolean {
  return !!city && ODD_CITY_RE.test(city)
}

/**
 * One-click suggestion, only where stripping the admin word leaves the town:
 *   "Lviv Urban Hromada"            -> "Lviv"
 *   "Stari Grad Urban Municipality" -> "Stari Grad"
 *   "Municipality of Aigaleo"       -> "Aigaleo"
 * Districts, counties and Kreise ("Futian District", "Orange County",
 * "Rhein-Kreis Neuss") sit inside or around a town we cannot guess, so
 * they return null and the admin types the name.
 */
export function suggestCity(city: string): string | null {
  if (!/\b(hromada|municipality)\b/i.test(city)) return null
  const s = city
    .replace(/\b(urban|rural)\s+(hromada|municipality)\b/i, '')
    .replace(/\b(hromada|municipality)\b( of)?/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,-]+|[\s,-]+$/g, '')
    .trim()
  return s && s !== city ? s : null
}
