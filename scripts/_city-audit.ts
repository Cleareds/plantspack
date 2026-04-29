// Per-city audit using the existing global website-scrape data.
// Outputs: per-city Tier A list (web-confirmed non-vegan items found).

import { readFileSync, writeFileSync } from 'fs'

const CITIES = ['London', 'Berlin', 'Barcelona', 'New York', 'Los Angeles']
const VEGAN_NAME = /\b(vegan|vegana|vegano|plant|plnt|herbi|veggie|veg[eé]tal|raw|govinda|krishna|fleischerei vegan|vegane fleischerei|planta|beyond|nooch|kale my name|aujourd|mildreds|loving hut|butcher.{0,5}vegan|meatless|fiction|reverie|vx |satdha|bodhi|vegreen|seed to sprout|mon epicerie|mon épicerie)\b/i

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
  const byCity = new Map<string, any[]>()
  for (const c of CITIES) byCity.set(c, [])
  for (const r of all) {
    if (CITIES.includes(r.city)) byCity.get(r.city)!.push(r)
  }

  const allFlagged: any[] = []
  for (const city of CITIES) {
    const rows = byCity.get(city)!
    const tierA = rows.filter(r => r.tier === 'A')
    const tierB = rows.filter(r => r.tier === 'B')
    const tierC = rows.filter(r => r.tier === 'C')
    const tierD = rows.filter(r => r.tier === 'D')
    const realA = tierA.filter(r => !VEGAN_NAME.test(r.name))
    console.log(`\n=== ${city} ===`)
    console.log(`  Tier A (web-confirmed mislabel): ${tierA.length}  -> non-vegan-named: ${realA.length}`)
    console.log(`  Tier B (medium):                  ${tierB.length}`)
    console.log(`  Tier C (web-clean, likely OK):    ${tierC.length}`)
    console.log(`  Tier D (no website):              ${tierD.length}`)
    if (realA.length) {
      console.log(`  --- likely real mislabels ---`)
      for (const r of realA) {
        console.log(`    web=${r.web_suspicion} db=${r.db_score}  ${r.name}  |  ${r.top_hits}  |  ${r.website}`)
        allFlagged.push({ ...r, _city: city })
      }
    }
  }

  // Write CSV with all city flags.
  const out = ['city,web_suspicion,db_score,id,name,country,source,website,top_hits']
  for (const r of allFlagged) {
    const cells = [r._city, r.web_suspicion, r.db_score, r.id, r.name, r.country, r.source, r.website, r.top_hits]
    out.push(cells.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  }
  writeFileSync('reports/city-audit-mislabels.csv', out.join('\n'))
  console.log(`\nFull list: reports/city-audit-mislabels.csv  (${allFlagged.length} rows)`)
}
main()
