/**
 * Partner plan (paid business tools). A plan buys tools, never position in
 * lists, the vegan label, verification or review changes.
 */

export const PARTNER_PRICE = { monthEur: 9, yearEur: 79 }

export const PARTNER_FEATURES: Array<{ key: string; title: string; text: string }> = [
  { key: 'deals', title: 'Deals', text: 'Up to 3 active deals on your page and in the app, marked as a deal.' },
  { key: 'insights', title: 'Detailed stats', text: '12-week trends, taps on directions, website and phone, and how you compare with your city.' },
  { key: 'message', title: 'Message city followers', text: 'One short message a month to people who follow your city on PlantsPack.' },
]

export interface PlacePlan {
  plan: 'free' | 'partner'
  status: 'active' | 'past_due' | 'canceled' | null
  source: 'stripe' | 'admin' | null
  interval: 'month' | 'year' | null
  periodEnd: string | null
}

const FREE: PlacePlan = { plan: 'free', status: null, source: null, interval: null, periodEnd: null }

export async function getPlacePlan(admin: any, placeId: string): Promise<PlacePlan> {
  const { data } = await admin
    .from('place_plans')
    .select('plan, status, source, billing_interval, current_period_end')
    .eq('place_id', placeId)
    .maybeSingle()
  if (!data) return FREE
  const graceOk = !data.current_period_end || new Date(data.current_period_end).getTime() > Date.now() - 3 * 864e5
  const active = (data.status === 'active' || data.status === 'past_due') && graceOk
  return {
    plan: active ? 'partner' : 'free',
    status: data.status,
    source: data.source,
    interval: data.billing_interval,
    periodEnd: data.current_period_end,
  }
}
