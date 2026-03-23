const { config } = require('dotenv');
config({ path: '.env.local' });
const fs = require('fs');

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const isoCountries = [
  ['Belgium', 'BE'], ['Netherlands', 'NL'], ['Austria', 'AT'], ['Czech Republic', 'CZ'],
  ['Denmark', 'DK'], ['Ireland', 'IE'], ['Luxembourg', 'LU'], ['Latvia', 'LV'],
  ['Sweden', 'SE'], ['Poland', 'PL'], ['Hungary', 'HU'], ['Croatia', 'HR'],
  ['Slovakia', 'SK'], ['Slovenia', 'SI'], ['Romania', 'RO'], ['Bulgaria', 'BG'],
  ['Greece', 'GR'], ['Finland', 'FI'], ['Norway', 'NO'], ['Switzerland', 'CH'],
  ['Ukraine', 'UA'], ['Portugal', 'PT'], ['Estonia', 'EE'], ['Lithuania', 'LT'],
];

const bboxCountries = [
  ['Germany South', '47.2,5.8,51.5,15.1', 'Germany'],
  ['Germany North', '51.5,5.8,55.1,15.1', 'Germany'],
  ['France South', '42.3,-5.2,46.0,8.3', 'France'],
  ['France North', '46.0,-5.2,51.1,8.3', 'France'],
  ['UK South', '49.9,-8.2,53.5,2.0', 'United Kingdom'],
  ['UK North', '53.5,-8.2,61.0,2.0', 'United Kingdom'],
  ['Italy South', '36.6,6.6,42.5,18.6', 'Italy'],
  ['Italy North', '42.5,6.6,47.1,18.6', 'Italy'],
  ['Spain South', '36.0,-9.3,40.0,4.4', 'Spain'],
  ['Spain North', '40.0,-9.3,43.8,4.4', 'Spain'],
];

async function overpassQuery(q, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(OVERPASS, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (r.ok) {
        const d = await r.json();
        return d.elements || [];
      }
      console.log(`  ⚠️ ${label}: HTTP ${r.status}, attempt ${attempt + 1}/3`);
      await sleep(30000);
    } catch(e) {
      console.log(`  ❌ ${label}: ${e.message}, attempt ${attempt + 1}/3`);
      await sleep(15000);
    }
  }
  return [];
}

function mapCat(tags) {
  const s = tags.shop || '', t = tags.tourism || '';
  if (['supermarket','convenience','health_food','organic','grocery','bakery','deli','greengrocer'].includes(s)) return 'store';
  if (['hotel','hostel','guest_house'].includes(t)) return 'hotel';
  if (s) return 'store';
  return 'eat';
}

function processElements(elements, countryName) {
  return elements.filter(e => e.tags && e.tags.name && (e.lat || (e.center && e.center.lat))).map(e => {
    const t = e.tags;
    const addr = [[t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), t['addr:city'] || t['addr:town'] || t['addr:village'], t['addr:postcode'], countryName].filter(Boolean).join(', ');
    return {
      name: t.name,
      description: [t.description, t.cuisine ? 'Cuisine: ' + t.cuisine.replace(/;/g, ', ') : null].filter(Boolean).join('. ') || null,
      category: mapCat(t),
      address: addr,
      latitude: e.lat || e.center.lat,
      longitude: e.lon || e.center.lon,
      city: t['addr:city'] || t['addr:town'] || t['addr:village'] || null,
      country: countryName,
      website: t.website || t['contact:website'] || null,
      phone: t.phone || t['contact:phone'] || null,
      is_pet_friendly: t.dog === 'yes' || t.pets === 'yes',
      images: [],
      tags: ['vegan', ...(t.cuisine ? t.cuisine.split(';').map(c => c.trim().toLowerCase()) : [])],
      source: 'openstreetmap',
      source_id: 'osm:' + e.type + '/' + e.id,
      opening_hours: t.opening_hours || null,
      cuisine_types: t.cuisine ? t.cuisine.split(';').map(c => c.trim()) : [],
      vegan_level: t['diet:vegan'] === 'only' ? 'fully_vegan' : 'vegan_friendly',
    };
  });
}

async function main() {
  console.log('🌿 Full European Vegan Places Import');
  console.log('=====================================\n');

  const all = [];

  // ISO countries
  for (let i = 0; i < isoCountries.length; i++) {
    const [name, iso] = isoCountries[i];
    process.stdout.write(`${name}... `);
    const q = `[out:json][timeout:180];area["ISO3166-1"="${iso}"]->.a;(node["diet:vegan"~"yes|only"](area.a);way["diet:vegan"~"yes|only"](area.a););out body center;`;
    const els = await overpassQuery(q, name);
    const places = processElements(els, name);
    all.push(...places);
    console.log(`${places.length} places`);
    if (i < isoCountries.length - 1) await sleep(15000);
  }

  // Bbox countries
  for (let i = 0; i < bboxCountries.length; i++) {
    const [label, bbox, country] = bboxCountries[i];
    process.stdout.write(`${label}... `);
    const q = `[out:json][timeout:180];(node["diet:vegan"~"yes|only"](${bbox});way["diet:vegan"~"yes|only"](${bbox}););out body center;`;
    const els = await overpassQuery(q, label);
    const places = processElements(els, country);
    all.push(...places);
    console.log(`${places.length} places`);
    if (i < bboxCountries.length - 1) await sleep(15000);
  }

  // Dedupe
  const seen = new Set();
  const deduped = all.filter(p => { if (seen.has(p.source_id)) return false; seen.add(p.source_id); return true; });
  deduped.sort((a, b) => a.country.localeCompare(b.country) || (a.city || '').localeCompare(b.city || '') || a.name.localeCompare(b.name));

  console.log(`\n📊 Total: ${deduped.length} unique places`);
  const byCountry = {};
  deduped.forEach(p => { byCountry[p.country] = (byCountry[p.country] || 0) + 1; });
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  const fullyVegan = deduped.filter(p => p.vegan_level === 'fully_vegan').length;
  const withWeb = deduped.filter(p => p.website).length;
  const withCity = deduped.filter(p => p.city).length;
  console.log(`\n  Fully vegan: ${fullyVegan} (${(fullyVegan/deduped.length*100).toFixed(1)}%)`);
  console.log(`  With website: ${withWeb} (${(withWeb/deduped.length*100).toFixed(1)}%)`);
  console.log(`  With city: ${withCity} (${(withCity/deduped.length*100).toFixed(1)}%)`);

  fs.writeFileSync('scripts/osm-europe-vegan-places.json', JSON.stringify({ metadata: { generatedAt: new Date().toISOString(), totalPlaces: deduped.length }, places: deduped }, null, 2));
  console.log(`\n✅ Written to scripts/osm-europe-vegan-places.json (${(fs.statSync('scripts/osm-europe-vegan-places.json').size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
