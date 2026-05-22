import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '7b2cc443-8c74-4da4-a5f9-b51b27bbbea7', // Mudrá
  'ac5c54bc-cd24-4ca6-8d6c-d74f35eac3e5', // B13 bar
  '990d7e19-627d-412e-ba33-7d1e9299a4f4', // VEGA Luna
  '78527c72-7b60-459c-a1d1-954bbaa85c96', // VEGA Álamo
  '5efeb643-0b85-4971-9654-00eb8f7f5efb', // Choose
  '45d1e310-67d0-4fa0-b4f6-6bf493aefb7f', // Distrito Vegano Invernadero
  '467dc6ae-840b-488d-bb9e-d994dd5ae942', // VegAmazing Doughnuts
  '6c8cb23c-2040-4cf7-a545-787a5af1c3cc', // Pizzie & Dixie
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
