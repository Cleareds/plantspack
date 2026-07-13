#!/usr/bin/env node
/**
 * Applies the WebSearch-adjudicated verdicts from the 2026-07-13 vegan-level
 * audit (reports/vegan-audit-verdicts-2026-07-13.json). 147 'fully_vegan'
 * places with meat-centric names were individually verified via web search.
 *
 *  - not_vegan (58): demote vegan_level -> 'vegan_options', reset bulk-bumped
 *    verification_level >=3 -> 1. NOT archived, NOT deleted — reversible, and
 *    archiving stays a human decision in the admin queue.
 *  - vegan (78): confirmed genuine -> verification_level 2 where lower
 *    ("cross-referenced" tier; never is_verified, never admin_review).
 *  - unknown (11): untouched; review via admin.
 *
 * Dry-run by default; --apply to write. All writes tagged
 * verification_method='websearch-audit-2026-07' for rollback.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const APPLY = process.argv.includes('--apply');
const TAG = 'websearch-audit-2026-07';
const verdicts = require('../reports/vegan-audit-verdicts-2026-07-13.json');

(async () => {
  const demote = verdicts.filter((v) => v.verdict === 'not_vegan');
  const confirm = verdicts.filter((v) => v.verdict === 'vegan');
  console.log(`demote->vegan_options: ${demote.length} | confirm-keep-fully: ${confirm.length} | untouched: ${verdicts.length - demote.length - confirm.length}`);
  if (!APPLY) { console.log('DRY RUN — re-run with --apply.'); return; }

  let d = 0, c = 0;
  for (const v of demote) {
    const { data: p } = await s.from('places').select('verification_level, is_verified, verification_method').eq('id', v.id).single();
    if (!p || p.is_verified || p.verification_method === 'admin_review') { console.log('skip (human-verified):', v.name); continue; }
    const { error } = await s.from('places').update({
      vegan_level: 'vegan_options',
      verification_method: TAG,
      ...(p.verification_level >= 3 ? { verification_level: 1 } : {}),
      admin_notes: `[${TAG}] demoted from fully_vegan — ${v.evidence}`.slice(0, 500),
    }).eq('id', v.id);
    if (error) console.error('FAIL', v.name, error.message); else d++;
  }
  for (const v of confirm) {
    const { data: p } = await s.from('places').select('verification_level, is_verified, verification_method').eq('id', v.id).single();
    if (!p || p.is_verified || p.verification_method === 'admin_review' || p.verification_level >= 2) continue;
    const { error } = await s.from('places').update({ verification_level: 2, verification_method: TAG }).eq('id', v.id);
    if (error) console.error('FAIL', v.name, error.message); else c++;
  }
  console.log(`demoted ${d}, confidence-bumped ${c}. Tag: ${TAG}`);
})();
