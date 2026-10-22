import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { getPlacePlan } from '@/lib/business/plan'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const PRICES = {
  month: process.env.STRIPE_PARTNER_PRICE_MONTH || '',
  year: process.env.STRIPE_PARTNER_PRICE_YEAR || '',
}

/**
 * POST { interval: 'month' | 'year' } -> { url } of a Stripe Checkout page.
 * Venue subscriptions carry metadata.kind = 'venue_plan' and NEVER a `userId`
 * key, so the supporter webhook handlers cannot mistake them for a supporter
 * subscription. Disabled until the Stripe prices exist (env vars) and the
 * business tools are public.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const body = await req.json().catch(() => ({}))
  const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month'
  const price = PRICES[interval]
  if (!stripe || !price || !BUSINESS_TOOLS_PUBLIC) {
    return NextResponse.json({ error: 'Online payment for the Partner plan opens soon. Write to hello@plantspack.com if you want to start now.' }, { status: 503 })
  }
  const plan = await getPlacePlan(gate.admin, gate.place.id)
  if (plan.plan === 'partner') return NextResponse.json({ error: 'This place already has the Partner plan.' }, { status: 409 })

  const { data: user } = await gate.admin.from('users').select('email').eq('id', gate.userId).single()
  const origin = 'https://www.plantspack.com'
  const metadata = { kind: 'venue_plan', placeId: gate.place.id, ownerUserId: gate.userId }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: user?.email || undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/business/places/${gate.place.id}?plan=started`,
      cancel_url: `${origin}/business/places/${gate.place.id}/plan`,
      metadata,
      subscription_data: { metadata },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    log.error('[partner checkout] failed', err)
    return NextResponse.json({ error: 'Checkout could not start. Please try again.' }, { status: 502 })
  }
}
