#!/usr/bin/env node
// Estimate how many city x dish pages NEW dish keywords (or new needles for
// existing dishes) would unlock. Approximates the dish-match gate: a name or
// cuisine_types or subcategory hit already clears the general gate (>=4), so
// we count places with any such hit per (country, city) and report cities
// with >=3 (the sitemap/noindex density gate). Read-only.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Candidates: [slug, needles[], note]. Needles lower-case; matched as substrings
// (same as dish-match for non-strict needles) against name + cuisine_types + subcategory.
const CANDIDATES = [
  ['crepe', ['crepe', 'crêpe', 'creperie', 'crêperie', 'galette'], 'new'],
  ['schnitzel', ['schnitzel'], 'new'],
  ['currywurst', ['currywurst', 'curry wurst'], 'new'],
  ['shawarma', ['shawarma', 'schawarma', 'shoarma', 'chawarma'], 'new'],
  ['doner', ['döner', 'doner', 'dönner', 'dürüm', 'durum'], 'new or kebab needles'],
  ['tofu', ['tofu'], 'new'],
  ['cookie', ['cookie', 'cookies', 'biscuit'], 'new'],
  ['cupcake', ['cupcake', 'muffin'], 'new'],
  ['tiramisu', ['tiramisu'], 'new'],
  ['juice', ['juice', 'juicery', 'saftbar', 'jus ', 'zumo', 'sucos', 'suco'], 'new'],
  ['tea', ['teahouse', 'tea house', 'tea room', 'tearoom', 'teehaus', 'salon de thé', 'chai'], 'new'],
  ['wine-bar', ['wine bar', 'weinbar', 'vinoteca', 'enoteca', 'bar à vin', 'winebar'], 'new'],
  ['brewery', ['brewery', 'brauerei', 'brewpub', 'taproom', 'cervejaria', 'birrificio'], 'new'],
  ['cocktail-bar', ['cocktail'], 'new'],
  ['grocery', ['grocery', 'supermarket', 'supermarkt', 'bio-markt', 'biomarkt', 'épicerie', 'epicerie', 'mercado', 'market', 'bioladen', 'unverpackt', 'zero waste', 'health food'], 'new (store)'],
  ['hot-pot', ['hot pot', 'hotpot'], 'new'],
  ['nachos', ['nachos', 'quesadilla'], 'new'],
  ['empanada', ['empanada'], 'new'],
  ['poke', ['poke', 'poké'], 'new'],
  ['bibimbap', ['bibimbap'], 'new'],
  ['seitan', ['seitan', 'tempeh', 'jackfruit'], 'new'],
  ['buffet', ['buffet'], 'new'],
  ['food-truck', ['food truck', 'foodtruck', 'imbiss', 'street food', 'streetfood'], 'new'],
  ['hotel', ['hotel', 'hostel', 'guesthouse', 'b&b', 'bed and breakfast', 'pension', 'resort'], 'new (hotel)'],
  // extra needles for existing dishes (German/French/Spanish/Italian/Dutch)
  ['pancake+', ['pfannkuchen', 'palatschinken', 'pannenkoek', 'pannkak', 'pandekag', 'crêpe', 'crepe'], 'needles -> pancake'],
  ['ice-cream+', ['eiscafe', 'eiscafé', 'eisdiele', ' eis', 'eismanufaktur', 'helado', 'heladería', 'heladeria', 'glace', 'glacier', 'ijs', 'sorvete'], 'needles -> ice-cream'],
  ['coffee+', ['kaffee', 'café', 'cafe', 'caffè', 'koffie', 'kaffe', 'espresso', 'rösterei', 'roastery', 'roasters'], 'needles -> coffee'],
  ['noodles+', ['nudel', 'nudeln', 'nouilles', 'fideos', 'noedels'], 'needles -> noodles'],
  ['breakfast+', ['frühstück', 'fruehstueck', 'petit déjeuner', 'desayuno', 'ontbijt', 'frukost', 'morgenmad'], 'needles -> breakfast'],
  ['sandwich+', ['belegte', 'bocadillo', 'panini', 'broodje', 'smørrebrød', 'tramezzini'], 'needles -> sandwich'],
  ['soup+', ['suppe', 'soupe', 'sopa', 'soep', 'soppa', 'zuppa'], 'needles -> soup'],
  ['salad+', ['salat', 'salade', 'ensalada', 'insalata'], 'needles -> salad'],
]
const norm = s => (s || '').toLowerCase()
const places = []
let lastId = null
for (;;) {
  let q = sb.from('places').select('id, name, city, country, cuisine_types, subcategory, category').is('archived_at', null).order('id').limit(1000)
  if (lastId) q = q.gt('id', lastId)
  const { data, error } = await q
  if (error) throw error
  places.push(...data)
  if (data.length < 1000) break
  lastId = data[data.length - 1].id
}
console.log(`live places scanned: ${places.length}`)
const rows = []
for (const [slug, needles, note] of CANDIDATES) {
  const perCity = new Map()
  let hits = 0
  for (const p of places) {
    const hay = norm(p.name) + ' | ' + norm((p.cuisine_types || []).join(' ')) + ' | ' + norm(p.subcategory)
    if (!needles.some(n => hay.includes(n))) continue
    hits++
    const k = `${p.country} / ${p.city}`
    perCity.set(k, (perCity.get(k) || 0) + 1)
  }
  const cities = [...perCity.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
  rows.push({ slug, note, hits, cities: cities.length, top: cities.slice(0, 4).map(([k, n]) => `${k} (${n})`).join('; ') })
}
rows.sort((a, b) => b.cities - a.cities)
console.log('\nslug'.padEnd(15) + 'places'.padStart(7) + '  cities>=3  top cities')
for (const r of rows) console.log(r.slug.padEnd(15) + String(r.hits).padStart(7) + String(r.cities).padStart(10) + '   ' + r.top + '   [' + r.note + ']')
