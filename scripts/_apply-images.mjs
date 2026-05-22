import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const results = JSON.parse(readFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/image-scrape-results.json','utf8'))
const ok = Object.entries(results).filter(([id, r]) => r.picked && !r.picked.url.startsWith('data:'))
console.log(`Applying ${ok.length} images:`)
for (const [id, r] of ok) {
  const url = r.picked.url
  console.log(`  ${r.name} (${r.city}) → ${url.slice(0,80)}`)
  const { error } = await sb.from('places').update({ main_image_url: url }).eq('id', id)
  if (error) console.log(`    ERR ${error.message}`)
}
