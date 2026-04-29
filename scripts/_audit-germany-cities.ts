import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const counts: Record<string, number> = {}
  let from = 0
  while (true) {
    const { data, error } = await sb.from('places')
      .select('city')
      .eq('country', 'Germany')
      .is('archived_at', null)
      .not('city', 'is', null)
      .range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data) counts[r.city as string] = (counts[r.city as string] || 0) + 1
    if (data.length < 1000) break
    from += 1000
  }

  // Sort by ASCII-stripped lowercase to surface duplicates
  const ascii = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
  const groups = new Map<string, string[]>()
  for (const c of Object.keys(counts)) {
    const a = ascii(c)
    if (!groups.has(a)) groups.set(a, [])
    groups.get(a)!.push(c)
  }

  console.log('=== Diacritic / case-only duplicates in Germany ===')
  for (const [, variants] of groups) {
    if (variants.length > 1) {
      console.log('  ' + variants.map(v => `${v} (${counts[v]})`).join('  vs  '))
    }
  }

  console.log('\n=== Likely native ↔ English/alias pairs ===')
  // Manually-curated alias map: (variant => canonical)
  const ALIASES: Array<[RegExp, string]> = [
    [/^Köln$/i, 'Cologne'],
    [/^Koeln$/i, 'Cologne'],
    [/^Koln$/i, 'Cologne'],
    [/^München$/i, 'Munich'],
    [/^Muenchen$/i, 'Munich'],
    [/^Munchen$/i, 'Munich'],
    [/^Nürnberg$/i, 'Nuremberg'],
    [/^Nurnberg$/i, 'Nuremberg'],
    [/^Nuernberg$/i, 'Nuremberg'],
    [/^Hannover$/i, 'Hanover'],
    [/^Frankfurt am Main$/i, 'Frankfurt'],
    [/^Frankfurt \(Main\)$/i, 'Frankfurt'],
    [/^Frankfurt\/Main$/i, 'Frankfurt'],
    [/^Halle \(Saale\)$/i, 'Halle'],
    [/^Halle \(S\.\)$/i, 'Halle'],
    [/^Halle\/Saale$/i, 'Halle'],
    [/^Brunswick$/i, 'Braunschweig'],
  ]
  const found: Record<string, { canonical: string; count: number }[]> = {}
  for (const c of Object.keys(counts)) {
    for (const [re, canonical] of ALIASES) {
      if (re.test(c)) {
        if (!found[canonical]) found[canonical] = []
        found[canonical].push({ canonical: c, count: counts[c] })
      }
    }
  }
  for (const [canon, variants] of Object.entries(found)) {
    const canonCount = counts[canon] || 0
    console.log(`  → ${canon} (${canonCount}) <- ${variants.map(v => `${v.canonical} (${v.count})`).join(', ')}`)
  }

  console.log('\n=== Top 30 cities by count (sanity check) ===')
  Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([c, n]) => console.log(`  ${n.toString().padStart(4)}  ${c}`))
}
main().catch(e => { console.error(e); process.exit(1) })
