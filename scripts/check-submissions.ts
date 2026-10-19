#!/usr/bin/env tsx
/**
 * Location + sanity checks for community (mobile) place submissions.
 *
 *   npx tsx scripts/check-submissions.ts                     pending submissions
 *   npx tsx scripts/check-submissions.ts --submission <id>   one submission (used by the approve-submissions skill)
 *   npx tsx scripts/check-submissions.ts --approved-days 90  backfill: submissions approved in the last N days (checks the published place)
 *   add --fix to apply the safe auto-fixes, --json for machine output
 *
 * Checks (each becomes a row in place_submission_checks):
 *   default_coords     coords are the mobile map's default centre (Amsterdam) and the city is not Amsterdam
 *   far_from_address   the submitted address/city geocodes > 25 km from the coords (high when > 100 km)
 *   country_mismatch   reverse geocode of the coords lands in another country
 *   suspicious_name    name is empty, equals the city, or is < 3 characters
 *   geocode_failed     neither the address nor city+country could be geocoded
 *
 * Auto-fix (--fix), published places only, and only when it is unambiguous:
 *   default_coords or far_from_address (> 100 km) AND the forward geocode is a
 *   street-level hit (not a city/region centroid) in the submitted country
 *   -> place coordinates replaced; before/after recorded; status 'applied'.
 * Everything else stays 'open' and, for published places, is mirrored into the
 * Research Review queue (place_corrections with proposed_action) so it shows
 * in /admin/data-quality. Nothing is ever deleted; no data is added that the
 * submitter did not provide.
 */
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
import { createClient } from '@supabase/supabase-js'
import { geocodingService } from '@/lib/geocoding'
import { normalizeCountry } from '@/lib/normalize-country'
import { isMobileDefaultCentre } from '@/lib/submissions/approve'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const args = process.argv.slice(2)
const flag = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined }
const FIX = args.includes('--fix')
const JSON_OUT = args.includes('--json')
const RUN_TAG = `submission-check-${new Date().toISOString().slice(0, 10)}`

const STREET_LEVEL = new Set(['house', 'building', 'amenity', 'shop', 'restaurant', 'cafe', 'bar', 'fast_food', 'residential', 'road', 'pedestrian', 'tertiary', 'secondary', 'primary', 'living_street', 'commercial', 'retail', 'yes'])
const CENTROID_LEVEL = new Set(['city', 'town', 'village', 'municipality', 'county', 'state', 'region', 'country', 'administrative', 'suburb', 'neighbourhood', 'island'])

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLng = (bLng - aLng) * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const sameCountry = (a?: string | null, b?: string | null) => !!a && !!b && (normalizeCountry(a) || a).toLowerCase() === (normalizeCountry(b) || b).toLowerCase()

interface Finding { check_type: string; severity: 'low' | 'medium' | 'high'; finding: string; evidence?: any }

