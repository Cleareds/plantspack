import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const buf = readFileSync('/tmp/blog-collage.png')
  // Upload to the post-images bucket so it's publicly served
  const path = `welcome-blog-collage-2026-05-10.png`
  const { error: uerr } = await sb.storage.from('post-images').upload(path, buf, {
    contentType: 'image/png', upsert: true, cacheControl: 'public, max-age=31536000, immutable',
  })
  if (uerr) { console.log('upload err:', uerr.message); return }
  const { data } = sb.storage.from('post-images').getPublicUrl(path)
  console.log('uploaded:', data.publicUrl)
  const { error: u2 } = await sb.from('posts').update({
    image_url: data.publicUrl,
    images: [data.publicUrl],
    updated_at: new Date().toISOString(),
  }).eq('slug','welcome-to-plantspack')
  console.log(u2 ? `update err: ${u2.message}` : 'post updated')
}
main()
