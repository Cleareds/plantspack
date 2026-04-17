import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: followed } = await supabase.from('user_followed_cities').select('id, city, country')
  if (!followed || followed.length === 0) {
    console.log('No followed cities to reset.')
    return
  }
  console.log(`Resetting baseline for ${followed.length} followed rows...`)
  let updated = 0
  for (const f of followed) {
    const { data: cs } = await supabase.from('city_scores').select('score, grade').eq('city', f.city).eq('country', f.country).maybeSingle()
    if (!cs) continue
    const { error } = await supabase.from('user_followed_cities').update({
      last_seen_score: cs.score,
      last_seen_grade: cs.grade,
      score_formula_version: 2,
    }).eq('id', f.id)
    if (!error) updated++
  }
  console.log(`Updated ${updated}/${followed.length} rows.`)
}
main().catch(e => { console.error(e); process.exit(1) })
