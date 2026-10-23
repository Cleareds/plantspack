// DB-level checks for round 2 on the ARCHIVED test place (invisible on the site).
import { config } from 'dotenv'; config({ path: '.env.local', quiet: true })
import { createClient } from '@supabase/supabase-js'
const PLACE = '20a0a26c-863c-4680-bc0c-94ddae763d53'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any
const ok = (c: boolean, m: string) => console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`)
const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10)

async function main() {
  const { data: adminUser } = await admin.from('users').select('id').eq('username', 'admin').single()
  // a draft event on the archived place
  let { data: ev } = await admin.from('posts').select('id').eq('place_id', PLACE).eq('category', 'event').limit(1).maybeSingle()
  if (!ev) {
    const r = await admin.from('posts').insert({ user_id: adminUser.id, title: 'TEST event (archived place)', content: 'test', category: 'event', privacy: 'draft', place_id: PLACE,
      event_data: { start_time: new Date(Date.now() + 7 * 864e5).toISOString(), location: 'test', is_recurring: false } }).select('id').single()
    ev = r.data
    ok(!r.error, 'draft venue event created' + (r.error ? ': ' + r.error.message : ''))
  }
  const pubEvents = await anon.from('posts').select('id').eq('id', ev.id).eq('privacy', 'public')
  ok((pubEvents.data || []).length === 0, 'draft event not public')

  await admin.from('place_plans').upsert({ place_id: PLACE, plan: 'partner', status: 'canceled', source: 'admin', note: 'test' }, { onConflict: 'place_id' })
  await admin.from('event_features').upsert({ place_id: PLACE, post_id: ev.id, month, created_by: adminUser.id }, { onConflict: 'place_id,month' })
  let f = await anon.from('event_features').select('post_id').eq('place_id', PLACE)
  ok((f.data || []).length === 0, 'feature hidden without an active plan')
  await admin.from('place_plans').update({ status: 'active' }).eq('place_id', PLACE)
  f = await anon.from('event_features').select('post_id').eq('place_id', PLACE)
  ok((f.data || []).length === 1, 'feature readable with an active plan')
  const dup = await admin.from('event_features').insert({ place_id: PLACE, post_id: ev.id, month, created_by: adminUser.id })
  ok(!!dup.error, 'one featured slot per place per month (unique)')

  // booking/order taps
  const before = (await admin.from('place_action_daily').select('count').eq('place_id', PLACE).eq('action', 'booking').maybeSingle()).data?.count ?? 0
  await anon.rpc('record_place_action', { p_place_id: PLACE, p_action: 'booking' })
  const after = (await admin.from('place_action_daily').select('count').eq('place_id', PLACE).eq('action', 'booking').maybeSingle()).data?.count ?? 0
  ok(after === before + 1, 'booking tap counted')

  // nearby deals never include archived places
  const { data: p } = await admin.from('places').select('latitude, longitude').eq('id', PLACE).single()
  await admin.from('place_deals').update({ status: 'active', starts_on: new Date().toISOString().slice(0, 10) }).eq('place_id', PLACE)
  const nd = await anon.rpc('nearby_deals', { p_lat: p.latitude, p_lng: p.longitude, p_km: 5 })
  ok(!nd.error && !(nd.data || []).some((d: any) => d.place_id === PLACE), 'nearby_deals excludes archived places')
  await admin.from('place_deals').update({ status: 'paused' }).eq('place_id', PLACE)

  // booking url constraint
  const bad = await admin.from('places').update({ booking_url: 'javascript:alert(1)' }).eq('id', PLACE)
  ok(!!bad.error, 'booking_url rejects non-http links')

  // message link filter (same regex as the route)
  const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|be|de|nl|fr|io|co|app|shop|eu|uk)\b)/i
  ok(LINK_RE.test('see www.x.be') && LINK_RE.test('go to shop.com now') && !LINK_RE.test('New autumn menu from Friday: pumpkin gnocchi.'), 'links blocked, plain text allowed')

  await admin.from('place_plans').update({ status: 'canceled' }).eq('place_id', PLACE)
}
main().catch((e) => { console.error(e); process.exit(1) })