async function checkOne(sub: any, place: any | null) {
  const target = place ?? sub
  const lat = target.latitude as number | null, lng = target.longitude as number | null
  const findings: Finding[] = []
  const name = String(sub.name || '').trim()
  if (name.length < 3 || name.toLowerCase() === String(sub.city || '').trim().toLowerCase()) {
    findings.push({ check_type: 'suspicious_name', severity: 'low', finding: `Name "${name}" looks like a placeholder (empty, too short, or the city name).` })
  }
  let forward: any = null
  const q = [sub.address, sub.city, sub.country].filter(Boolean).join(', ')
  try { forward = (await geocodingService.search(q, { limit: 1 }))[0] ?? null } catch { /* rate limit / network */ }
  if (!forward && (sub.city || sub.country)) {
    try { forward = (await geocodingService.search([sub.city, sub.country].filter(Boolean).join(', '), { limit: 1 }))[0] ?? null } catch { /* ignore */ }
    if (forward) forward.__cityOnly = true
  }
  if (!forward) findings.push({ check_type: 'geocode_failed', severity: 'medium', finding: `Could not geocode "${q}".` })
  const fLat = forward ? parseFloat(forward.lat) : null, fLng = forward ? parseFloat(forward.lon) : null
  const streetLevel = !!forward && !forward.__cityOnly && (STREET_LEVEL.has(forward.type) || (forward.addresstype && STREET_LEVEL.has(forward.addresstype))) && !CENTROID_LEVEL.has(forward.type)
  const forwardCountryOk = !!forward && sameCountry(forward.address?.country, sub.country)

  if (lat != null && lng != null) {
    if (isMobileDefaultCentre(lat, lng) && !/amsterdam/i.test(sub.city || '')) {
      findings.push({ check_type: 'default_coords', severity: 'high', finding: `Coordinates are the mobile map's default centre (Amsterdam) but the place is in ${sub.city || '?'}, ${sub.country || '?'}.`, evidence: { lat, lng } })
    }
    if (fLat != null && fLng != null) {
      const d = km(lat, lng, fLat, fLng)
      if (d > 25) findings.push({ check_type: 'far_from_address', severity: d > 100 ? 'high' : 'medium', finding: `Coordinates are ${Math.round(d)} km from where "${q}" geocodes (${forward.display_name}).`, evidence: { distance_km: Math.round(d), geocode: { lat: fLat, lng: fLng, type: forward.type, display_name: forward.display_name, street_level: streetLevel } } })
    }
    try {
      const rev = await geocodingService.reverse(lat, lng)
      if (rev?.address?.country && sub.country && !sameCountry(rev.address.country, sub.country)) {
        findings.push({ check_type: 'country_mismatch', severity: 'high', finding: `Coordinates are in ${rev.address.country}, the submission says ${sub.country}.`, evidence: { reverse: rev.display_name } })
      }
    } catch { /* ignore */ }
  } else {
    findings.push({ check_type: 'geocode_failed', severity: 'high', finding: 'No coordinates on the submission.' })
  }

  // Safe auto-fix: published place, clearly wrong coords, unambiguous street-level geocode in the right country.
  let applied: any = null
  const clearlyWrong = findings.some(f => f.check_type === 'default_coords' || (f.check_type === 'far_from_address' && f.severity === 'high'))
  if (FIX && place && clearlyWrong && forward && streetLevel && forwardCountryOk && fLat != null && fLng != null) {
    const before = { latitude: place.latitude, longitude: place.longitude }
    const { error } = await sb.from('places').update({ latitude: fLat, longitude: fLng }).eq('id', place.id)
    if (!error) applied = { before, after: { latitude: fLat, longitude: fLng } }
  }

  const rows = findings.map(f => ({
    submission_id: sub.id, place_id: place?.id ?? null, check_type: f.check_type, severity: f.severity,
    status: applied && (f.check_type === 'default_coords' || f.check_type === 'far_from_address') ? 'applied' : 'open',
    finding: f.finding, evidence: f.evidence ?? null, before: applied?.before ?? null, after: applied?.after ?? null, run_tag: RUN_TAG,
  }))
  if (rows.length) {
    // Idempotent per run: drop this run's earlier rows for the submission.
    await sb.from('place_submission_checks').delete().eq('submission_id', sub.id).eq('run_tag', RUN_TAG)
    await sb.from('place_submission_checks').insert(rows)
  }
  // Mirror unresolved high findings on published places into Research Review.
  const openHigh = rows.filter(r => r.status === 'open' && r.severity === 'high')
  if (place && openHigh.length) {
    const { data: existing } = await sb.from('place_corrections').select('id').eq('place_id', place.id).eq('status', 'pending').filter('corrections->>proposed_action', 'eq', 'verify_submission_location').limit(1)
    if (!existing?.length) {
      await sb.from('place_corrections').insert({
        place_id: place.id, user_id: null, status: 'pending',
        corrections: { proposed_action: 'verify_submission_location', current_state: `${place.latitude}, ${place.longitude}`, evidence: openHigh.map(r => r.finding).join(' ') },
        note: `submission check ${RUN_TAG}: ${openHigh.map(r => r.check_type).join(', ')}`,
      })
    }
  }
  return { submission: sub.id, name, city: sub.city, country: sub.country, place: place?.slug ?? null, findings: rows.map(r => ({ type: r.check_type, severity: r.severity, status: r.status, finding: r.finding })), applied }
}

async function main() {
  let subs: any[] = []
  const one = flag('--submission'); const days = flag('--approved-days')
  if (one) {
    const { data } = await sb.from('place_submissions').select('*').eq('id', one); subs = data || []
  } else if (days) {
    const since = new Date(Date.now() - Number(days) * 86_400_000).toISOString()
    const { data } = await sb.from('place_submissions').select('*').eq('status', 'approved').gte('created_at', since).order('created_at', { ascending: false }); subs = data || []
  } else {
    const { data } = await sb.from('place_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: true }); subs = data || []
  }
  const results: any[] = []
  for (const sub of subs) {
    let place: any = null
    if (sub.imported_place_id) {
      const { data } = await sb.from('places').select('id, slug, name, city, country, latitude, longitude, archived_at').eq('id', sub.imported_place_id).single()
      if (data && !data.archived_at) place = data
    }
    results.push(await checkOne(sub, place))
  }
  if (JSON_OUT) { console.log(JSON.stringify(results, null, 2)); return }
  for (const r of results) {
    const tag = r.findings.length ? r.findings.map((f: any) => `${f.severity}:${f.type}${f.status === 'applied' ? '(fixed)' : ''}`).join(', ') : 'ok'
    console.log(`${r.name} | ${r.city}, ${r.country} | ${r.place ? '/place/' + r.place : 'pending'} | ${tag}`)
    for (const f of r.findings) console.log('   -', f.finding)
  }
  console.log(`\n${results.length} checked, ${results.filter(r => r.findings.length).length} with findings, ${results.filter(r => r.applied).length} auto-fixed${FIX ? '' : ' (dry run: add --fix)'}`)
}
main().catch(e => { console.error(e); process.exit(1) })
