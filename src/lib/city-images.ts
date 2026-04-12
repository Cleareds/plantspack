import { readFileSync } from 'fs'
import { join } from 'path'

let cachedImages: Record<string, string> | null = null

export function loadCityImages(): Record<string, string> {
  if (cachedImages) return cachedImages
  try {
    cachedImages = JSON.parse(readFileSync(join(process.cwd(), 'public/data/city-images.json'), 'utf-8'))
    return cachedImages!
  } catch {
    return {}
  }
}

export function getCityImage(images: Record<string, string>, city: string, country: string): string | null {
  return images[`${city}|||${country}`] || null
}

export function getCountryThumbnail(images: Record<string, string>, countryName: string, topCityName?: string): string | null {
  // Try the specified top city first
  if (topCityName) {
    const url = images[`${topCityName}|||${countryName}`]
    if (url) return url
  }
  // Fallback: find any city image for this country
  for (const [key, url] of Object.entries(images)) {
    if (key.endsWith(`|||${countryName}`)) return url
  }
  return null
}
