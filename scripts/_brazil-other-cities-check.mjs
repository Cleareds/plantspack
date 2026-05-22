import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const cities = ['Recife','Goiânia','Goiania','Vitória','Vitoria','Manaus','Campinas','Belém','Belem','João Pessoa','Joao Pessoa','Florianópolis','Florianopolis','Santa Maria','Niterói','Niteroi','Natal','São José dos Campos','Sao Jose dos Campos','Maceió','Maceio','Aracaju','Cuiabá','Cuiaba','Ribeirão Preto','Ribeirao Preto','Sorocaba','São Luís','Sao Luis','Teresina']
for (const c of cities) {
  const { count: t } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city',c).is('archived_at',null)
  const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city',c).eq('vegan_level','fully_vegan').is('archived_at',null)
  if (t > 0 || c.includes('í') || c.includes('ó')) console.log(`  ${c.padEnd(28)} ${String(t||0).padStart(4)} places, ${String(fv||0).padStart(3)} FV`)
}
