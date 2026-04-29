/**
 * Targeted Tier-1 + selective Tier-2 verification of the `fully_vegan` rows
 * that have no websearch_* tag yet (~647 places). The main bulk-verify script
 * skips them because they're in the checkpoint as `uncertain` from earlier
 * runs. This bypass goes directly to a fresh classification.
 *
 * Strategy:
 *   1. Tier 1 (gpt-4o-mini) on every row that has a usable description (~$0.07 total)
 *   2. Tier 2 (web-search) only on rows that come back `uncertain` or lack
 *      a description, to cap spend.
 *
 * Usage:
 *   tsx scripts/verify-untagged-fully-vegan.ts --dry-run
 *   tsx scripts/verify-untagged-fully-vegan.ts --apply
 *   tsx scripts/verify-untagged-fully-vegan.ts --apply --tier1-only
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 0 });

const APPLY = process.argv.includes('--apply');
const TIER1_ONLY = process.argv.includes('--tier1-only');
const T1_CONCURRENCY = 50;
const T1_SLEEP_MS = 100;
const T2_CONCURRENCY = 10;
const T2_SLEEP_MS = 1500;

type Verdict = 'fully_vegan' | 'not_fully_vegan' | 'closed' | 'uncertain';

function parseVerdict(text: string): Verdict {
  const first = text.split('\n')[0].toUpperCase();
  if (first.includes('FULLY_VEGAN') && !first.includes('NOT')) return 'fully_vegan';
  if (first.includes('NOT_FULLY_VEGAN')) return 'not_fully_vegan';
  if (first.includes('CLOSED')) return 'closed';
  return 'uncertain';
}

async function tier1(p: any): Promise<{ verdict: Verdict; evidence: string }> {
  const location = [p.city, p.country].filter(Boolean).join(', ');
  const prompt = `Classify this place into one vegan category based only on the information provided.

Name: ${p.name}${location ? ` (${location})` : ''}
Description: ${(p.description || '').slice(0, 500)}

Rules:
- FULLY_VEGAN: description clearly states 100% vegan / plant-based only / no animal products
- NOT_FULLY_VEGAN: description mentions dairy, eggs, honey, meat, fish, or "vegetarian" options alongside vegan
- CLOSED: description or name indicates permanently closed
- UNCERTAIN: not enough information to decide confidently

Reply with exactly one of: FULLY_VEGAN / NOT_FULLY_VEGAN / CLOSED / UNCERTAIN
Then a one-sentence reason on the next line.`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0,
      });
      const text = r.choices[0]?.message?.content?.trim() ?? '';
      return { verdict: parseVerdict(text), evidence: text.split('\n').slice(1).join(' ').slice(0, 200) };
    } catch (e: any) {
      if ((e.status === 429 || e.status === 503) && attempt < 2) await new Promise(rr => setTimeout(rr, (attempt + 1) * 2000));
      else return { verdict: 'uncertain', evidence: 'tier1-error' };
    }
  }
  return { verdict: 'uncertain', evidence: 'tier1-error' };
}

async function tier2(p: any): Promise<{ verdict: Verdict; evidence: string }> {
  const location = [p.city, p.country].filter(Boolean).join(', ');
  const prompt = `Is "${p.name}"${location ? ` in ${location}` : ''} a 100% fully vegan establishment (no animal products of any kind on the menu)?

Search for this specific place and check:
1. Is it confirmed 100% vegan (no meat, dairy, eggs, honey)?
2. Is it still open, or permanently closed?

Reply with exactly one of these verdicts on the first line, then a one-sentence reason:
FULLY_VEGAN - confirmed 100% vegan, currently open
NOT_FULLY_VEGAN - serves or sells animal products (even dairy/eggs)
CLOSED - permanently closed
UNCERTAIN - cannot find reliable information`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await openai.chat.completions.create({
        model: 'gpt-4o-mini-search-preview',
        messages: [{ role: 'user', content: prompt }],
      });
      const text = r.choices[0]?.message?.content?.trim() ?? '';
      return { verdict: parseVerdict(text), evidence: text.split('\n').slice(1).join(' ').slice(0, 300) };
    } catch (e: any) {
      if ((e.status === 429 || e.status === 503) && attempt < 2) await new Promise(rr => setTimeout(rr, (attempt + 1) * 5000));
      else return { verdict: 'uncertain', evidence: 'tier2-error' };
    }
  }
  return { verdict: 'uncertain', evidence: 'tier2-error' };
}

async function applyVerdict(placeId: string, verdict: Verdict, currentTags: string[]) {
  if (!APPLY) return;
  let tags = [...currentTags];
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (verdict === 'fully_vegan') {
    if (!tags.includes('websearch_confirmed_vegan')) tags.push('websearch_confirmed_vegan');
    tags = tags.filter(t => t !== 'websearch_review_flag');
    updates.tags = tags;
    updates.verification_status = 'scraping_verified';
  } else if (verdict === 'not_fully_vegan') {
    if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag');
    tags = tags.filter(t => t !== 'websearch_confirmed_vegan');
    updates.tags = tags;
  } else if (verdict === 'closed') {
    if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed');
    updates.tags = tags;
  } else return;
  await sb.from('places').update(updates).eq('id', placeId);
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}${TIER1_ONLY ? ' (tier1 only)' : ''}`);

  const { data: places } = await sb.from('places')
    .select('id, name, city, country, description, tags')
    .eq('vegan_level', 'fully_vegan')
    .is('archived_at', null)
    .not('tags', 'cs', '{websearch_confirmed_vegan}')
    .not('tags', 'cs', '{websearch_review_flag}')
    .not('tags', 'cs', '{websearch_confirmed_closed}')
    .order('id');
  if (!places?.length) { console.log('Nothing to verify.'); return; }
  console.log(`Untagged places: ${places.length}`);

  const withDesc = places.filter(p => p.description && p.description.trim().length >= 30);
  const noDesc = places.filter(p => !p.description || p.description.trim().length < 30);
  console.log(`  Tier 1 candidates (have desc):   ${withDesc.length}`);
  console.log(`  Tier 2 candidates (no usable desc): ${noDesc.length}`);

  const stats = { confirmed: 0, flagged: 0, closed: 0, uncertain: 0, errors: 0 };
  const tier1Uncertain: any[] = []; // promote to Tier 2 round

  // -------- Tier 1 pass --------
  console.log(`\nTier 1 (gpt-4o-mini): ${withDesc.length} places, concurrency=${T1_CONCURRENCY}`);
  for (let i = 0; i < withDesc.length; i += T1_CONCURRENCY) {
    const batch = withDesc.slice(i, i + T1_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(p => tier1(p)));
    for (let j = 0; j < batch.length; j++) {
      const place = batch[j];
      const r = results[j];
      if (r.status !== 'fulfilled') { stats.errors++; continue; }
      const v = r.value.verdict;
      if (v === 'uncertain') tier1Uncertain.push(place);
      else {
        if (v === 'fully_vegan') stats.confirmed++;
        else if (v === 'not_fully_vegan') stats.flagged++;
        else if (v === 'closed') stats.closed++;
        await applyVerdict(place.id, v, place.tags || []);
      }
    }
    process.stdout.write(`\r  T1: ${Math.min(i + T1_CONCURRENCY, withDesc.length)}/${withDesc.length} | confirmed=${stats.confirmed} flagged=${stats.flagged} closed=${stats.closed} uncertain=${tier1Uncertain.length}`);
    if (i + T1_CONCURRENCY < withDesc.length) await new Promise(r => setTimeout(r, T1_SLEEP_MS));
  }

  // -------- Tier 2 pass on uncertain + no-desc --------
  const tier2List = TIER1_ONLY ? [] : [...tier1Uncertain, ...noDesc];
  if (tier2List.length === 0) {
    console.log(`\n\nTier 2 skipped (none queued${TIER1_ONLY ? ' or --tier1-only set' : ''}).`);
  } else {
    console.log(`\n\nTier 2 (gpt-4o-mini-search-preview): ${tier2List.length} places, concurrency=${T2_CONCURRENCY}`);
    let t2Confirmed = 0, t2Flagged = 0, t2Closed = 0, t2Uncertain = 0;
    for (let i = 0; i < tier2List.length; i += T2_CONCURRENCY) {
      const batch = tier2List.slice(i, i + T2_CONCURRENCY);
      const results = await Promise.allSettled(batch.map(p => tier2(p)));
      for (let j = 0; j < batch.length; j++) {
        const place = batch[j];
        const r = results[j];
        if (r.status !== 'fulfilled') { stats.errors++; continue; }
        const v = r.value.verdict;
        if (v === 'fully_vegan') { stats.confirmed++; t2Confirmed++; }
        else if (v === 'not_fully_vegan') { stats.flagged++; t2Flagged++; }
        else if (v === 'closed') { stats.closed++; t2Closed++; }
        else { stats.uncertain++; t2Uncertain++; }
        await applyVerdict(place.id, v, place.tags || []);
      }
      process.stdout.write(`\r  T2: ${Math.min(i + T2_CONCURRENCY, tier2List.length)}/${tier2List.length} | conf=${t2Confirmed} flag=${t2Flagged} closed=${t2Closed} uncert=${t2Uncertain}`);
      if (i + T2_CONCURRENCY < tier2List.length) await new Promise(r => setTimeout(r, T2_SLEEP_MS));
    }
  }

  console.log(`\n\nDone.`);
  console.log(`  ✓ confirmed:  ${stats.confirmed}`);
  console.log(`  ⚠ flagged:    ${stats.flagged}`);
  console.log(`  ✗ closed:     ${stats.closed}`);
  console.log(`  ? uncertain:  ${stats.uncertain}${TIER1_ONLY && tier1Uncertain.length ? ` (+${tier1Uncertain.length} t1-uncertain not promoted to T2)` : ''}`);
  console.log(`  ! errors:     ${stats.errors}`);

  if (APPLY) {
    const { error: rErr } = await sb.rpc('refresh_directory_views');
    console.log('Views refreshed:', rErr ? 'ERR ' + rErr.message : 'OK');
  } else {
    console.log('\nDRY RUN: no DB writes. Re-run with --apply.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
