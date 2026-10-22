// End-to-end check of the owner menu pipeline: real scan -> editor rows ->
// save draft -> edit -> publish -> public read -> back to draft.
// Runs on an ARCHIVED place so nothing is visible on the site.
import { config } from 'dotenv'; config({ path: '.env.local', quiet: true })
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { scanOwnerMenu } from '@/lib/tool-scanner'
import { cleanMenuRows, saveMenu, loadMenu } from '@/lib/business/menu-store'

const PLACE = '20a0a26c-863c-4680-bc0c-94ddae763d53' // archived test target
const img = 'data:image/png;base64,' + readFileSync(process.argv[2]).toString('base64')
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function main() {
  const { data: adminUser } = await admin.from('users').select('id').eq('username', 'admin').single()
  const t0 = Date.now()
  const scan = await scanOwnerMenu({ dataUrls: [img] })
  console.log(`1. scan: readable=${scan.readable} items=${scan.items.length} cost=$${scan.costUsd.toFixed(4)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  for (const it of scan.items) console.log(`   [${it.section}] ${it.name} | ${it.price} ${it.currency} | vegan=${it.vegan}${it.description ? ' | ' + it.description : ''}`)

  // What the editor does with the import
  const editorRows = scan.items.map((it) => ({ section: it.section || '', name: it.name, description: it.description || '', price: it.price != null ? String(it.price) : '', currency: it.currency || '', is_vegan: it.vegan === 'yes' }))
  await saveMenu(admin, { placeId: PLACE, userId: adminUser!.id, rows: cleanMenuRows(PLACE, editorRows, false), status: 'draft' })
  let m = await loadMenu(admin, PLACE)
  console.log(`2. draft saved: status=${m.menu?.status} rows=${m.items.length}`)
  const anonDraft = await anon.from('place_menu_items').select('id').eq('place_id', PLACE)
  console.log(`3. public read of a draft: ${anonDraft.data?.length} rows (expect 0)`)

  // Owner edits: rename first, fix a price with comma, move last to top, mark one vegan, delete one, add one
  const edited = m.items.map((r: any) => ({ ...r, price: r.price != null ? String(r.price) : '' }))
  edited[0].name = edited[0].name + ' (edited)'
  edited[1].price = '12,75'
  const last = edited.pop(); edited.unshift(last)
  const risotto = edited.find((r: any) => /risotto/i.test(r.name)); if (risotto) risotto.is_vegan = true
  edited.splice(edited.findIndex((r: any) => /bitterballen/i.test(r.name)), 1)
  edited.push({ section: 'Desserts', name: 'Sorbet van het huis', description: '', price: '6', currency: 'EUR', is_vegan: true })
  await saveMenu(admin, { placeId: PLACE, userId: adminUser!.id, rows: cleanMenuRows(PLACE, edited, false), status: 'published' })
  m = await loadMenu(admin, PLACE)
  console.log(`4. edited + published: status=${m.menu?.status} rows=${m.items.length} checked_at=${!!m.menu?.checked_at}`)
  console.log(`   first row: ${m.items[0].name} | second price: ${m.items[1].price} | last: ${m.items.at(-1).name} | vegan count: ${m.items.filter((r: any) => r.is_vegan).length}`)
  const anonPub = await anon.from('place_menu_items').select('name').eq('place_id', PLACE)
  console.log(`5. public read when published: ${anonPub.data?.length} rows`)
  // fully vegan rule
  const fv = cleanMenuRows(PLACE, [{ name: 'X', is_vegan: false }], true)
  console.log(`6. fully_vegan place forces vegan: ${fv[0].is_vegan}`)

  await saveMenu(admin, { placeId: PLACE, userId: adminUser!.id, rows: cleanMenuRows(PLACE, edited, false), status: 'draft' })
  const anonAfter = await anon.from('place_menu_items').select('id').eq('place_id', PLACE)
  console.log(`7. back to draft (hidden): public rows=${anonAfter.data?.length}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
