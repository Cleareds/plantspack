import 'server-only'
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
