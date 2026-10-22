import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlaceOwner } from '@/lib/business/require-owner'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'

const MAX_ITEMS = 300

interface ItemInput {
  section?: unknown
  name?: unknown
  description?: unknown
  price?: unknown
  currency?: unknown
  is_vegan?: unknown
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

/** GET: the owner's menu, draft or published, with its items in order. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const [{ data: menu }, { data: items }] = await Promise.all([
    gate.admin.from('place_menus').select('status, checked_at, updated_at').eq('place_id', gate.place.id).maybeSingle(),
    gate.admin.from('place_menu_items').select('id, section, name, description, price, currency, is_vegan, position').eq('place_id', gate.place.id).order('position'),
  ])
  return NextResponse.json({ place: gate.place, menu: menu ?? null, items: items ?? [] })
}

/**
 * PUT: replace the menu with the owner's checked rows.
 * Body: { items: ItemInput[], status: 'draft' | 'published' }
 * New rows are written before old ones are removed, so a failed save never
 * leaves the place with an empty menu.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePlaceOwner(id)
  if (!gate.ok) return gate.response
  const { admin, place } = gate

  let body: { items?: ItemInput[]; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const status = body.status === 'published' ? 'published' : 'draft'
  const raw = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : []
  const allVegan = place.vegan_level === 'fully_vegan'

  const rows = raw
    .map((it, i) => {
      const name = cleanText(it?.name, 160)
      if (!name) return null
      const priceNum = typeof it.price === 'number' ? it.price : typeof it.price === 'string' && it.price.trim() ? parseFloat(it.price.replace(',', '.')) : NaN
      return {
        place_id: place.id,
        section: cleanText(it.section, 80),
        name,
        description: cleanText(it.description, 400),
        price: Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) / 100 : null,
        currency: cleanText(it.currency, 8)?.toUpperCase() ?? null,
        // A 100% vegan place serves only vegan dishes, so every row is vegan.
        is_vegan: allVegan ? true : it.is_vegan === true,
        position: i,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (status === 'published' && rows.length === 0) {
    return NextResponse.json({ error: 'Add at least one dish before publishing.' }, { status: 400 })
  }

  try {
    const now = new Date().toISOString()
    const { error: menuError } = await admin.from('place_menus').upsert({
      place_id: place.id,
      status,
      updated_by: gate.userId,
      updated_at: now,
      ...(status === 'published' ? { checked_at: now } : {}),
    }, { onConflict: 'place_id' })
    if (menuError) throw menuError

    const { data: oldRows } = await admin.from('place_menu_items').select('id').eq('place_id', place.id)
    if (rows.length) {
      const { error: insertError } = await admin.from('place_menu_items').insert(rows)
      if (insertError) throw insertError
    }
    const oldIds = (oldRows || []).map((r: { id: string }) => r.id)
    if (oldIds.length) {
      const { error: cleanupError } = await admin.from('place_menu_items').delete().in('id', oldIds)
      if (cleanupError) log.error('[owner-menu] old rows not removed', cleanupError)
    }
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
