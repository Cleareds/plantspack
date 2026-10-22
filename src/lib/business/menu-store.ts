/**
 * Owner menu storage, shared by the API route and tests.
 * Writes run with a service-role client and only after requirePlaceOwner().
 */

export const MAX_MENU_ITEMS = 300

export interface MenuRowInput {
  section?: unknown
  name?: unknown
  description?: unknown
  price?: unknown
  currency?: unknown
  is_vegan?: unknown
}

export interface MenuRow {
  place_id: string
  section: string | null
  name: string
  description: string | null
  price: number | null
  currency: string | null
  is_vegan: boolean
  position: number
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

/** Validate and normalise rows from the editor. Rows without a name are dropped. */
export function cleanMenuRows(placeId: string, raw: unknown, allVegan: boolean): MenuRow[] {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_MENU_ITEMS) : []
  const rows: MenuRow[] = []
  for (const it of list as MenuRowInput[]) {
    const name = cleanText(it?.name, 160)
    if (!name) continue
    const priceNum = typeof it.price === 'number'
      ? it.price
      : typeof it.price === 'string' && it.price.trim() ? parseFloat(it.price.replace(',', '.')) : NaN
    rows.push({
      place_id: placeId,
      section: cleanText(it.section, 80),
      name,
      description: cleanText(it.description, 400),
      price: Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) / 100 : null,
      currency: cleanText(it.currency, 8)?.toUpperCase() ?? null,
      // A 100% vegan place serves only vegan dishes, so every row is vegan.
      is_vegan: allVegan ? true : it.is_vegan === true,
      position: rows.length,
    })
  }
  return rows
}

/**
 * Replace a place's menu. New rows are written before old ones are removed,
 * so a failed save never leaves the place with an empty menu.
 */
export async function saveMenu(admin: any, args: { placeId: string; userId: string; rows: MenuRow[]; status: 'draft' | 'published' }): Promise<void> {
  const now = new Date().toISOString()
  const { error: menuError } = await admin.from('place_menus').upsert({
    place_id: args.placeId,
    status: args.status,
    updated_by: args.userId,
    updated_at: now,
    ...(args.status === 'published' ? { checked_at: now } : {}),
  }, { onConflict: 'place_id' })
  if (menuError) throw menuError

  const { data: oldRows, error: readError } = await admin.from('place_menu_items').select('id').eq('place_id', args.placeId)
  if (readError) throw readError
  if (args.rows.length) {
    const { error: insertError } = await admin.from('place_menu_items').insert(args.rows)
    if (insertError) throw insertError
  }
  const oldIds = (oldRows || []).map((r: { id: string }) => r.id)
  if (oldIds.length) {
    // The new menu is already saved here; a failed cleanup only leaves the
    // old rows behind, so it is logged rather than reported as a failed save.
    const { error: cleanupError } = await admin.from('place_menu_items').delete().in('id', oldIds)
    if (cleanupError) console.error('[owner-menu] old rows not removed', cleanupError)
  }
}

export async function loadMenu(admin: any, placeId: string) {
  const [{ data: menu }, { data: items }] = await Promise.all([
    admin.from('place_menus').select('status, checked_at, updated_at').eq('place_id', placeId).maybeSingle(),
    admin.from('place_menu_items').select('id, section, name, description, price, currency, is_vegan, position').eq('place_id', placeId).order('position'),
  ])
  return { menu: menu ?? null, items: items ?? [] }
}
