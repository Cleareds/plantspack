import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const closedNames = ['Arancia Blu', 'GecoBiondo', 'Indigeno Roma', 'iVegan', 'Oriental Fonzie', 'Veggy Days Roma']
  const { data } = await sb.from('places')
    .select('id,name,city')
    .in('name', closedNames)
    .or('city.eq.Rome,city.eq.Roma')
    .is('archived_at', null)
  console.log('Archiving:', data?.map(p => p.name).join(', '))

  const { error } = await sb.from('places')
    .update({ archived_at: new Date().toISOString() })
    .in('id', (data || []).map(p => p.id))
  console.log('Result:', error ?? `OK (${data?.length} archived)`)

  // Also archive the duplicate Flower Burger
  const { data: fb } = await sb.from('places').select('id,name,city,created_at').eq('name','Flower Burger').eq('city','Rome').is('archived_at',null).order('created_at')
  console.log('Flower Burger dupes:', fb?.map(p => `${p.id} (${p.created_at})`))
  if (fb && fb.length > 1) {
    // Archive the older one, keep the newer
    const { error: e2 } = await sb.from('places').update({ archived_at: new Date().toISOString() }).eq('id', fb[0].id)
    console.log('Archived older Flower Burger duplicate:', e2 ?? 'OK')
  }

  const { error: eRef } = await sb.rpc('refresh_directory_views')
  console.log('Refreshed views:', eRef ?? 'OK')
}
main()
