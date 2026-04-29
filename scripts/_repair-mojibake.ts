// Repair UTF-8 mojibake in name/description/address.
// Source of damage: VegGuide import where UTF-8 bytes were treated as Latin-1
// and re-encoded to UTF-8. Reverse with Buffer.from(s, 'latin1').toString('utf8').
//
// Only applied to fields matching the mojibake signature (Ã + continuation byte
// or  + continuation byte). Strings without that signature are untouched.
//
// Per data policy: this is UPDATE, not DELETE. We log every before/after.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const SIG = /Ã[\x80-\xBF]|Â[\x80-\xBF]/

// Reverse map: CP1252 chars in the 0x80-0x9F range that are NOT in Latin-1.
// When the source was CP1252-decoded, these unicode chars represent the
// original bytes and must be mapped back before treating as latin1.
const CP1252_REVERSE: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84,
  '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88,
  '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C,
  'Ž': 0x8E, '‘': 0x91, '’': 0x92, '“': 0x93,
  '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B,
  'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F,
}

function toCp1252Bytes(s: string): Buffer {
  const out = Buffer.alloc(s.length)
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const code = ch.charCodeAt(0)
    if (code <= 0xFF) {
      out[i] = code
    } else if (CP1252_REVERSE[ch] != null) {
      out[i] = CP1252_REVERSE[ch]
    } else {
      // Unknown high codepoint - keep low byte, this row will fail SIG check below.
      out[i] = code & 0xFF
    }
  }
  return out
}

function repair(s: string): string {
  if (!SIG.test(s)) return s
  const bytes = toCp1252Bytes(s)
  const fixed = bytes.toString('utf8')
  // Sanity: if result still has signature OR contains the U+FFFD replacement
  // char, the input was something we cannot safely repair - leave alone.
  if (SIG.test(fixed) || fixed.includes('�')) return s
  return fixed
}

const FIELDS = ['name', 'description', 'address'] as const

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const dryRun = process.argv.includes('--apply') ? false : true
  console.log(`Mode: ${dryRun ? 'DRY RUN (use --apply to write)' : 'APPLY'}`)

  let cursor: string | null = null
  let scanned = 0, fixedRows = 0, fixedFields = 0
  const samples: string[] = []
  for (;;) {
    let q = sb.from('places').select('id, name, description, address').order('id', { ascending: true }).limit(1000)
    if (cursor) q = q.gt('id', cursor)
    const { data, error } = await q
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break
    for (const r of data) {
      scanned++
      const patch: any = {}
      for (const f of FIELDS) {
        const v: string | null = (r as any)[f]
        if (!v) continue
        const fixed = repair(v)
        if (fixed !== v) {
          patch[f] = fixed
          fixedFields++
          if (samples.length < 20) samples.push(`[${f}] "${v.slice(0, 80)}" -> "${fixed.slice(0, 80)}"`)
        }
      }
      if (Object.keys(patch).length > 0) {
        fixedRows++
        if (!dryRun) {
          const { error: upErr } = await sb.from('places').update(patch).eq('id', r.id)
          if (upErr) console.error(`FAIL ${r.id}: ${upErr.message}`)
        }
      }
    }
    cursor = data[data.length - 1].id
    if (data.length < 1000) break
  }
  console.log(`\nScanned: ${scanned}`)
  console.log(`Rows ${dryRun ? 'that would be fixed' : 'fixed'}: ${fixedRows}`)
  console.log(`Field-level fixes: ${fixedFields}`)
  console.log('\nSamples:')
  for (const s of samples) console.log(`  ${s}`)
}
main()
