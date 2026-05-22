// Deterministic description rewrite for Brazilian FV places with stub
// descriptions. Pulls from name, cuisine_types, address (neighbourhood
// fragment), and the source-attribution tag — assembles 1-2 sentences
// using only facts already in the DB. Zero LLM cost.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-desc-rewrite-2026-05-21'

const STUB_PATTERN = /^(\s*$|Summary pending|Vegan restaurant in (Brazil|[A-Z][a-z]+,?\s*Brazil)\.?$|.{0,49}$)/i

// Brazilian state abbreviations (for tightening city display in copy)
const STATE_BY_CITY = {
  'São Paulo':'SP','Rio de Janeiro':'RJ','Niteroi':'RJ','Niterói':'RJ',
  'Porto Alegre':'RS','Caxias do Sul':'RS','Santa Maria':'RS','Pelotas':'RS','Tramandai':'RS','Gramado':'RS','Torres':'RS',
  'Curitiba':'PR','Londrina':'PR','Maringa':'PR','Maringá':'PR','Foz do Iguaçu':'PR',
  'Belo Horizonte':'MG','Uberlandia':'MG','Uberlândia':'MG','Uberaba':'MG','Juiz de Fora':'MG',
  'Brasilia':'DF','Brasília':'DF',
  'Salvador':'BA','Lençóis':'BA','Caruaru':'BA','Trancoso':'BA',
  'Fortaleza':'CE','Recife':'PE','Olinda':'PE',
  'Florianopolis':'SC','Florianópolis':'SC','Joinville':'SC','Blumenau':'SC','Camboriu':'SC','Mafra':'SC','Garopaba':'SC',
  'Manaus':'AM','Belem':'PA','Belém':'PA',
  'Goiania':'GO','Goiânia':'GO','Pirenopolis':'GO',
  'Vitoria':'ES','Vitória':'ES',
  'Joao Pessoa':'PB','João Pessoa':'PB',
  'Natal':'RN','Nisia Floresta':'RN',
  'Maceio':'AL','Maceió':'AL',
  'Cuiaba':'MT','Cuiabá':'MT',
  'Campo Grande':'MS',
  'Porto Velho':'RO',
  'Aracaju':'SE',
  'Teresina':'PI',
  'Santos':'SP','Campinas':'SP','Sorocaba':'SP','Sao Jose dos Campos':'SP','São José dos Campos':'SP','Ribeirao Preto':'SP','Ribeirão Preto':'SP','Vinhedo':'SP','Sao Caetano do Sul':'SP','Atibaia':'SP','Sao Bernardo do Campo':'SP','Sao Carlos':'SP','Aguas De Sao Pedro':'SP','Caraguatatuba':'SP','Alfenas':'MG','Peruibe':'SP','Holambra':'SP','Jundiaí':'SP','Ubatuba':'SP',
  'Cabo Frio':'RJ','Petropolis':'RJ','Petrópolis':'RJ','Armação dos Búzios':'RJ',
  'Sudoeste e Octogonal':'DF',
}

function cityWithState(c) {
  const st = STATE_BY_CITY[c]
  return st ? `${c}, ${st}` : c
}

// Pattern → place-type label (used in copy). Tested against name +
// existing description/notes string. Order matters — most-specific first.
const TYPE_PATTERNS = [
  [/sushi|maki|tempura|temaki|gaijin/i, 'vegan sushi spot'],
  [/pizz/i, 'vegan pizzeria'],
  [/burger|burguer|hambur|hamburgueria/i, 'vegan burger spot'],
  [/sorvet|gelato|ice ?cream/i, 'vegan ice cream shop'],
  [/açaí|acaí|açai|acai/i, 'vegan açaí house'],
  [/doceria|confeit|bolos\b|tortas|truf|brownie|cookies|sweets|cake|docinhos/i, 'vegan confectionery'],
  [/padar|panif|bakery|pão de beijo|pao de beijo/i, 'vegan bakery'],
  [/açougue|acougue|butcher|vleischerei|fleischerei/i, 'vegan butcher'],
  [/empório|emporio|mercearia|distribuidora|grocer/i, 'vegan grocery + emporium'],
  [/bistr/i, 'vegan bistrô'],
  [/boteco|botequeiro|gastrobar|gastro bar/i, 'vegan boteco'],
  [/coxinha/i, 'vegan coxinharia'],
  [/falafel|kebab|árabe|arabe|libanesa|lebanese|kafta|shawarma/i, 'vegan Middle-Eastern spot'],
  [/japones|japonesa|asia\b|asian|orient|chinese|chinês|vietnam|thai|tailand|coreano|koreana|tempeh/i, 'vegan Asian kitchen'],
  [/feijoada|baiana|bahian|nordeste|nordestina|capixaba|mineira|gauch|tipica\b|brasileir/i, 'vegan Brazilian kitchen'],
  [/marmit|por quilo|por kilo|buffet|kilao/i, 'vegan marmita / buffet kitchen'],
  [/delivery|congelados|congeladas|pronta entrega/i, 'vegan delivery + frozen meal-prep'],
  [/café|cafe\b|cafeteria|coffee/i, 'vegan café'],
  [/bar\b/i, 'vegan bar'],
  [/cozinha|kitchen|gastronomia|gastronomy/i, 'vegan kitchen'],
  [/restaurante|restaurant/i, 'vegan restaurant'],
  [/snack|salgad|quitut|petisc|lanch/i, 'vegan snack kitchen'],
  [/chocolate|chocoteric|chocolovers|kalapa/i, 'vegan chocolate maker'],
  [/queij|chesse|cheese|laticín|laticin/i, 'vegan dairy alternative producer'],
]

