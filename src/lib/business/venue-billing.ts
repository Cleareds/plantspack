import type Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Partner plan billing. Venue subscriptions are tagged metadata.kind =
 * 'venue_plan' (+ placeId, ownerUserId) and are handled here, never by the
 * supporter handlers.
 */

export function isVenueMetadata(meta: Record<string, string> | null | undefined): boolean {
  return meta?.kind === 'venue_plan' && typeof meta.placeId === 'string'
}

export function isVenueEvent(event: Stripe.Event): boolean {
  const obj = event.data.object as any
  if (isVenueMetadata(obj?.metadata)) return true
  // Invoices carry the subscription's metadata in subscription_details (API
  // version dependent location).
  return isVenueMetadata(obj?.subscription_details?.metadata) || isVenueMetadata(obj?.parent?.subscription_details?.metadata)
}

function mapStatus(s: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' {
  if (s === 'active' || s === 'trialing') return 'active'
  if (s === 'past_due' || s === 'unpaid' || s === 'incomplete') return 'past_due'
  return 'canceled'
}

export async function syncVenueSubscription(sub: Stripe.Subscription): Promise<void> {
  const meta = sub.metadata as Record<string, string>
  if (!isVenueMetadata(meta)) return
  const item = sub.items?.data?.[0] as any
  const periodEnd = item?.current_period_end ?? (sub as any).current_period_end
  const interval = item?.price?.recurring?.interval
  const admin = createAdminClient() as any
  const { error } = await admin.from('place_plans').upsert({
    place_id: meta.placeId,
    plan: 'partner',
    status: mapStatus(sub.status),
    source: 'stripe',
    billing_interval: interval === 'year' ? 'year' : 'month',
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'place_id' })
  if (error) throw error
  const { data: place } = await admin.from('places').select('id, slug').eq('id', meta.placeId).maybeSingle()
  try {
    if (place) {
      revalidatePath(`/place/${place.id}`)
      if (place.slug) revalidatePath(`/place/${place.slug}`)
    }
  } catch { /* revalidation is best-effort */ }
}

export async function handleVenueEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (typeof session.subscription === 'string') {
        await syncVenueSubscription(await stripe.subscriptions.retrieve(session.subscription))
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncVenueSubscription(event.data.object as Stripe.Subscription)
      break
    default:
      // Invoice events: the subscription.updated event carries the status change.
      break
  }
}
