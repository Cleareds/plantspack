import { NextRequest, NextResponse } from 'next/server'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { sendEmail } from '@/lib/email'
import { log } from '@/lib/logger'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/**
 * POST /api/business/places/[id]/sticker-request
 * Body: { quantity: number, address: string, note?: string }
 * Emails the request to hello@. No table: the team decides and posts by hand.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => ({}))
  const quantity = Math.min(20, Math.max(1, Math.floor(Number(body.quantity) || 1)))
  const address = typeof body.address === 'string' ? body.address.trim().slice(0, 600) : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 600) : ''
  if (address.length < 10) {
    return NextResponse.json({ error: 'Please add the full postal address.' }, { status: 400 })
  }

  const { data: allowed } = await gate.admin.rpc('check_rate_limit', {
    p_user_id: gate.userId, p_action_type: 'sticker_request', p_max_actions: 2, p_window_minutes: 1440,
  })
  if (allowed === false) {
    return NextResponse.json({ error: 'You already sent a request today. We will reply by email.' }, { status: 429 })
  }

  const { data: user } = await gate.admin.from('users').select('email, username').eq('id', gate.userId).single()
  const placeUrl = `https://www.plantspack.com/place/${gate.place.slug || gate.place.id}`
  const res = await sendEmail({
    to: 'hello@plantspack.com',
    subject: `Sticker request: ${gate.place.name} (${quantity})`,
    html: `<p><strong>${esc(gate.place.name)}</strong>, ${esc([gate.place.city, gate.place.country].filter(Boolean).join(', '))}<br>
      Vegan level: ${esc(gate.place.vegan_level || 'none')}<br>
      <a href="${placeUrl}">${placeUrl}</a></p>
      <p>Requested by ${esc(user?.username || '')} &lt;${esc(user?.email || '')}&gt;${gate.isAdmin ? ' (admin)' : ' (verified owner)'}</p>
      <p><strong>Quantity:</strong> ${quantity}</p>
      <p><strong>Address:</strong><br>${esc(address).replace(/\n/g, '<br>')}</p>
      ${note ? `<p><strong>Note:</strong><br>${esc(note).replace(/\n/g, '<br>')}</p>` : ''}`,
  })
  if (!res.success) {
    log.error('[sticker-request] email failed', res.error)
    return NextResponse.json({ error: 'Sending failed. Please write to hello@plantspack.com.' }, { status: 502 })
  }
  await gate.admin.rpc('log_rate_limit', { p_user_id: gate.userId, p_action_type: 'sticker_request' })
  return NextResponse.json({ ok: true })
}
