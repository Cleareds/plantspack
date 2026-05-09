import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const SQL = `CREATE OR REPLACE FUNCTION nearby_places(
  lat float8,
  lng float8,
  lim int DEFAULT 20,
  off_set int DEFAULT 0,
  cat text DEFAULT 'all'
)
RETURNS SETOF places AS $$
  SELECT * FROM places
  WHERE geom IS NOT NULL
  AND archived_at IS NULL
  AND (cat = 'all' OR category = cat)
  ORDER BY geom <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  LIMIT lim OFFSET off_set;
$$ LANGUAGE sql STABLE;`

async function main() {
  // Try via raw SQL through pg via supabase admin
  const { error } = await sb.rpc('exec_sql', { sql: SQL })
  if (error?.message?.includes('exec_sql') || error?.message?.includes('Could not find')) {
    // Fall back to direct query via pg via SUPABASE_DB_URL if available
    console.log('No exec_sql RPC. Migration file is committed; apply via supabase db push or psql:')
    console.log(SQL)
  } else if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Function updated.')
  }
  // Quick smoke test: call it and confirm it returns no archived rows
  const { data, error: e2 } = await sb.rpc('nearby_places', { lat: 51.276, lng: 5.121, lim: 10, off_set: 0, cat: 'all' })
  if (e2) console.log('smoke test err:', e2.message)
  else {
    const archived = (data || []).filter((r: any) => r.archived_at).length
    console.log(`smoke test (Bistro Tilo Retie area): ${data?.length || 0} rows, ${archived} archived`)
  }
}
main()
