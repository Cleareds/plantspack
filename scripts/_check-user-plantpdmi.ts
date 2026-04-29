import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Find user by username (try exact + ilike for variants)
  const { data: users } = await sb.from('users')
    .select('id, username, created_at, role')
    .or('username.eq.plantpdmi,username.ilike.%plantpdmi%')
  console.log('matching users:', users)
  if (!users || users.length === 0) return

  for (const u of users) {
    console.log('\n=== user', u.username, u.id, '===')
    const tables = [
      ['places', 'created_by'],
      ['posts', 'user_id'],
      ['place_corrections', 'user_id'],
      ['place_reviews', 'user_id'],
      ['comments', 'user_id'],
      ['user_followed_cities', 'user_id'],
      ['user_follows', 'follower_id'],
    ] as const
    for (const [t, col] of tables) {
      const { count, error } = await sb.from(t).select('id', { count: 'exact', head: true }).eq(col, u.id)
      if (error) console.log(`  ${t}.${col}: ERROR ${error.message}`)
      else console.log(`  ${t}.${col}: ${count}`)
    }

    // Show last few places & posts they created
    const { data: places } = await sb.from('places')
      .select('id, name, city, country, created_at, vegan_level, archived_at')
      .eq('created_by', u.id).order('created_at', { ascending: false }).limit(10)
    console.log('\n  recent places:', places?.length || 0)
    for (const p of places || []) console.log('   -', p.created_at, p.name, '|', p.city, p.country, '|', p.vegan_level, p.archived_at ? '(archived)' : '')

    const { data: posts } = await sb.from('posts')
      .select('id, title, slug, created_at, privacy')
      .eq('user_id', u.id).order('created_at', { ascending: false }).limit(10)
    console.log('\n  recent posts:', posts?.length || 0)
    for (const p of posts || []) console.log('   -', p.created_at, '[' + p.privacy + ']', p.title || p.slug)

    const { data: corrs } = await sb.from('place_corrections')
      .select('id, place_id, created_at, status, note')
      .eq('user_id', u.id).order('created_at', { ascending: false }).limit(10)
    console.log('\n  recent corrections:', corrs?.length || 0)
    for (const c of corrs || []) console.log('   -', c.created_at, '[' + c.status + ']', (c.note || '').slice(0, 80))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
