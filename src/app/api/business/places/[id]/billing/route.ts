import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

/**
 * POST -> { url } of Stripe's billing page for this place's Partner plan:
 * cancel (at the end of the period), change card, download invoices.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const { data: plan } = await gate.admin.from('place_plans').select('source, stripe_customer_id').eq('place_id', gate.place.id).maybeSingle()
  if (!stripe || plan?.source !== 'stripe' || !plan.stripe_customer_id) {
    return NextResponse.json({ error: 'This place has no plan paid through Stripe. Write to hello@plantspack.com for help.' }, { status: 404 })
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: plan.stripe_customer_id,
      return_url: `https://www.plantspack.com/business/places/${gate.place.id}/plan`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    log.error('[partner billing] portal failed', err)
    return NextResponse.json({ error: 'The billing page could not open. Please try again.' }, { status: 502 })
  }
}
