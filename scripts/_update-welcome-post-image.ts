import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const HERO = 'https://mfeelaqjbtnypoojhfjp.supabase.co/storage/v1/object/public/city-images/amsterdam--netherlands.jpg?v=mowpiceb'
  const { error } = await sb.from('posts').update({
    image_url: HERO,
    images: [HERO],
    updated_at: new Date().toISOString(),
  }).eq('slug','welcome-to-plantspack')
  console.log(error ? error.message : 'Welcome post hero updated to Amsterdam canal photo')
}
main()
