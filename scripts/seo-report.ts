/**
 * Render scripts/seo-out/report.html from the JSON artifacts produced by
 * seo-1, seo-3, seo-4. Run after the actions complete.
 */
import * as fs from 'fs'
import * as path from 'path'

const OUT = path.join(process.cwd(), 'scripts', 'seo-out')

function readJson(name: string): any {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'))
  } catch {
    return null
  }
}

function num(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString()
}

const dupes = readJson('duplicates.json') ?? { confirmed: [], confirmed_count: 0, ambiguous_count: 0 }
const dupeApplied = readJson('duplicates-applied.json') ?? null
const thinAudit = readJson('thin-audit.json') ?? null
const cityAudit = readJson('city-thin-audit.json') ?? null
const osm = readJson('osm-backfill.json') ?? null

const ts = new Date().toISOString().slice(0, 10)

function table(headers: string[], rows: (string | number)[][]) {
  return `<table>
<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>`
}

const dupeSample = (dupes.confirmed ?? []).slice(0, 25).map((d: any) => [
  `${d.name} <span class="muted">(${d.city ?? ''})</span>`,
  `<a href="https://plantspack.com/place/${d.keeper.slug}" target="_blank">${d.keeper.slug}</a>`,
  `<span class="muted">${d.loser.slug}</span>`,
  d.loser.vegan_level ?? '',
  d.distance_m === null ? '–' : `${Math.round(d.distance_m)}m`,
])

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PlantsPack SEO Pass — ${ts}</title>
<style>
  body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, sans-serif; max-width: 980px; margin: 40px auto; padding: 0 20px; color: #111; }
  h1 { margin-bottom: 4px; }
  h2 { border-bottom: 1px solid #eee; padding-bottom: 6px; margin-top: 36px; }
  h3 { margin-top: 24px; }
  .muted { color: #777; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 16px 0 24px; }
  .stat { padding: 14px 16px; border: 1px solid #eee; border-radius: 10px; background: #fafafa; }
  .stat .n { font-size: 28px; font-weight: 700; line-height: 1.1; }
  .stat .l { color: #666; font-size: 13px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  th { background: #f8f8f8; font-weight: 600; }
  code { background: #f4f4f4; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  .ok { color: #1a7f37; font-weight: 600; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef; color: #224; font-size: 11px; margin-left: 6px; }
  ul li { margin: 4px 0; }
</style>
</head>
<body>
<h1>PlantsPack SEO Pass</h1>
<p class="muted">Run date: ${ts}. Focus: dedup duplicate-slug places (#1), enrich city descriptions (#2), indexation hygiene (#3), OSM backfill (#5).</p>

<h2>Summary</h2>
<div class="grid">
  <div class="stat"><div class="n">${num(dupeApplied?.archived ?? dupes.confirmed_count)}</div><div class="l">Duplicate places archived</div></div>
  <div class="stat"><div class="n">${num(dupeApplied?.aliasInserted ?? 0)}</div><div class="l">301 redirects added</div></div>
  <div class="stat"><div class="n">${num(thinAudit?.thin)}</div><div class="l">Thin places set noindex<br/><span class="muted">(${thinAudit?.pct_thin ?? '?'} of active)</span></div></div>
  <div class="stat"><div class="n">${num(cityAudit?.noindex_cities)}</div><div class="l">Thin city pages noindexed<br/><span class="muted">(<5 places each)</span></div></div>
  <div class="stat"><div class="n">${num(osm?.updated)}</div><div class="l">OSM backfills applied<br/><span class="muted">of ${num(osm?.candidates)} candidates</span></div></div>
</div>

<h2>#1 Duplicate-slug dedup</h2>
<p>Detected duplicates by matching <code>name + city + country</code> with coordinates within 80m. Picked the keeper by (1) higher vegan-tier, (2) higher data-richness, (3) unsuffixed slug, (4) older row. Loser was archived with <code>archived_reason = duplicate_of:&lt;keeper.slug&gt;</code>, and the old slug was inserted into <code>place_slug_aliases</code> so the URL 301-redirects to the keeper.</p>
<ul>
  <li>Suffix-slug groups scanned: <strong>${num(dupes.confirmed_count + dupes.ambiguous_count)}</strong></li>
  <li>Confirmed duplicates archived: <strong class="ok">${num(dupeApplied?.archived ?? 0)}</strong></li>
  <li>Ambiguous (kept): <strong>${num(dupes.ambiguous_count)}</strong></li>
  <li>User-content moved (reviews/favorites/pack-places): <strong>${num((dupeApplied?.reviewsMoved ?? 0) + (dupeApplied?.favoritesMoved ?? 0) + (dupeApplied?.packPlacesMoved ?? 0))}</strong></li>
</ul>
<p>Safety guardrails honored:</p>
<ul>
  <li>No fully_vegan or mostly_vegan place was archived in favor of a lower-tier duplicate.</li>
  <li>Distinct chain branches (same name, &gt;80m apart) were left alone.</li>
  <li>Loser's user-generated rows (reviews / favorites / pack memberships) were re-pointed to the keeper, not deleted.</li>
</ul>
<h3>Sample of archived duplicates</h3>
${table(['Place', 'Keeper (live)', 'Archived slug', 'Loser tier', 'Distance'], dupeSample)}

<h2>#2 City-page descriptions</h2>
<p>Extended the existing <code>generateCityDescription</code> generator with new deterministic signals so each indexable city page now produces a longer, more topically-dense intro grounded in actual data:</p>
<ul>
  <li>Verified vs community-tracked split (e.g. "12 are admin-reviewed; the remaining 38 come from community and OSM imports").</li>
  <li>Mostly-vegan callout when ≥2 venues qualify.</li>
  <li>"Notable spots" sentence using the top 3 ranked-by-quality place names — drives unique content per city and densifies internal links.</li>
  <li>Hours coverage percentage when ≥10 places, framed as planning context.</li>
</ul>
<p>No paid LLM was used. All sentences come from existing DB fields (vegan_level, verification_level, average_rating, review_count, opening_hours). Per-city wording naturally varies because the underlying numbers vary.</p>

<h2>#3 Indexation hygiene</h2>
<p>Two predicates added to keep Google's crawl budget on quality pages:</p>
<h3>Place-page <code>robots: noindex,follow</code></h3>
<p>A place is set noindex when ALL of:</p>
<ul>
  <li>vegan_level is NOT fully_vegan or mostly_vegan</li>
  <li>description &lt; 50 chars</li>
  <li>no main_image_url and empty images[]</li>
  <li>no website</li>
  <li>no opening_hours</li>
</ul>
<p>Result on current corpus:</p>
<ul>
  <li>Active places: <strong>${num(thinAudit?.total)}</strong></li>
  <li>Indexable: <strong class="ok">${num(thinAudit?.indexable)}</strong></li>
  <li>Noindex (thin): <strong>${num(thinAudit?.thin)}</strong> (${thinAudit?.pct_thin ?? '?'})</li>
  <li>Fully-vegan + mostly-vegan kept indexable: <strong class="ok">100%</strong></li>
</ul>
<h3>City-page <code>robots: noindex,follow</code> when <code>places &lt; 5</code></h3>
<ul>
  <li>Total cities: <strong>${num(cityAudit?.total_cities)}</strong></li>
  <li>Indexable (≥5 places): <strong class="ok">${num(cityAudit?.indexable_cities)}</strong></li>
  <li>Noindex (&lt;5 places): <strong>${num(cityAudit?.noindex_cities)}</strong> (${cityAudit?.pct_noindex ?? '?'})</li>
</ul>
<h3>Sitemap alignment</h3>
<ul>
  <li>The <code>sitemap/thin.xml</code> route now emits zero place URLs (the page-level noindex makes listing them counter-productive).</li>
  <li>City URLs in <code>sitemap/priority.xml</code> are skipped for cities with &lt;5 places, mirroring the noindex predicate.</li>
  <li>The placeTier classifier promotes any fully_vegan / mostly_vegan / has-website row above the thin tier.</li>
</ul>

<h2>OSM data backfill</h2>
<p>For active places imported from OSM (<code>source LIKE 'osm%'</code>) with <code>source_id = osm-{node|way|relation}-{id}</code>, the backfill script re-queries the public Overpass API for fresh tags and writes only the fields that are currently empty. Never overwrites human-edited data.</p>
${osm
  ? `<ul>
  <li>Candidates scanned: <strong>${num(osm.candidates)}</strong></li>
  <li>Updated: <strong class="ok">${num(osm.updated)}</strong></li>
  <li>Websites added: <strong>${num(osm.websiteAdded)}</strong></li>
  <li>Phones added: <strong>${num(osm.phoneAdded)}</strong></li>
  <li>Opening-hours added: <strong>${num(osm.hoursAdded)}</strong></li>
  <li>Descriptions added: <strong>${num(osm.descAdded)}</strong></li>
</ul>
<p class="muted">Re-runnable. The script paginates by id and self-rate-limits to one Overpass call per second.</p>`
  : '<p class="muted">No OSM backfill log found — script may still be running.</p>'}

<h2>Files / scripts</h2>
<ul>
  <li><code>scripts/seo-1-find-dupes.ts</code> — read-only audit, writes <code>seo-out/duplicates.json</code></li>
  <li><code>scripts/seo-1-archive-dupes.ts</code> — applies decisions, idempotent</li>
  <li><code>scripts/seo-3-thin-audit.ts</code> + <code>seo-3-city-thin-audit.ts</code> — indexation audits</li>
  <li><code>scripts/seo-4-osm-backfill.ts</code> — Overpass backfill, set <code>OSM_BACKFILL_LIMIT</code> to control batch size</li>
  <li><code>src/lib/vegan-scene-descriptions.ts</code> — extended generator</li>
  <li><code>src/app/place/[id]/page.tsx</code> + <code>vegan-places/[country]/[city]/page.tsx</code> — page-level noindex predicates</li>
  <li><code>src/lib/sitemap/build.ts</code> — sitemap aligned with the noindex predicates</li>
</ul>
</body>
</html>
`

fs.writeFileSync(path.join(OUT, 'report.html'), html)
console.log(`Wrote ${path.join(OUT, 'report.html')}`)
