// Builds data.json for the country slideshow template.
// Usage (from the web repo root):
//   node docs/marketing/tiktok-templates/country-slides/build-data.mjs "Belgium" BE [adminLevel=6] [extraRegionISO=BE-BRU]
// Numbers follow the platform rules: live rows only (archived_at IS NULL) and
// "confirmed fully vegan" = vegan_level='fully_vegan' AND is_verified=true.
// Province polygons come from Overpass (cached next to data.json); places are
// assigned by point-in-polygon. Edit data.json by hand afterwards for the
// "unique" slide (pick from unique_candidates) and the ask copy.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv'; config({ path: '.env.local', quiet: true });

const [country, iso2, adminLevelArg, extraIso] = process.argv.slice(2);
if (!country || !iso2) { console.error('usage: build-data.mjs "<Country>" <ISO2> [adminLevel] [extraRegionISO3166-2]'); process.exit(1); }
const adminLevel = adminLevelArg || '6';
const dir = `docs/marketing/tiktok-templates/country-slides/${country.toLowerCase().replace(/\s+/g, '-')}`;
mkdirSync(dir, { recursive: true });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const UA = 'PlantsPackSlides/1.0 (https://www.plantspack.com; anton@plantspack.com)';

// ---- places (cursor-paginated: PostgREST caps reads at 1000 rows)
const places = []; let after = null;
while (true) {
  let q = sb.from('places').select('id,name,slug,city,category,subcategory,vegan_level,verification_level,is_verified,main_image_url,latitude,longitude,description,website').eq('country', country).is('archived_at', null).order('id').limit(1000);
  if (after) q = q.gt('id', after);
  const { data, error } = await q; if (error) throw error;
  places.push(...data); if (data.length < 1000) break; after = data[data.length - 1].id;
}

// ---- provinces from Overpass (cached)
async function overpass(query, file) {
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query) });
  const txt = await res.text(); if (!res.ok || !txt.startsWith('{')) throw new Error('overpass: ' + txt.slice(0, 200));
  writeFileSync(file, txt); return JSON.parse(txt);
}
const provOsm = await overpass(`[out:json][timeout:120];area["ISO3166-1"="${iso2}"]["admin_level"="2"]->.c;relation(area.c)["admin_level"="${adminLevel}"]["boundary"="administrative"];out geom;`, `${dir}/overpass-provinces.json`);
const extraOsm = extraIso ? await overpass(`[out:json][timeout:120];relation["boundary"="administrative"]["ISO3166-2"="${extraIso}"];out geom;`, `${dir}/overpass-extra.json`) : { elements: [] };

function rings(rel) {
  const segs = rel.members.filter(m => m.type === 'way' && m.role === 'outer' && m.geometry).map(m => m.geometry.map(p => [p.lon, p.lat]));
  const out = []; const eq = (p, q) => Math.abs(p[0] - q[0]) < 1e-7 && Math.abs(p[1] - q[1]) < 1e-7;
  while (segs.length) {
    let ring = segs.shift(); let grew = true;
    while (grew) { grew = false; for (let i = 0; i < segs.length; i++) { const s = segs[i], a = ring[0], b = ring[ring.length - 1];
      if (eq(b, s[0])) { ring = ring.concat(s.slice(1)); segs.splice(i, 1); grew = true; break; }
      if (eq(b, s[s.length - 1])) { ring = ring.concat(s.slice(0, -1).reverse()); segs.splice(i, 1); grew = true; break; }
      if (eq(a, s[s.length - 1])) { ring = s.slice(0, -1).concat(ring); segs.splice(i, 1); grew = true; break; }
      if (eq(a, s[0])) { ring = s.slice(1).reverse().concat(ring); segs.splice(i, 1); grew = true; break; } } }
    out.push(ring);
  }
  return out;
}
const inRing = (pt, r) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const name = r => r.tags['name:en'] || r.tags.name;
// Extra region (e.g. a capital region that is a hole in a province) is tested first.
const provs = [...extraOsm.elements.map(r => ({ name: name(r), rings: rings(r) })), ...provOsm.elements.map(r => ({ name: name(r), rings: rings(r) }))];
const provinceOf = p => { if (!p.latitude || !p.longitude) return 'unknown'; const pt = [p.longitude, p.latitude]; for (const pr of provs) if (pr.rings.some(r => inRing(pt, r))) return pr.name; return 'unknown'; };

