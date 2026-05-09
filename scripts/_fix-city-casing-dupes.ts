import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Each entry: country + the canonical form + the variants to fold into it.
// Canonical follows local-language diacritic + correct preposition casing
// (same convention we already use for Liège, Düsseldorf, Münster, etc).
const RENAMES: Array<{ country: string; canonical: string; variants: string[] }> = [
  { country: 'Brazil',    canonical: 'Campos dos Goytacazes', variants: ['Campos Dos Goytacazes'] },
  { country: 'Brazil',    canonical: 'Foz do Iguacu',         variants: ['Foz Do Iguacu'] },
  { country: 'Brazil',    canonical: 'Goiania',               variants: ['goiania'] },
  { country: 'Brazil',    canonical: 'São Paulo',             variants: ['Sao Paulo'] },
  { country: 'Colombia',  canonical: 'Villa de Leyva',        variants: ['Villa De Leyva'] },
  { country: 'Germany',   canonical: 'Düsseldorf',            variants: ['Dusseldorf'] },
  { country: 'Germany',   canonical: 'Münster',               variants: ['Munster'] },
  { country: 'Mexico',    canonical: 'San Cristóbal',         variants: ['San Cristobal'] },
  { country: 'Sweden',    canonical: 'Borlänge',              variants: ['Borlange'] },
  { country: 'Sweden',    canonical: 'Malmö',                 variants: ['Malmo'] },
]

async function main() {
  for (const r of RENAMES) {
    for (const variant of r.variants) {
      const { count } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', r.country).is('archived_at', null).eq('city', variant)
      if (!count || count === 0) { console.log(`  ${r.country} "${variant}": 0 rows, skip`); continue }
      const { error } = await sb.from('places').update({ city: r.canonical, updated_at: new Date().toISOString() }).eq('country', r.country).is('archived_at', null).eq('city', variant)
      console.log(`  ${r.country} "${variant}" -> "${r.canonical}": ${count} rows ${error ? `ERR ${error.message}` : 'OK'}`)
    }
  }
  const { error } = await sb.rpc('refresh_directory_views')
  console.log(`\nrefresh_directory_views: ${error ? `ERR ${error.message}` : 'OK'}`)
}
main().catch(e => { console.error(e); process.exit(1) })
