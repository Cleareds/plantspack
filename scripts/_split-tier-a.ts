// Refine Tier A: places whose own NAME suggests vegan (Vegan Burger, Plant House, etc.)
// almost certainly use meat words on their menu only as labels for vegan versions.
// Places whose name is animal-centric (Sushi X, Royal India, etc.) and got web hits
// are the real mislabel candidates.

import { readFileSync, writeFileSync } from 'fs'

const VEGAN_NAME = /\b(vegan|vegana|vegano|plant|plnt|herbi|veggie|veg[eé]tal|raw|govinda|krishna|fleischerei vegan|vegane fleischerei|planta|beyond)\b/i

function parseCsv(path: string): Record<string, string>[] {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells: string[] = []
    let cur = '', inQ = false
    for (let j = 0; j < lines[i].length; j++) {
      const c = lines[i][j]
      if (c === '"') {
        if (inQ && lines[i][j + 1] === '"') { cur += '"'; j++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) { cells.push(cur); cur = '' }
      else { cur += c }
    }
    cells.push(cur)
    const obj: Record<string, string> = {}
    header.forEach((h, k) => obj[h] = cells[k] ?? '')
    rows.push(obj)
  }
  return rows
}

function main() {
  const all = parseCsv('reports/fv-mislabel-candidates.csv')
  const tierA = all.filter(r => r.tier === 'A')
  const veganNamed: typeof tierA = []
  const otherNamed: typeof tierA = []
  for (const r of tierA) {
    if (VEGAN_NAME.test(r.name)) veganNamed.push(r)
    else otherNamed.push(r)
  }
  console.log(`Tier A total: ${tierA.length}`)
  console.log(`  Vegan-named (probably FALSE POSITIVE): ${veganNamed.length}`)
  console.log(`  Other names (likely REAL MISLABEL): ${otherNamed.length}`)

  console.log(`\n=== LIKELY REAL MISLABELS (${otherNamed.length}) — non-vegan-named with web hits ===`)
  otherNamed.sort((a, b) => parseInt(b.web_suspicion) - parseInt(a.web_suspicion))
  for (const r of otherNamed) {
    console.log(`  web=${r.web_suspicion} db=${r.db_score}  ${r.name}  |  ${r.city}, ${r.country}  |  ${r.top_hits}  |  ${r.website}`)
  }

  console.log(`\n=== VEGAN-NAMED (probably false positives, sells "vegan X" labelled as X) ===`)
  for (const r of veganNamed.slice(0, 20)) {
    console.log(`  ${r.name}  |  ${r.top_hits}  |  ${r.website}`)
  }

  // Save just the likely-real for review.
  const out = ['web_suspicion,db_score,id,slug,name,city,country,source,website,top_hits']
  for (const r of otherNamed) {
    const cells = [r.web_suspicion, r.db_score, r.id, r.slug, r.name, r.city, r.country, r.source, r.website, r.top_hits]
    out.push(cells.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  }
  writeFileSync('reports/likely-real-mislabels.csv', out.join('\n'))
  console.log(`\nFor review: reports/likely-real-mislabels.csv (${otherNamed.length} places)`)
}
main()