// ---- aggregates
const prev = existsSync(`${dir}/data.json`) ? JSON.parse(readFileSync(`${dir}/data.json`, 'utf8')) : {};
const confirmed = p => p.vegan_level === 'fully_vegan' && p.is_verified;
const labelled = p => p.vegan_level === 'fully_vegan';
const byRegion = {}; for (const p of places) { const k = provinceOf(p); const r = byRegion[k] || (byRegion[k] = { name: k, places: 0, confirmed_fully_vegan: 0, fully_vegan: 0 }); r.places++; if (confirmed(p)) r.confirmed_fully_vegan++; if (labelled(p)) r.fully_vegan++; }
const simplify = ring => ring.filter((_, i) => i % 12 === 0 || i === ring.length - 1);
const regions = provs.map(pr => ({ name: pr.name, ...(byRegion[pr.name] || { places: 0, confirmed_fully_vegan: 0, fully_vegan: 0 }), rings: pr.rings.map(simplify) })).sort((a, b) => a.places - b.places);
const byCity = {}; for (const p of places) { const c = byCity[p.city] || (byCity[p.city] = { city: p.city, places: 0, confirmed_fully_vegan: 0, fully_vegan: 0 }); c.places++; if (confirmed(p)) c.confirmed_fully_vegan++; if (labelled(p)) c.fully_vegan++; }
// fv_mode 'label' = vegan_level='fully_vegan' (what the map/hub pages and the video scripts count);
// 'confirmed' = label AND is_verified=true (stricter; use for anything that says "verified").
const fv_mode = prev.fv_mode || 'label';
const key = fv_mode === 'confirmed' ? 'confirmed_fully_vegan' : 'fully_vegan';
const topCities = Object.values(byCity).sort((a, b) => b[key] - a[key] || b.places - a.places).slice(0, 6);
const levels = { fully_vegan: places.filter(labelled).length, confirmed_fully_vegan: places.filter(confirmed).length, mostly_vegan: 0, vegan_friendly: 0, vegan_options: 0, still_checking: 0 };
for (const p of places) { if (fv_mode === 'confirmed' ? confirmed(p) : labelled(p)) continue; if (p.vegan_level === 'mostly_vegan') levels.mostly_vegan++; else if (p.vegan_level === 'vegan_friendly') levels.vegan_friendly++; else if (p.vegan_level === 'vegan_options') levels.vegan_options++; else levels.still_checking++; }
const cats = {}; for (const p of places) cats[p.category] = (cats[p.category] || 0) + 1;
const subCount = {}; for (const p of places) if (p.subcategory) subCount[p.subcategory] = (subCount[p.subcategory] || 0) + 1;
const unique_candidates = places.filter(p => p.main_image_url && (p.category !== 'eat' || (p.subcategory && subCount[p.subcategory] <= 5)) && (confirmed(p) || p.category === 'organisation'))
  .map(p => ({ name: p.name, slug: p.slug, city: p.city, kind: `${p.category}/${p.subcategory || ''}`, image: p.main_image_url, note: (p.description || '').slice(0, 120) }));

const data = {
  country, iso2, generated: new Date().toISOString().slice(0, 10), fv_mode,
  handle: prev.handle || 'plantspack', link: prev.link || 'plantspack.com',
  totals: { places: places.length, cities: Object.keys(byCity).length, with_photo: places.filter(p => p.main_image_url).length, shops: cats.store || 0, stays: cats.hotel || 0, organisations: cats.organisation || 0 },
  levels, topCities, regions,
  ask_regions: prev.ask_regions || regions.filter(r => r.name !== 'unknown').slice(0, 4).map(r => r.name),
  unique: prev.unique || [],            // hand-picked: [{ name, city, line, image, slug }]
  cover_line: prev.cover_line || 'What our map shows, and what it still misses',
  ask_line: prev.ask_line || 'Know a vegan place here? Tell us in the comments.',
  unique_candidates,
};
writeFileSync(`${dir}/data.json`, JSON.stringify(data, null, 2));
console.log(`${dir}/data.json`, JSON.stringify({ totals: data.totals, levels, fv_mode, topCities: topCities.map(c => `${c.city} ${c[key]}/${c.places}`), regions: regions.map(r => `${r.name} ${r.places}`), unique_candidates: unique_candidates.length }, null, 1));
