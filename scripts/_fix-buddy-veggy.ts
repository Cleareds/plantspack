import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { error } = await sb.from('places')
    .update({ vegan_level: 'fully_vegan', description: 'A 100% plant-based restaurant in central Rome serving breakfast, burgers, and cafe food. The entire menu is vegan.' })
    .eq('id', '03bac3e3-4720-4ae5-aa03-40808966dffe')
  console.log('Buddy Veggy → fully_vegan:', error ?? 'OK')
}
main()
