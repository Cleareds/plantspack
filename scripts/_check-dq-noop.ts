import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
async function main() {
const env = readFileSync('.env.local','utf8').split('\n').reduce((a:any,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'');return a},{})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TAGS = ['community_report:not_fully_vegan','community_report:not_vegan_friendly','community_report:non_vegan_chain','community_report:vegan_friendly_chain','community_report:few_vegan_options','community_report:actually_fully_vegan','google_review_flag']

const orFilter = TAGS.map(t => `tags.cs.{${t}}`).join(',')

const { data, count } = await sb.from('places')
  .select('id, name, vegan_level, tags', { count: 'exact' })
  .or(orFilter).is('archived_at', null)
console.log('total flagged:', count, 'rows fetched:', data?.length)

const breakdown: Record<string, number> = {}
const noOpDowngrade: any[] = []
for (const p of data || []) {
  const lvl = p.vegan_level || 'null'
  const tagsRel = (p.tags || []).filter((t:string)=>TAGS.includes(t))
  const key = `${lvl} | ${tagsRel.sort().join(',')}`
  breakdown[key] = (breakdown[key] || 0) + 1

  // No-op downgrade: already at vegan_options (lowest)
  if (lvl === 'vegan_options' && (tagsRel.includes('community_report:not_fully_vegan') || tagsRel.includes('community_report:few_vegan_options') || tagsRel.includes('community_report:not_vegan_friendly') || tagsRel.includes('google_review_flag'))) {
    noOpDowngrade.push(p)
  }
  // Also: vegan_friendly + few_vegan_options/not_vegan_friendly → "Set: Has Vegan Options" might be valid (downgrade vegan_friendly→vegan_options)
}
console.log('\n=== Breakdown by (level | tags) ===')
Object.entries(breakdown).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(v.toString().padStart(4), k))
console.log('\n=== No-op downgrades (already at vegan_options): ===', noOpDowngrade.length)
}
main()
