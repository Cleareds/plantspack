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
