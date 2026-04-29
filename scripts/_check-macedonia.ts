import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
async function m() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('places').select('city, country, vegan_level').or('country.ilike.%macedonia%,country.ilike.%makedonija%')
  const groups = new Map<string, number>()
  for (const r of data || []) {
    const k = `${r.country}|${r.city}`
    groups.set(k, (groups.get(k) ?? 0) + 1)
  }
  console.log(`Macedonia-related rows: ${data?.length ?? 0}`)
  for (const [k, n] of [...groups.entries()].sort((a,b) => b[1]-a[1])) console.log(`  ${n.toString().padStart(4)}  ${k}`)
}
m()
