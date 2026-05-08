/**
 * Tag the 11 mostly_vegan Belgium places that ChatGPT's audit flagged for
 * manual vegan-level review. Writes places.admin_notes with the "audit-"
 * prefix so they surface under the data-quality page's audit_flagged filter.
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COMMIT = process.argv.includes('--commit')

async function main() {
  const data = JSON.parse(readFileSync('scripts/seo-out/belgium-vegan-levels.json', 'utf8'))
  const rows: Array<{ id: string; name: string; city: string; issues: string }> = data.manual_review
  console.log(`${COMMIT ? 'COMMIT' : 'DRY-RUN'}: tagging ${rows.length} rows`)

  for (const r of rows) {
    const note = `audit-2026-05-08: vegan_level needs manual review. ChatGPT audit: ${r.issues.replace(/\s+/g, ' ').slice(0, 280)}`
    console.log(`  ${r.name} (${r.city})`)
    if (!COMMIT) continue
    const { error } = await sb.from('places').update({ admin_notes: note, updated_at: new Date().toISOString() }).eq('id', r.id)
    if (error) console.log('    ERR', error.message)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
