#!/usr/bin/env node
/**
 * Remediation for vegan-level false positives from OSM import batches
 * (audit 2026-07-13; e.g. "King Döner" fully_vegan via osm-import-2026-04 +
 * germany-verification-bump-2026-05-19).
 *
 * Mode A (this script, --apply to write): places whose name contains an
 * UNAMBIGUOUS animal-centric pattern, with no vegan qualifier in
 * name/description/tags, zero reviews, not human-verified, from a bulk-import
 * source. Action: demote vegan_level -> 'vegan_options', reset bulk-bumped
 * verification_level 3 -> 1, tag verification_method so it's reversible.
 * NEVER deletes or archives. Never touches is_verified/admin_review.
 *
 * Mode B (exported CSV): ambiguous patterns (burger/butcher/etc.) that include
 * real vegan brands — needs website/WebSearch verification or admin review.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const APPLY = process.argv.includes('--apply');
const AUDIT_TAG = 'false-positive-audit-2026-07';

// Unambiguous: essentially never a vegan brand name without a vegan qualifier.
const CERTAIN = /(döner|doner kebab|kebab|kebap|shawarma|gyros|fisch|fish house|seafood|bratwurst|currywurst|steakhaus|steakhouse|grillhaus|metzgerei|schlachthof|hähnchen|brathähnchen|fried chicken|chicken shop|carniceria|boucherie|macelleria)/i;
// Ambiguous: real vegan chains use these — route to Mode B instead.
const AMBIGUOUS = /(burger|butcher|grill|bbq|barbecue|steak|wings|ribs|hot ?dog|chicken|sushi|crab|lobster|oyster|wurst|sausage|schnitzel|carne|poisson)/i;
const VEGAN_QUALIFIER = /(vegan|vegi|veggie|vegetar|plant|fleischlos|fleischfrei|meatless|sin carne|no ?butcher)/i;
const BULK_SOURCES_RE = /^(osm|openstreetmap|foursquare)/i;

function humanVerified(p) {
  return p.is_verified === true || p.verification_method === 'admin_review';
}

(async () => {
  const PAGE = 1000;
  let from = 0;
  const modeA = [];
  const modeB = [];
  for (;;) {
    const { data, error } = await s
      .from('places')
      .select('id, name, description, tags, city, country, vegan_level, source, verification_level, verification_method, is_verified, review_count, website')
      .is('archived_at', null)
      .in('vegan_level', ['fully_vegan', 'mostly_vegan', 'vegan_friendly'])
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data.length) break;
    for (const p of data) {
      const hay = `${p.name} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`;
      if (VEGAN_QUALIFIER.test(hay) || humanVerified(p) || (p.review_count ?? 0) > 0) continue;
      if (!BULK_SOURCES_RE.test(p.source ?? '')) {
        if (CERTAIN.test(p.name)) modeB.push({ ...p, reason: 'certain-pattern-but-curated-source' });
        continue;
      }
      if (CERTAIN.test(p.name)) modeA.push(p);
      else if (AMBIGUOUS.test(p.name)) modeB.push({ ...p, reason: 'ambiguous-pattern' });
    }
    from += PAGE;
    if (data.length < PAGE) break;
  }

  console.log(`Mode A (auto-demote candidates): ${modeA.length}`);
  console.log(`Mode B (needs verification, CSV): ${modeB.length}`);
  for (const p of modeA.slice(0, 25)) console.log(`  A: ${p.name} | ${p.city}, ${p.country} | ${p.vegan_level} | ${p.source}`);

  const csv = ['id,name,city,country,vegan_level,source,verification_level,website,reason']
    .concat(modeB.map((p) => [p.id, `"${p.name.replaceAll('"', "'")}"`, `"${p.city ?? ''}"`, p.country, p.vegan_level, p.source, p.verification_level, p.website ?? '', p.reason].join(',')))
    .join('\n');
  fs.writeFileSync(require('path').join(__dirname, '..', 'reports', 'vegan-level-modeB-needs-verification.csv'), csv);
  console.log('Mode B CSV -> reports/vegan-level-modeB-needs-verification.csv');
  fs.writeFileSync(require('path').join(__dirname, '..', 'reports', 'vegan-level-modeA-demotions.json'), JSON.stringify(modeA, null, 1));
  console.log('Mode A list -> reports/vegan-level-modeA-demotions.json (for rollback reference)');

  if (!APPLY) {
    console.log('\nDRY RUN — no writes. Re-run with --apply to demote Mode A.');
    return;
  }

  let done = 0;
  for (const p of modeA) {
    const patch = {
      vegan_level: 'vegan_options',
      verification_method: AUDIT_TAG,
      ...(p.verification_level >= 3 ? { verification_level: 1 } : {}),
    };
    const { error } = await s.from('places').update(patch).eq('id', p.id);
    if (error) console.error('FAILED', p.id, p.name, error.message);
    else done++;
  }
  console.log(`Demoted ${done}/${modeA.length} places to vegan_options (tag: ${AUDIT_TAG}).`);
})();
