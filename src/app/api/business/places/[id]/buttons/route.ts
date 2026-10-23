import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePartnerPlace } from '@/lib/business/require-owner'
import { log } from '@/lib/logger'

/** "Book a table" / "Order online" buttons (Partner). Links must be https and point to the venue's own systems. */

function cleanUrl(v: unknown): string | null | 'invalid' {
  if (typeof v !== 'string' || !v.trim()) return null
  const t = v.trim()
  if (t.length > 500 || !/^https:\/\/[^\s]+\.[^\s]+/i.test(t)) return 'invalid'
  return t
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const { data } = await gate.admin.from('places').select('booking_url, order_url').eq('id', gate.place.id).single()
  return NextResponse.json({ booking_url: data?.booking_url ?? null, order_url: data?.order_url ?? null, isPartner: gate.plan.plan === 'partner' })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const body = await req.json().catch(() => ({}))
  const booking = cleanUrl(body.booking_url)
  const order = cleanUrl(body.order_url)
  if (booking === 'invalid' || order === 'invalid') {
    return NextResponse.json({ error: 'Use a full link that starts with https://' }, { status: 400 })
  }
  const { error } = await gate.admin.from('places').update({ booking_url: booking, order_url: order }).eq('id', gate.place.id)
  if (error) {
    log.error('[buttons] save failed', error)
    return NextResponse.json({ error: 'Saving failed.' }, { status: 500 })
  }
  try {
    revalidatePath(`/place/${gate.place.id}`)
    if (gate.place.slug) revalidatePath(`/place/${gate.place.slug}`)
  } catch { /* best effort */ }
  return NextResponse.json({ booking_url: booking, order_url: order })
}
