// Pull every comment (and reply) on one of OUR Instagram posts via the official
// Instagram API (Instagram Login flavour, graph.instagram.com).
//
// Setup (one-time, by the account owner):
//   1. developers.facebook.com -> the existing Meta app -> add product "Instagram"
//      -> "API setup with Instagram login".
//   2. Add @plants.pack as an Instagram tester / generate a token for it with the
//      scopes instagram_business_basic + instagram_business_manage_comments.
//      (Own account in dev mode: no app review needed.)
//   3. Put the token in .env.local as IG_ACCESS_TOKEN=...   (long-lived: 60 days)
//
// Usage: node scripts/ig-comments.mjs <post-url-or-shortcode> [out.json]
// Read-only: never posts, replies or deletes.
import fs from 'fs'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const token = env.IG_ACCESS_TOKEN
if (!token) { console.error('IG_ACCESS_TOKEN missing in .env.local (see header for setup)'); process.exit(1) }

const arg = process.argv[2]
if (!arg) { console.error('usage: node scripts/ig-comments.mjs <post-url-or-shortcode> [out.json]'); process.exit(1) }
const shortcode = (arg.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/) || [, arg])[1]
const API = 'https://graph.instagram.com/v21.0'

async function get(url) {
  const r = await fetch(url)
  const j = await r.json()
  if (j.error) throw new Error(`${j.error.code} ${j.error.message}`)
  return j
}
async function all(url) {
  const out = []
  while (url) { const j = await get(url); out.push(...(j.data || [])); url = j.paging?.next }
  return out
}

// 1. find the media id by matching the permalink shortcode
let media = null
let url = `${API}/me/media?fields=id,permalink,caption,comments_count,timestamp&limit=50&access_token=${token}`
while (url && !media) {
  const j = await get(url)
  media = (j.data || []).find(m => m.permalink?.includes(`/${shortcode}/`))
  url = j.paging?.next
}
if (!media) { console.error(`post ${shortcode} not found on this account`); process.exit(1) }

// 2. comments + replies
const comments = await all(`${API}/${media.id}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&limit=50&access_token=${token}`)
const flat = []
for (const c of comments) {
  flat.push({ id: c.id, username: c.username, text: c.text, timestamp: c.timestamp, reply_to: null })
  for (const r of c.replies?.data || []) flat.push({ id: r.id, username: r.username, text: r.text, timestamp: r.timestamp, reply_to: c.id })
}
const out = process.argv[3] || `reports/ig-comments-${shortcode}.json`
fs.mkdirSync('reports', { recursive: true })
fs.writeFileSync(out, JSON.stringify({ shortcode, media_id: media.id, comments_count: media.comments_count, fetched: flat.length, comments: flat }, null, 2))
console.log(`${out}: ${flat.length} comments+replies fetched (Instagram reports ${media.comments_count})`)
