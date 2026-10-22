import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { cleanMenuRows, loadMenu, saveMenu } from '@/lib/business/menu-store'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

/** GET: the owner's menu, draft or published, with its items in order. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const { menu, items } = await loadMenu(gate.admin, gate.place.id)
  return NextResponse.json({ place: gate.place, menu, items })
}

/**
 * PUT: replace the menu with the owner's checked rows.
 * Body: { items: MenuRowInput[], status: 'draft' | 'published' }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const { admin, place } = gate

  let body: { items?: unknown; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const status = body.status === 'published' ? 'published' : 'draft'
  const rows = cleanMenuRows(place.id, body.items, place.vegan_level === 'fully_vegan')
  if (status === 'published' && rows.length === 0) {
    return NextResponse.json({ error: 'Add at least one dish before publishing.' }, { status: 400 })
  }

  try {
    await saveMenu(admin, { placeId: place.id, userId: gate.userId, rows, status })
  } catch (err) {
    log.error('[owner-menu] save failed', err)
    return NextResponse.json({ error: 'Saving the menu failed. Your previous menu is unchanged.' }, { status: 500 })
  }

  try {
    revalidatePath(`/place/${place.id}`)
    if (place.slug) revalidatePath(`/place/${place.slug}`)
  } catch (e) {
    log.error('[owner-menu] revalidate failed', e)
  }

  return NextResponse.json({ ok: true, status, count: rows.length, vegan: rows.filter((r) => r.is_vegan).length })
}
