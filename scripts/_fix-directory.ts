import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { error: e1 } = await sb.from('directory_cities')
    .delete()
    .eq('city', 'Bournemouth')
    .eq('country', 'France')
  console.log('Delete France/Bournemouth:', e1 ?? 'OK')

  const { data: places } = await sb.from('places')
    .select('name, vegan_level, category, is_pet_friendly')
    .eq('city', 'Bournemouth')
    .eq('country', 'United Kingdom')
    .is('archived_at', null)

  const total = places?.length ?? 0
  const fv = places?.filter(p => p.vegan_level === 'fully_vegan').length ?? 0
  const eat = places?.filter(p => p.category === 'eat').length ?? 0
  const store = places?.filter(p => p.category === 'store').length ?? 0
  const hotel = places?.filter(p => p.category === 'hotel').length ?? 0
  const pet = places?.filter(p => p.is_pet_friendly).length ?? 0
  const sampleNames = places?.slice(0, 8).map((p: any) => p.name) ?? []

  console.log(`Recomputed UK/Bournemouth: ${total} places, ${fv} fully_vegan`)

  const { error: e2 } = await sb.from('directory_cities')
    .update({ place_count: total, eat_count: eat, store_count: store, hotel_count: hotel, fully_vegan_count: fv, pet_friendly_count: pet, sample_names: sampleNames })
    .eq('city', 'Bournemouth')
    .eq('country', 'United Kingdom')
  console.log('Update UK/Bournemouth:', e2 ?? 'OK')
}

main()
