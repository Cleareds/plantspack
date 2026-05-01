// Pure lookup helpers - safe to import from client components.
// The fs-based loader lives in city-images-server.ts to keep `fs` out of
// client bundles (Turbopack errors on `Can't resolve 'fs'` otherwise).

function stripDiacritics(s: string): string {
  // NFD splits accented chars into base + combining diacritic; \p{M} matches
  // the combining marks. Lets "Düsseldorf" match the ASCII-keyed image
  // "Dusseldorf|||Germany" on disk.
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

export function getCityImage(images: Record<string, string>, city: string, country: string): string | null {
  const direct = images[`${city}|||${country}`]
  if (direct) return direct
  const ascii = images[`${stripDiacritics(city)}|||${stripDiacritics(country)}`]
  if (ascii) return ascii
  // Bilingual / parenthetical fallback. City keys often use "FR - NL"
  // ("Saint-Gilles - Sint-Gillis") while places.city stores just one side.
  // The reverse is also true ("Uccle - Ukkel" in places, "Uccle" in images).
  // Also strip "(Province)" suffixes so "Vroenhoven (Riemst)" matches
  // "Vroenhoven". Build candidate forms for both input and key, compare.
  const candidatesFor = (s: string): string[] => {
    const out = new Set<string>()
    const base = stripDiacritics(s).toLowerCase().trim()
    out.add(base)
    // Drop "(...)" parenthetical
    const noParen = base.replace(/\s*\([^)]*\)\s*$/, '').trim()
    if (noParen) out.add(noParen)
    // Split on " - " (bilingual variants)
    if (base.includes(' - ')) for (const half of base.split(' - ')) out.add(half.trim())
    if (noParen.includes(' - ')) for (const half of noParen.split(' - ')) out.add(half.trim())
    return [...out].filter(Boolean)
  }
  const inputCandidates = new Set(candidatesFor(city))
  const countryAscii = stripDiacritics(country)
  const suffixA = `|||${country}`
  const suffixB = `|||${countryAscii}`
  for (const key of Object.keys(images)) {
    if (!key.endsWith(suffixA) && !key.endsWith(suffixB)) continue
    const cityPart = key.split('|||')[0]
    for (const keyForm of candidatesFor(cityPart)) {
      if (inputCandidates.has(keyForm)) return images[key]
    }
  }
  return null
}

export function getCountryThumbnail(images: Record<string, string>, countryName: string, topCityName?: string): string | null {
  if (topCityName) {
    const url = images[`${topCityName}|||${countryName}`]
    if (url) return url
    const ascii = images[`${stripDiacritics(topCityName)}|||${stripDiacritics(countryName)}`]
    if (ascii) return ascii
  }
  const countryAscii = stripDiacritics(countryName)
  for (const [key, url] of Object.entries(images)) {
    if (key.endsWith(`|||${countryName}`) || key.endsWith(`|||${countryAscii}`)) return url
  }
  return null
}
