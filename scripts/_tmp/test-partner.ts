// DB-level checks for the Partner plan on an ARCHIVED place (invisible on the site).
import { config } from 'dotenv'; config({ path: '.env.local', quiet: true })
import { createClient } from '@supabase/supabase-js'
import { syncVenueSubscription, isVenueEvent } from '@/lib/business/venue-billing'
import { getPlacePlan } from '@/lib/business/plan'

const PLACE = '20a0a26c-863c-4680-bc0c-94ddae763d53'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any
const ok = (c: boolean, m: string) => console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`)

async function main() {
  // free by default
  await admin.from('place_plans').update({ status: 'canceled' }).eq('place_id', PLACE)
  ok((await getPlacePlan(admin, PLACE)).plan === 'free', 'no active plan -> free')

  // a deal exists but the plan is not active -> hidden from the public
  const { data: deal } = await admin.from('place_deals').insert({ place_id: PLACE, title: 'TEST deal (archived place)', status: 'active' }).select('id').single()
  let pub = await anon.from('place_deals').select('id').eq('place_id', PLACE)
  ok((pub.data || []).length === 0, 'deal hidden while the plan is not active')

  // admin grant -> visible
  await admin.from('place_plans').upsert({ place_id: PLACE, plan: 'partner', status: 'active', source: 'admin', note: 'test on archived place' }, { onConflict: 'place_id' })
  ok((await getPlacePlan(admin, PLACE)).plan === 'partner', 'admin grant -> partner')
  pub = await anon.from('place_deals').select('id').eq('place_id', PLACE)
  ok((pub.data || []).length === 1, 'deal visible with an active plan')

  // paused deal -> hidden
  await admin.from('place_deals').update({ status: 'paused' }).eq('id', deal.id)
  pub = await anon.from('place_deals').select('id').eq('place_id', PLACE)
  ok((pub.data || []).length === 0, 'paused deal hidden')

  // future deal -> hidden
  await admin.from('place_deals').update({ status: 'active', starts_on: '2099-01-01' }).eq('id', deal.id)
  pub = await anon.from('place_deals').select('id').eq('place_id', PLACE)
  ok((pub.data || []).length === 0, 'future deal hidden')
  await admin.from('place_deals').update({ status: 'paused', starts_on: new Date().toISOString().slice(0, 10) }).eq('id', deal.id)

  // tap counter
  const before = (await admin.from('place_action_daily').select('count').eq('place_id', PLACE).eq('action', 'website').maybeSingle()).data?.count ?? 0
  await anon.rpc('record_place_action', { p_place_id: PLACE, p_action: 'website' })
  await anon.rpc('record_place_action', { p_place_id: PLACE, p_action: 'hack' })
  const after = (await admin.from('place_action_daily').select('count').eq('place_id', PLACE).eq('action', 'website').maybeSingle()).data?.count ?? 0
  ok(after === before + 1, `record_place_action counts (${before} -> ${after}), unknown action ignored`)

  // Stripe sync from a fake subscription
  const fake: any = { id: 'sub_TEST_archived', status: 'active', customer: 'cus_TEST', metadata: { kind: 'venue_plan', placeId: PLACE, ownerUserId: 'x' },
    items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, price: { recurring: { interval: 'year' } } }] } }
  await syncVenueSubscription(fake)
  let p = await getPlacePlan(admin, PLACE)
  ok(p.plan === 'partner' && p.source === 'stripe' && p.interval === 'year', 'stripe sync -> partner, yearly')
  fake.status = 'canceled'
  await syncVenueSubscription(fake)
  p = await getPlacePlan(admin, PLACE)
  ok(p.plan === 'free', 'stripe cancel -> free')
  // supporter subscription is NOT a venue event
  ok(!isVenueEvent({ data: { object: { metadata: { userId: 'u', tierId: 'medium' } } } } as any), 'supporter subscription not routed as venue')
  ok(isVenueEvent({ data: { object: { subscription_details: { metadata: { kind: 'venue_plan', placeId: PLACE } } } } } as any), 'venue invoice routed as venue')
  // free up the stripe id for real use
  await admin.from('place_plans').update({ stripe_subscription_id: null, stripe_customer_id: null }).eq('place_id', PLACE)
}
main().catch((e) => { console.error(e); process.exit(1) })
