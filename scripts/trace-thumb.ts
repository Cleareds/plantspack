import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data } = await supabase.from('directory_cities')
    .select('city, country').eq('country', 'United States')
    .order('place_count', { ascending: false }).limit(5)
  console.log('Top 5 US cities by place_count in directory_cities:')
  data?.forEach((r: any) => console.log(`  ${r.city}`))

  const images = JSON.parse(readFileSync('public/data/city-images.json', 'utf-8'))
  const topCity = data?.[0]?.city
  console.log(`\nTop city: ${topCity}`)
  console.log(`Image key '${topCity}|||United States' exists:`, !!images[`${topCity}|||United States`])
}
main().catch(console.error)
