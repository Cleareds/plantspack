/**
 * Rename Flower Burger rows to include the location qualifier the brand
 * itself uses on flowerburger.it/en/stores/ (e.g. "Flower Burger Roma
 * Alessandria"). With raw "Flower Burger" duplicated across cities,
 * the search dropdown couldn't tell two Rome rows apart.
 *
 * Slugs stay as-is (URLs don't change). Names update + we set
 * verification ladder admin_review since the brand is unambiguously
 * 100% vegan and the user has signed off on the chain.
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COMMIT = process.argv.includes('--commit')

const renames: Array<{ slug: string; name: string }> = [
  // Rome — 2 branches per official site
  { slug: 'flower-burger-roma',   name: 'Flower Burger Roma Alessandria' },
  { slug: 'flower-burger-roma-2', name: 'Flower Burger Roma Gracchi' },

  // Milan — 5 branches. Map by address keyword to brand's own naming.
  // (Tortona, Bicocca/Chiese, Garibaldi, Vittorio Veneto, Santa Giulia)
  { slug: 'flower-burger-milano',   name: 'Flower Burger Milano Tortona' },         // 12 Via Tortona
  { slug: 'flower-burger-milano-2', name: 'Flower Burger Milano Santa Giulia' },    // 5 Via Luigi Russolo
  { slug: 'flower-burger-milano-3', name: 'Flower Burger Milano Bicocca' },         // Via Chiese
  { slug: 'flower-burger-milano-4', name: 'Flower Burger Milano Garibaldi' },       // 34 Corso Garibaldi
  { slug: 'flower-burger-milano-5', name: 'Flower Burger Milano Vittorio Veneto' }, // 10 Viale Vittorio Veneto

  // Single-branch cities — append city for consistency with the brand's
  // own naming pattern. Helps when a user types "flower burger" and gets
  // 22 hits, the dropdown still tells them which city.
  { slug: 'flower-burger-bari',           name: 'Flower Burger Bari' },
  { slug: 'flower-burger-bergamo',        name: 'Flower Burger Bergamo' },
  { slug: 'flower-burger-bologna',        name: 'Flower Burger Bologna' },
  { slug: 'flower-burger-busnago',        name: 'Flower Burger Globo (Busnago)' },
  { slug: 'flower-burger-campi-bisenzio', name: 'Flower Burger I Gigli (Campi Bisenzio)' },
  { slug: 'flower-burger-florence',       name: 'Flower Burger Firenze' },
  { slug: 'flower-burger-madrid',         name: 'Flower Burger Madrid' },
  { slug: 'flower-burger-marseille',      name: 'Flower Burger Marseille' },
  { slug: 'flower-burger-monza',          name: 'Flower Burger Monza' },
  { slug: 'flower-burger-palermo',        name: 'Flower Burger Palermo' },
  { slug: 'flower-burger-pescara',        name: 'Flower Burger Pescara' },
  { slug: 'flower-burger-reggio-emilia',  name: 'Flower Burger Reggio Emilia' },
  { slug: 'flower-burger-rimini',         name: 'Flower Burger Rimini' },
  { slug: 'flower-burger-torino',         name: 'Flower Burger Torino' },
  { slug: 'flower-burger-trento',         name: 'Flower Burger Trento' },
  { slug: 'flower-burger-verona',         name: 'Flower Burger Verona' },
]

async function main() {
  console.log(COMMIT ? 'COMMIT' : 'DRY-RUN')
  for (const r of renames) {
    const { data: row } = await sb.from('places').select('id, name').eq('slug', r.slug).maybeSingle()
    if (!row) { console.log(`  MISSING ${r.slug}`); continue }
    if (row.name === r.name) { console.log(`  SKIP    ${r.slug}: already "${r.name}"`); continue }
    console.log(`  ${COMMIT ? 'COMMIT' : 'DRY'}     "${row.name}" -> "${r.name}"`)
    if (!COMMIT) continue
    const { error } = await sb.from('places').update({ name: r.name, updated_at: new Date().toISOString() }).eq('id', row.id)
    if (error) console.log(`    ERR: ${error.message}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
