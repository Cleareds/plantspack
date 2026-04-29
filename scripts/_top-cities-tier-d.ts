import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ALREADY_DONE = new Set(['London', 'Berlin', 'Barcelona', 'New York', 'Los Angeles', 'Santiago'])

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Cursor through ALL fully_vegan with no website to count by city.
  let cursor: string | null = null
  const counts = new Map<string, { country: string, count: number }>()
  for (;;) {
    let q = sb.from('places').select('id, city, country')
      .eq('vegan_level', 'fully_vegan').is('archived_at', null)
      .or('website.is.null,website.eq.')
      .order('id').limit(1000)
    if (cursor) q = q.gt('id', cursor)
    const { data, error } = await q
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break
    for (const r of data) {
      if (!r.city || !r.country) continue
      if (ALREADY_DONE.has(r.city)) continue
      const k = `${r.city}|${r.country}`
      const cur = counts.get(k)
      if (cur) cur.count++
      else counts.set(k, { country: r.country, count: 1 })
    }
    cursor = data[data.length - 1].id
    if (data.length < 1000) break
  }

  const ranked = [...counts.entries()].map(([k, v]) => ({ city: k.split('|')[0], country: v.country, count: v.count }))
  ranked.sort((a, b) => b.count - a.count)

  console.log(`Top 25 cities by Tier D (fully_vegan with no website, after archives):`)
  for (const r of ranked.slice(0, 25)) {
    console.log(`  ${r.count.toString().padStart(4)}  ${r.city}, ${r.country}`)
  }
}
main()
