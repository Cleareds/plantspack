// 2026-10-27: public place descriptions must not cite HappyCow as evidence (its terms
// forbid reusing its data). Drop the HappyCow clause; if nothing is left, write a plain
// line from vegan_level + category + city. Original text kept in admin_notes.
// Backup: backups/happycow-descriptions-2026-10-27.json. Dry-run unless --apply.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const apply = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const HC = /happy ?cow/i
const LEVEL = { fully_vegan: '100% vegan', mostly_vegan: 'Mostly vegan', vegan_friendly: 'Vegan-friendly', vegan_options: 'Vegan options at this' }
const NOUN = { eat: 'place to eat', store: 'shop', hotel: 'stay', organisation: 'organisation', event: 'event' }

function strip(desc) {
  const sentences = desc.split(/(?<=[.!?])\s+/).map(s => s.split(/;\s+/).filter(p => !HC.test(p)).join('; ').trim()).filter(Boolean)
  let out = sentences.join(' ').trim()
  if (out && !/[.!?]$/.test(out)) out += '.'
  return out
}

const { data, error } = await sb.from('places').select('id,name,city,country,category,subcategory,vegan_level,description,admin_notes').is('archived_at', null).ilike('description', '%happycow%')
if (error) throw error
let n = 0
for (const p of data) {
  if (p.name === 'HappyCow HQ') continue // the company itself; user keeps it as a vegan-company HQ listing
  let next = strip(p.description)
  if (!next) {
    const noun = (p.subcategory || NOUN[p.category] || 'place').replace(/_/g, ' ')
    next = `${LEVEL[p.vegan_level] ?? 'Vegan'} ${noun} in ${p.city}.`
  }
  console.log(`${p.name.slice(0, 28).padEnd(28)} | ${next.slice(0, 110)}`)
  if (!apply) continue
  const admin_notes = `${p.admin_notes ? p.admin_notes.trimEnd() + '\n' : ''}[2026-10-27 public description no longer cites HappyCow; was: ${p.description}]`
  const { error: e } = await sb.from('places').update({ description: next, admin_notes }).eq('id', p.id)
  if (e) console.log('  ERROR', e.message); else n++
}
console.log(`\napply=${apply}: ${n} updated of ${data.length - 1}`)
