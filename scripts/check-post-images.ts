import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

config({ path: resolve(process.cwd(), '.env.local') })

async function checkPostImages() {
  const supabase = createAdminClient()

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, images, image_url, video_urls')
    .limit(5)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Recent posts with media:\n')
  posts?.forEach(post => {
    console.log(`Post ID: ${post.id}`)
    console.log(`Content: ${post.content?.substring(0, 50)}...`)
    console.log(`images array: ${JSON.stringify(post.images)}`)
    console.log(`image_url (legacy): ${post.image_url}`)
    console.log(`video_urls: ${JSON.stringify(post.video_urls)}`)
    console.log('---\n')
  })
}

checkPostImages()
