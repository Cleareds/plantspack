/**
 * Audit how many active places will be tagged noindex by the new
 * thin-page predicate, broken down by vegan_level + source.
 * Read-only.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  let last = '00000000-0000-0000-0000-000000000000'
  let total = 0
  let thin = 0
  const byLevel: Record<string, { total: number; thin: number }> = {}
  const bySource: Record<string, { total: number; thin: number }> = {}
  while (true) {
    const { data, error } = await sb
      .from('places')
      .select('id,description,images,main_image_url,website,opening_hours,vegan_level,source')
      .is('archived_at', null)
      .gt('id', last)
      .order('id')
      .limit(1000)
    if (error) throw error
    if (!data?.length) break
    for (const p of data as any[]) {
      total++
      const vl = p.vegan_level ?? 'null'
      const src = p.source ?? 'null'
      if (!byLevel[vl]) byLevel[vl] = { total: 0, thin: 0 }
      if (!bySource[src]) bySource[src] = { total: 0, thin: 0 }
      byLevel[vl].total++
      bySource[src].total++

      const isVeganTier = vl === 'fully_vegan' || vl === 'mostly_vegan'
      const hasDesc = (p.description ?? '').trim().length >= 50
      const hasImage = !!p.main_image_url || (Array.isArray(p.images) && p.images.length > 0)
      const hasWeb = !!p.website
      const hasHours =
        !!p.opening_hours &&
        (typeof p.opening_hours === 'string'
          ? p.opening_hours.trim().length > 0
          : Object.keys(p.opening_hours).length > 0)
      const isThin = !isVeganTier && !hasDesc && !hasImage && !hasWeb && !hasHours
      if (isThin) {
        thin++
        byLevel[vl].thin++
        bySource[src].thin++
      }
    }
    last = (data[data.length - 1] as any).id
    if (data.length < 1000) break
  }

  const summary = {
    total,
    thin,
    indexable: total - thin,
    pct_thin: ((thin / total) * 100).toFixed(1) + '%',
    byLevel,
    bySource: Object.fromEntries(
      Object.entries(bySource)
        .sort((a, b) => b[1].thin - a[1].thin)
        .slice(0, 15)
    ),
  }
  console.log(JSON.stringify(summary, null, 2))
  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'seo-out', 'thin-audit.json'),
    JSON.stringify(summary, null, 2)
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
