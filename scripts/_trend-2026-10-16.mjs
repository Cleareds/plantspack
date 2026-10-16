import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const month = s => s.slice(0, 7)
const all = async (t, cols, f = q => q) => { const out = []; let from = 0; for (;;) { const { data, error } = await f(sb.from(t).select(cols)).range(from, from + 999); if (error) throw error; out.push(...data); if (data.length < 1000) break; from += 1000 } return out }
const users = await all('users', 'created_at, subscription_tier')
const byM = {}; for (const u of users) { const m = month(u.created_at); byM[m] = (byM[m] || 0) + 1 }
console.log('USERS total', users.length, 'by month', JSON.stringify(byM))
console.log('tiers', JSON.stringify(users.reduce((a, u) => { a[u.subscription_tier || 'null'] = (a[u.subscription_tier || 'null'] || 0) + 1; return a }, {})))
const rev = await all('place_reviews', 'created_at', q => q.gte('created_at', '2026-04-01'))
const rm = {}; for (const r of rev) { const m = month(r.created_at); rm[m] = (rm[m] || 0) + 1 }
console.log('REVIEWS by month', JSON.stringify(rm))
for (const t of ['user_followed_cities', 'place_submissions', 'place_staging']) { try { const rows = await all(t, 'created_at', q => q.gte('created_at', '2026-04-01')); const mm = {}; for (const r of rows) { const m = month(r.created_at); mm[m] = (mm[m] || 0) + 1 } console.log(t, JSON.stringify(mm)) } catch (e) { console.log(t, 'ERR', e.message) } }
const adc = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim()
const tok = (await (await fetch('https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/plantspack-seo-bot@plantspack.iam.gserviceaccount.com:generateAccessToken', { method: 'POST', headers: { Authorization: `Bearer ${adc}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/webmasters.readonly'] }) })).json()).accessToken
const gsc = await (await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aplantspack.com/searchAnalytics/query', { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: '2026-04-01', endDate: '2026-10-13', dimensions: ['date'], dataState: 'all', rowLimit: 300 }) })).json()
const gm = {}; for (const r of gsc.rows || []) { const m = month(r.keys[0]); gm[m] ||= [0, 0, 0]; gm[m][0] += r.clicks; gm[m][1] += r.impressions; gm[m][2]++ }
console.log('GSC by month clicks/day:', Object.entries(gm).map(([m, [c, i, n]]) => `${m}: ${(c / n).toFixed(0)}/d (${c} clicks, ${(i / 1000).toFixed(0)}k impr)`).join(' | '))
