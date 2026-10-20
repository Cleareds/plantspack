#!/usr/bin/env tsx
/**
 * Emails the admin when posts are waiting in the held queue (new accounts
 * posting links; see migration 20261020100000). Runs daily from
 * scripts/_process-submissions.sh. Sends nothing when the queue is empty.
 */
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const TO = 'anton.kravchuk@cleareds.com'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data, error } = await sb
    .from('posts')
    .select('id, title, content, created_at, users:user_id(username, created_at)')
    .eq('moderation_status', 'held')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) { console.error(error.message); process.exit(1) }
  const posts = (data || []).map((p: any) => ({ ...p, users: Array.isArray(p.users) ? p.users[0] : p.users }))
  if (posts.length === 0) { console.log('held queue empty'); return }

  const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
  const rows = posts.map((p: any) => {
    const ageMin = p.users ? Math.round((new Date(p.created_at).getTime() - new Date(p.users.created_at).getTime()) / 60000) : null
    return `<li style="margin:0 0 14px"><strong>${esc(p.title || p.content.slice(0, 80))}</strong><br>
      <span style="color:#666">@${esc(p.users?.username || '?')}${ageMin != null ? `, account ${ageMin} min old when posting` : ''}</span><br>
      <span style="color:#444">${esc(p.content.slice(0, 240))}${p.content.length > 240 ? '…' : ''}</span></li>`
  }).join('')
  const html = `<p>${posts.length} ${posts.length === 1 ? 'post is' : 'posts are'} waiting in the held queue.</p>
    <ul style="padding-left:18px">${rows}</ul>
    <p><a href="https://www.plantspack.com/admin/held-posts">Open the queue</a> to publish, reject or ban.</p>`
  const res = await sendEmail({ to: TO, subject: `${posts.length} held ${posts.length === 1 ? 'post' : 'posts'} to review`, html, text: `${posts.length} held posts: https://www.plantspack.com/admin/held-posts` })
  console.log(res.success ? `digest sent (${posts.length})` : `digest failed: ${JSON.stringify(res.error)}`)
}
main().catch(e => { console.error(e); process.exit(1) })
