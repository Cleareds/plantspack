// Cross-reference Step #1 (DB signal score) with Step #2 (website-scrape hits)
// to surface the highest-confidence mislabel candidates.
//
// A place that scores HIGH on both signals is very likely mislabelled. A place
// that scores HIGH on DB signals alone might just be data-thin. A place that
// scores HIGH on website signals alone is the most actionable - we can SEE
// non-vegan items on their own homepage.

import { readFileSync, writeFileSync, existsSync } from 'fs'

type DbRow = { score: number, id: string, slug: string, name: string, city: string, country: string, source: string, website: string, reasons: string }
type WebRow = { id: string, name: string, city: string, country: string, url: string, fetched: boolean, totalHits?: number, uniqueHits?: number, suspicion?: number, hasMenu?: boolean, topHits?: string }

function parseCsv(path: string): Record<string, string>[] {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    // simple quoted CSV split
    const cells: string[] = []
    let cur = '', inQ = false
    for (let j = 0; j < lines[i].length; j++) {
      const c = lines[i][j]
      if (c === '"') {
        if (inQ && lines[i][j + 1] === '"') { cur += '"'; j++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        cells.push(cur); cur = ''
      } else { cur += c }
    }
    cells.push(cur)
    const obj: Record<string, string> = {}
    header.forEach((h, k) => obj[h] = cells[k] ?? '')
    rows.push(obj)
  }
  return rows
}

function main() {
  // Load DB signal scores from Step #1.
  const dbPath = 'reports/fully-vegan-suspicion.csv'
  if (!existsSync(dbPath)) { console.error(`Missing ${dbPath}. Run _audit-fully-vegan-signals.ts first.`); process.exit(1) }
  const dbRows = parseCsv(dbPath)
  const dbById = new Map<string, DbRow>()
  for (const r of dbRows) {
    dbById.set(r.id, {
      score: parseInt(r.score) || 0,
      id: r.id, slug: r.slug, name: r.name, city: r.city, country: r.country,
      source: r.source, website: r.website, reasons: r.reasons,
    })
  }

  // Load website scrape results from Step #2.
  const webPath = 'reports/fv-website-flags.jsonl'
  if (!existsSync(webPath)) { console.error(`Missing ${webPath}. Run _scrape-fv-websites.ts first.`); process.exit(1) }
  const webRows: WebRow[] = readFileSync(webPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  const webById = new Map<string, WebRow>()
  for (const r of webRows) webById.set(r.id, r)

  console.log(`DB signals: ${dbRows.length} rows`)
  console.log(`Website scrape results: ${webRows.length} rows (${webRows.filter(r => r.fetched).length} fetched OK)`)

  // Build combined view.
  type Combined = DbRow & { webSusp: number, topHits: string, fetched: boolean }
  const combined: Combined[] = []
  for (const db of dbById.values()) {
    const w = webById.get(db.id)
    combined.push({
      ...db,
      webSusp: w?.suspicion ?? -1,  // -1 = not scraped
      topHits: w?.topHits ?? '',
      fetched: !!w?.fetched,
    })
  }

  // Buckets:
  // Tier A: web scrape found explicit non-vegan ingredients (webSusp >= 3). High confidence.
  // Tier B: webSusp 2 OR (webSusp >=1 AND db score >= 6). Medium confidence.
  // Tier C: high db score but no web confirmation. Worth checking but lower confidence.
  // Tier D: no website + high db score. Need WebSearch path.
  const tierA: Combined[] = []
  const tierB: Combined[] = []
  const tierC: Combined[] = []
  const tierD: Combined[] = []
  for (const r of combined) {
    if (r.webSusp >= 3) tierA.push(r)
    else if (r.webSusp >= 2 || (r.webSusp >= 1 && r.score >= 6)) tierB.push(r)
    else if (r.score >= 8 && r.fetched) tierC.push(r)
    else if (r.score >= 8 && !r.website) tierD.push(r)
  }
  // Sort each bucket by combined evidence.
  const sortKey = (r: Combined) => (r.webSusp * 10) + r.score
  tierA.sort((a, b) => sortKey(b) - sortKey(a))
  tierB.sort((a, b) => sortKey(b) - sortKey(a))
  tierC.sort((a, b) => b.score - a.score)
  tierD.sort((a, b) => b.score - a.score)

  console.log(`\n=== TIER A (web shows non-vegan items, high confidence): ${tierA.length} places ===`)
  for (const r of tierA.slice(0, 50)) {
    console.log(`  web=${r.webSusp} db=${r.score}  ${r.name}  |  ${r.city}, ${r.country}  |  ${r.topHits}  |  ${r.website}`)
  }
  if (tierA.length > 50) console.log(`  ... and ${tierA.length - 50} more in CSV`)

  console.log(`\n=== TIER B (medium evidence): ${tierB.length} places ===`)
  for (const r of tierB.slice(0, 30)) {
    console.log(`  web=${r.webSusp} db=${r.score}  ${r.name}  |  ${r.city}, ${r.country}  |  ${r.topHits}`)
  }
  if (tierB.length > 30) console.log(`  ... and ${tierB.length - 30} more in CSV`)

  console.log(`\n=== TIER C (high DB score, web fetched but clean): ${tierC.length} places ===`)
  console.log(`  (likely real fully vegan; suspicious by data-thinness only)`)

  console.log(`\n=== TIER D (high DB score, no website to scrape): ${tierD.length} places ===`)
  console.log(`  (would need WebSearch path - has cost implications)`)

  // Write tiered CSV.
  const out = ['tier,web_suspicion,db_score,id,slug,name,city,country,source,website,top_hits,db_reasons']
  const tag = (rows: Combined[], t: string) => rows.forEach(r => {
    const cells = [t, r.webSusp, r.score, r.id, r.slug, r.name, r.city, r.country, r.source, r.website, r.topHits, r.reasons]
    out.push(cells.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  })
  tag(tierA, 'A')
  tag(tierB, 'B')
  tag(tierC, 'C')
  tag(tierD, 'D')
  writeFileSync('reports/fv-mislabel-candidates.csv', out.join('\n'))
  console.log(`\nFull tiered CSV: reports/fv-mislabel-candidates.csv`)
}
main()
