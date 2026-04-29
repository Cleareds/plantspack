import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('posts').select('id,content').eq('id','6a99e298-3a35-46b8-b091-a7e5fee32dcb').single()
  const content = data?.content as string

  // Count occurrences of the broken closing pattern
  const broken = (content.match(/<\/p><\/div><\/a>/g) || []).length
  console.log('Broken block endings (</p></div></a>):', broken)

  // Fix: add missing </div> before </a> in each block ending
  const fixed = content.replace(/<\/p><\/div><\/a>/g, '</p></div></div></a>')
  const after = (fixed.match(/<\/p><\/div><\/a>/g) || []).length
  const correctAfter = (fixed.match(/<\/p><\/div><\/div><\/a>/g) || []).length
  console.log('Broken after fix:', after)
  console.log('Correct endings after fix:', correctAfter)

  // Update the DB
  const { error } = await sb.from('posts').update({ content: fixed }).eq('id','6a99e298-3a35-46b8-b091-a7e5fee32dcb')
  console.log('Update result:', error ?? 'OK')
}
main()
