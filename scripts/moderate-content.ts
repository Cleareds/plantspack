#!/usr/bin/env tsx
/**
 * Async content moderation — runs nightly via crontab.
 *
 * Sends recent place_reviews and recently-added places through OpenAI's
 * Moderation API and flags problematic content into the `reports` table
 * with reporter_id=NULL (system-flagged) so admins can triage in the
 * existing /admin/reports queue.
 *
 * Why nightly + async: at 20-30 daily users we don't need to block UX on
 * moderation. Running once per night keeps the queue clean without adding
 * any latency to submissions.
 *
 * Usage:
 *   npx tsx scripts/moderate-content.ts           # last 24h
 *   npx tsx scripts/moderate-content.ts --since=7d
 *   npx tsx scripts/moderate-content.ts --dry-run
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINCE = (() => {
  const a = args.find(x => x.startsWith('--since='));
  if (!a) return new Date(Date.now() - 86400_000); // 1 day default
  const v = a.split('=')[1];
  const m = v.match(/^(\d+)([dh])$/);
  if (!m) return new Date(Date.now() - 86400_000);
  const n = parseInt(m[1]);
  const ms = m[2] === 'd' ? n * 86400_000 : n * 3600_000;
  return new Date(Date.now() - ms);
})();

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not set; aborting');
  process.exit(1);
}

interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

async function moderate(text: string): Promise<ModerationResult | null> {
  if (!text || text.trim().length < 5) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.results?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fileReport(reportedType: string, reportedId: string, reason: string, description: string) {
  if (DRY_RUN) {
    console.log(`  [DRY] would flag ${reportedType} ${reportedId}: ${reason} — ${description}`);
    return;
  }
  // Skip if already reported by the system for this content
  const { data: existing } = await sb.from('reports')
    .select('id')
    .eq('reported_type', reportedType)
    .eq('reported_id', reportedId)
    .is('reporter_id', null)
    .maybeSingle();
  if (existing) return;

  await sb.from('reports').insert({
    reporter_id: null, // system-flagged
    reported_type: reportedType,
    reported_id: reportedId,
    reason,
    description: description.slice(0, 500),
  });
}

function pickReason(cats: Record<string, boolean>): string {
  if (cats.sexual || cats['sexual/minors']) return 'inappropriate';
  if (cats.violence || cats['violence/graphic']) return 'inappropriate';
  if (cats.hate || cats['hate/threatening']) return 'inappropriate';
  if (cats.harassment) return 'inappropriate';
  return 'spam';
}

async function moderateReviews() {
  const { data: reviews } = await sb.from('place_reviews')
    .select('id, content, place_id')
    .gt('created_at', SINCE.toISOString())
    .is('deleted_at', null);
  if (!reviews?.length) { console.log('No new reviews to moderate'); return; }
  console.log(`Moderating ${reviews.length} reviews since ${SINCE.toISOString()}...`);
  let flagged = 0;
  for (const r of reviews) {
    if (!r.content) continue;
    const m = await moderate(r.content);
    if (m?.flagged) {
      const reason = pickReason(m.categories);
      const cats = Object.entries(m.categories).filter(([_, v]) => v).map(([k]) => k).join(', ');
      console.log(`  FLAG review ${r.id} (place ${r.place_id}): ${cats}`);
      await fileReport('place_review', r.id, reason, `auto-flagged: ${cats}`);
      flagged++;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  console.log(`  reviews flagged: ${flagged}`);
}

async function moderatePlaces() {
  // Only check community-added places (created_by != null) — admin imports trusted
  const { data: places } = await sb.from('places')
    .select('id, name, description, created_by')
    .gt('created_at', SINCE.toISOString())
    .not('created_by', 'is', null)
    .is('archived_at', null)
    .limit(500);
  if (!places?.length) { console.log('No new community places to moderate'); return; }
  console.log(`Moderating ${places.length} new community places...`);
  let flagged = 0;
  for (const p of places) {
    const text = [p.name, p.description].filter(Boolean).join('\n');
    if (!text) continue;
    const m = await moderate(text);
    if (m?.flagged) {
      const reason = pickReason(m.categories);
      const cats = Object.entries(m.categories).filter(([_, v]) => v).map(([k]) => k).join(', ');
      console.log(`  FLAG place ${p.id} "${p.name}": ${cats}`);
      await fileReport('place', p.id, reason, `auto-flagged: ${cats}`);
      flagged++;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  console.log(`  places flagged: ${flagged}`);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}; since=${SINCE.toISOString()}`);
  await moderateReviews();
  await moderatePlaces();
  console.log('done');
}

main().catch(console.error);
