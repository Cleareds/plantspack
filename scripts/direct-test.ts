/**
 * Direct test with hardcoded credentials
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mfeelaqjbtnypoojhfjp.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzM5MTIyNCwiZXhwIjoyMDY4OTY3MjI0fQ.oyVwmdmgLVh_ELfBgVFQZjmzcImAVQw8tGe-jAE3SwU'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzOTEyMjQsImV4cCI6MjA2ODk2NzIyNH0.GzLJ-RdHvF0TUXEdRjU8HyOcAopl5kyp81Wc7mSi0z0'

console.log('🔍 Direct API Test\n')
console.log('URL:', supabaseUrl)
console.log('=' .repeat(60))

async function testDirect() {
  // Test with service role
  console.log('\n📝 Testing with SERVICE ROLE key...')
  const supabaseService = createClient(supabaseUrl, serviceKey)

  try {
    const { data, error, count } = await supabaseService
      .from('posts')
      .select('id, content, privacy, deleted_at', { count: 'exact' })
      .limit(10)

    if (error) {
      console.log('❌ Service role error:', error)
      console.log('Error code:', error.code)
      console.log('Error details:', error.details)
      console.log('Error hint:', error.hint)
    } else {
      console.log('✅ Service role SUCCESS!')
      console.log('Total posts:', count)
      console.log('Returned:', data?.length)

      if (data && data.length > 0) {
        console.log('\nSample posts:')
        data.slice(0, 3).forEach((p, i) => {
          console.log(`\n${i + 1}. ID: ${p.id}`)
          console.log(`   Privacy: ${p.privacy}`)
          console.log(`   Deleted: ${p.deleted_at ? 'Yes' : 'No'}`)
          console.log(`   Content: ${p.content?.substring(0, 60)}...`)

          const hashtags = p.content?.match(/#([a-zA-Z0-9_]{2,50})\b/g) || []
          if (hashtags.length > 0) {
            console.log(`   Hashtags: ${hashtags.join(', ')}`)
          }
        })
      }
    }
  } catch (err: any) {
    console.log('❌ Service role exception:', err.message)
  }

  // Test with anon key for comparison
  console.log('\n📝 Testing with ANON key (for comparison)...')
  const supabaseAnon = createClient(supabaseUrl, anonKey)

  try {
    const { data, error, count } = await supabaseAnon
      .from('posts')
      .select('id, content, privacy', { count: 'exact' })
      .limit(10)

    if (error) {
      console.log('❌ Anon key error:', error.message)
    } else {
      console.log('✅ Anon key works!')
      console.log('Total posts visible to anon:', count)
      console.log('Returned:', data?.length)
    }
  } catch (err: any) {
    console.log('❌ Anon key exception:', err.message)
  }

  console.log('\n' + '='.repeat(60))
}

testDirect()
