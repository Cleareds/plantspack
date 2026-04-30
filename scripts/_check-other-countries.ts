import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const CONTINENTS: Record<string, string[]> = {
  'Europe': ['Albania','Andorra','Austria','Belarus','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czech Republic','Denmark','Estonia','Faroe Islands','Finland','France','Germany','Greece','Guernsey','Hungary','Iceland','Ireland','Italy','Jersey','Kosovo','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Moldova','Monaco','Montenegro','Netherlands','North Macedonia','Norway','Poland','Portugal','Romania','Russia','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Turkey','Ukraine','United Kingdom'],
  'North America': ['Canada','Costa Rica','Cuba','Curacao','Dominican Republic','El Salvador','Guatemala','Honduras','Jamaica','Mexico','Nicaragua','Panama','Puerto Rico','Trinidad and Tobago','United States'],
  'South America': ['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','French Guiana','Guyana','Paraguay','Peru','Uruguay','Venezuela'],
  'Asia': ['Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Brunei','Cambodia','China','Georgia','Hong Kong','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon','Macao','Malaysia','Maldives','Mongolia','Myanmar','Nepal','Oman','Pakistan','Palestine','Palestinian Territories','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Thailand','Turkey','United Arab Emirates','Uzbekistan','Vietnam'],
  'Oceania': ['Australia','Fiji','New Caledonia','New Zealand'],
  'Africa': ['Algeria','Botswana','Egypt','Ethiopia','Gabon','Ghana','Kenya','Madagascar','Mauritius','Morocco','Mozambique','Namibia','Nigeria','Reunion','Rwanda','Senegal','South Africa','Tanzania','Tunisia','Uganda','Zimbabwe'],
}
const known = new Set(Object.values(CONTINENTS).flat())

async function main() {
  const env = readFileSync('.env.local','utf8').split('\n').reduce((a:any,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'');return a},{})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Pull from directory_countries (one row per country with place_count)
  const { data, error } = await sb.from('directory_countries').select('country, place_count').order('place_count', { ascending: false })
  if (error) throw error

  const other = (data || []).filter((r: any) => !known.has(r.country))
  console.log(`countries falling into 'Other': ${other.length}`)
  for (const r of other) console.log(`  ${r.country.padEnd(40)} ${r.place_count}`)
}
main().catch(e => { console.error(e); process.exit(1) })
