#!/usr/bin/env tsx
/**
 * Tamper guard for public.spatial_ref_sys.
 *
 * Supabase's "rls_disabled_in_public" advisory (2026-07-26) is about this table.
 * It holds no user data - it is the PostGIS EPSG registry - but anon and
 * authenticated hold INSERT/UPDATE/DELETE/TRUNCATE on it, and we CANNOT take that
 * away: the table is owned by `supabase_admin`, migrations run as `postgres`, and
 * `postgres` is not a member of that role, so both REVOKE and
 * ALTER TABLE ... ENABLE ROW LEVEL SECURITY are silent no-ops for us. See
 * supabase/migrations/20260728220000_spatial_ref_sys_rls_via_owner.sql, which
 * records the evidence. Only Supabase support can close it properly.
 *
 * Worst case if someone abuses it: they delete or corrupt SRID rows and every
 * geography operation breaks - map, nearby-places, nearby-cities, distance sort.
 * That is recoverable in seconds, which is what this script is for: detect it,
 * and put the critical rows back.
 *
 *   npx tsx scripts/check-spatial-ref-sys.ts            # report only
 *   npx tsx scripts/check-spatial-ref-sys.ts --repair   # restore missing rows
 *
 * Wired into scripts/_daily-maintenance.sh.
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const REPAIR = process.argv.includes('--repair')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

/** SRIDs the platform actually depends on, with their canonical definitions. */
const CRITICAL = [
  {
    srid: 4326,
    auth_name: 'EPSG',
    auth_srid: 4326,
    srtext: 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',
    proj4text: '+proj=longlat +datum=WGS84 +no_defs ',
  },
  {
    srid: 3857,
    auth_name: 'EPSG',
    auth_srid: 3857,
    srtext: 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],AUTHORITY["EPSG","3857"]]',
    proj4text: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs ',
  },
]

// A stock PostGIS install ships ~8500 rows. A big drop means something truncated it.
const EXPECTED_MIN_ROWS = 8000

async function main() {
  const { count, error: cErr } = await sb
    .from('spatial_ref_sys')
    .select('srid', { count: 'exact', head: true })
  if (cErr) {
    console.error(`[spatial_ref_sys] cannot read table: ${cErr.message}`)
    process.exit(1)
  }

  const problems: string[] = []
  if ((count ?? 0) < EXPECTED_MIN_ROWS) {
    problems.push(`row count ${count} is below the expected minimum ${EXPECTED_MIN_ROWS}`)
  }

  const missing: typeof CRITICAL = []
  for (const row of CRITICAL) {
    const { data } = await sb.from('spatial_ref_sys').select('srid').eq('srid', row.srid).maybeSingle()
    if (!data) { missing.push(row); problems.push(`SRID ${row.srid} is MISSING`) }
  }

  if (!problems.length) {
    console.log(`[spatial_ref_sys] ok - ${count} rows, critical SRIDs present`)
    return
  }

  console.error(`[spatial_ref_sys] PROBLEMS DETECTED:`)
  for (const p of problems) console.error(`  - ${p}`)

  if (!missing.length) {
    console.error('  (no critical SRID missing; row count drop needs a manual look)')
    process.exit(1)
  }
  if (!REPAIR) {
    console.error('  re-run with --repair to restore the missing critical SRIDs')
    process.exit(1)
  }

  for (const row of missing) {
    const { error } = await sb.from('spatial_ref_sys').insert(row)
    console.error(error
      ? `  restore SRID ${row.srid} FAILED: ${error.message}`
      : `  restored SRID ${row.srid}`)
  }

  // Confirm geography operations work again.
  const { error: gErr } = await sb.rpc('nearby_cities', {
    src_lat: 50.85, src_lng: 4.35, src_country: 'Belgium', lim: 1, exclude_city: null, min_places: 5,
  })
  console.error(gErr
    ? `  geography check STILL FAILING: ${gErr.message}`
    : '  geography check passes (nearby_cities returned)')
}

main().catch(e => { console.error(e); process.exit(1) })
