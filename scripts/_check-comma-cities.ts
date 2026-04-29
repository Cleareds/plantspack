import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await sb.from('places').select('city, country').ilike('city', '%,%')
  if (error) { console.error(error); process.exit(1) }
  const map = new Map<string, { country: string, count: number }>()
  for (const r of data || []) {
    const k = `${r.city}|||${r.country}`
    const cur = map.get(k)
    if (cur) cur.count++; else map.set(k, { country: r.country, count: 1 })
  }
  const rows = [...map.entries()].map(([k, v]) => ({ city: k.split('|||')[0], country: v.country, count: v.count }))
  rows.sort((a, b) => b.count - a.count)
  console.log(`Distinct dirty cities: ${rows.length}`)
  console.log(`Total dirty rows: ${data?.length}`)
  console.log('---')
  for (const r of rows.slice(0, 100)) console.log(`${r.count.toString().padStart(4)}  ${r.city}  |  ${r.country}`)
}
main()
