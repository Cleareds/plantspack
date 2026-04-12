import { createAdminClient } from '@/lib/supabase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CityScore } from '@/lib/score-utils'

export async function computeAllScores(): Promise<{ scores: CityScore[]; totalPlaces: number }> {
  const supabase = createAdminClient()

  let allPlaces: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('places')
      .select('city, country, category, vegan_level, average_rating, latitude, longitude')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allPlaces.push(...data)
    offset += 1000
    if (data.length < 1000) break
  }

  let populations: Record<string, number> = {}
  try {
    const filePath = join(process.cwd(), 'public/data/city-populations.json')
    populations = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {}

  const byCity: Record<string, any[]> = {}
  for (const p of allPlaces) {
    if (!p.city) continue
    const key = `${p.city}|||${p.country}`
    if (!byCity[key]) byCity[key] = []
    byCity[key].push(p)
  }

  const scores: CityScore[] = Object.entries(byCity)
    .filter(([, ps]) => ps.length >= 1)
    .map(([key, ps]) => {
      const [city, country] = key.split('|||')
      const fv = ps.filter((p: any) => p.vegan_level === 'fully_vegan')
      const fvCount = fv.length
      const pop = populations[key]

      let accessibility = 0
      let perCapita: number | undefined
      if (pop && pop > 0) {
        perCapita = (fvCount / pop) * 100000
        accessibility = Math.min(20, perCapita * 4)
      } else {
        accessibility = Math.min(20, fvCount >= 3 ? 10 : fvCount * 4)
      }

      const choice = Math.min(20, fvCount > 0 ? 7 * Math.log2(fvCount + 1) : 0)

      const fvCats = new Set(fv.map((p: any) => p.category))
      const variety = Math.min(30,
        (fvCats.has('eat') ? 12 : 0) + (fvCats.has('store') ? 8 : 0) +
        (fvCats.has('hotel') ? 6 : 0) + (fvCats.has('event') ? 4 : 0)
      )

      const ratedFv = fv.filter((p: any) => p.average_rating && p.average_rating > 0)
      const avgRating = ratedFv.length > 0 ? ratedFv.reduce((s: number, p: any) => s + p.average_rating, 0) / ratedFv.length : 0
      const reviewCoverage = ratedFv.length / Math.max(1, fvCount)
      const quality = Math.min(30, (avgRating / 5) * 20 + reviewCoverage * 10)

      const score = Math.round(Math.min(100, accessibility + choice + variety + quality))
      const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'

      const avgLat = ps.reduce((s: number, p: any) => s + p.latitude, 0) / ps.length
      const avgLng = ps.reduce((s: number, p: any) => s + p.longitude, 0) / ps.length

      return {
        city, country, score, grade, fvCount, placeCount: ps.length, perCapita,
        center: [avgLat, avgLng] as [number, number],
        breakdown: {
          accessibility: Math.round(accessibility),
          choice: Math.round(choice),
          variety: Math.round(variety),
          quality: Math.round(quality),
        },
      }
    })
    .sort((a, b) => b.score - a.score)

  return { scores, totalPlaces: allPlaces.length }
}