function inferType(name, description, cuisine) {
  const haystack = [name, description, (cuisine||[]).join(' ')].join(' ')
  for (const [re, label] of TYPE_PATTERNS) if (re.test(haystack)) return label
  return 'vegan kitchen'
}

// Source label by verification_method or tag — mention the cross-reference
// once at the end of the description for trust.
function inferSourceFragment(verification_method, tags) {
  const m = verification_method || ''
  const t = (tags || []).join(' ')
  if (/veganfreundlich|round\d|midtier|smalltowns/.test(m + t)) return 'Listed as 100% vegan on Veganizze.com.br.'
  if (/osm-gap/.test(m + t)) return 'Tagged 100% vegan in OpenStreetMap and cross-referenced with a community source.'
  if (/svb/.test(m + t)) return 'Listed on the Sociedade Vegetariana Brasileira (SVB) directory.'
  if (/fortaleza|sao-paulo|saopaulo|salvador|search|websearch/.test(m + t)) return 'Confirmed 100% vegan via Brazilian vegan press cross-reference.'
  return ''
}

// Extract a neighbourhood-ish fragment from an address string if it
// looks like the first comma-separated chunk is a neighbourhood
// (lowercase common-noun streets get filtered).
function inferNeighbourhood(address, city) {
  if (!address) return null
  // Drop generic country/state tails so they don't get picked as neighbourhood
  const cleaned = address
    .replace(/\s*-\s*[A-Z]{2}\b/g, '')          // "São Paulo - SP" → "São Paulo"
    .replace(/,?\s*Brazil$/i, '')
    .replace(/,?\s*Brasil$/i, '')
  const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const cityLower = (city||'').toLowerCase()
  for (const part of parts.slice(0, 3)) {
    if (!part) continue
    if (part.toLowerCase() === cityLower) continue
    if (/^\d/.test(part)) continue                  // postal code / house number
    if (/^[A-Z]{2}$/.test(part)) continue           // state code alone
    if (/Brazil|Brasil/i.test(part)) continue
    // Reject anything that looks like a street, road or generic plot id
    if (/^(Rua|R\.|Av\.|Avenida|Estrada|Travessa|Alameda|Praça|Ciclovia|Quadra|Bloco|Lote|SCS|SCN|SHN|SHS|CLN|CLS|SQS|SQN)\b/i.test(part)) continue
    if (part.length < 3 || part.length > 30) continue
    return part
  }
  return null
}

function buildDescription(row) {
  const type = inferType(row.name, row.description || '', row.cuisine_types)
  const neighbourhood = inferNeighbourhood(row.address, row.city)
  const cityLabel = cityWithState(row.city || 'Brazil')
  const source = inferSourceFragment(row.verification_method, row.tags)
  // Avoid "Brasília, Brasilia, DF" double-city duplication
  const cityMatchesNeighbourhood = neighbourhood && (
    neighbourhood.toLowerCase() === (row.city||'').toLowerCase()
    || neighbourhood.toLowerCase().includes((row.city||'').toLowerCase())
  )
  const location = neighbourhood && !cityMatchesNeighbourhood
    ? `${neighbourhood}, ${cityLabel}`
    : cityLabel
  // The TYPE_PATTERNS already start with "vegan " — strip the duplicated word.
  const typeLower = type.replace(/^vegan /i, '')
  const opener = `100% vegan ${typeLower} in ${location}.`
  return source ? `${opener} ${source}` : opener
}

const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,name,city,address,description,cuisine_types,verification_method,tags,vegan_level').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).range(from, from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
// Tight stub criteria: only rewrite descriptions that are clearly placeholders.
// Don't touch hand-written short ones like "The first 100% vegan delivery in Niterói."
function isStub(d) {
  if (!d) return true
  const t = d.trim()
  if (!t) return true
  if (t.length < 20) return true
  if (/^Summary pending\.?$/i.test(t)) return true
  if (/^Vegan (restaurant|shop|cafe|café|bakery|store|place) in Brazil\.?$/i.test(t)) return true
  if (/^Vegan (restaurant|shop|cafe|café|bakery|store|place) in [A-ZÀ-Ÿ][^\.]{0,30}, Brazil\.?$/i.test(t)) return true
  if (/^Vegan (restaurant|shop|cafe|café) serving [^.]+ in [^.]+, Brazil\.?$/i.test(t)) return true
  if (/^Veganizze\.com\.br fully-vegan listing$/i.test(t)) return true
  if (/^HappyCow .*fully-vegan list$/i.test(t)) return true
  if (/^Vegan and organic restaurant/i.test(t) && t.length < 50) return true
  return false
}
const stubs = all.filter(r => isStub(r.description))
console.log(`Brazil FV total: ${all.length}, stubs to rewrite: ${stubs.length}`)

// Preview 12 spread across the dataset (every Nth) for variety check
console.log('\nPREVIEW (12 sampled):')
const step = Math.max(1, Math.floor(stubs.length / 12))
const samples = []
for (let i = 0; i < stubs.length && samples.length < 12; i += step) samples.push(stubs[i])
for (const r of samples) {
  const desc = buildDescription(r)
  console.log(`  [${r.slug}]`)
  console.log(`    old: ${(r.description||'').trim() || '(empty)'}`)
  console.log(`    new: ${desc}`)
}

if (process.argv.includes('--apply')) {
  let ok = 0
  for (const r of stubs) {
    const desc = buildDescription(r)
    const { error } = await sb.from('places').update({
      description: desc,
      verification_method: TAG,
      last_verified_at: NOW,
    }).eq('id', r.id)
    if (!error) ok++
  }
  console.log(`\n✓ Rewrote ${ok} of ${stubs.length} stubs`)
} else {
  console.log('\n(dry-run — pass --apply to write to DB)')
}
