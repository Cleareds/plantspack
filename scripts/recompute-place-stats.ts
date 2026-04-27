#!/usr/bin/env tsx
/**
 * Recompute denormalized place stats (`review_count`, `average_rating`) from
 * the source-of-truth `place_reviews` table. Catches drift that accumulates
 * when reviews get edited or soft-deleted without trigger updates.
 *
 * Idempotent — safe to run nightly. Only updates rows whose stats actually
 * differ from the recomputed values, so cost is minimal in steady state.
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  // Pull all non-deleted reviews
  const reviews: { place_id: string; rating: number }[] = [];
  let from = 0;
  while (true) {
    const { data } = await sb.from('place_reviews')
      .select('place_id, rating')
      .is('deleted_at', null)
      .range(from, from + 999);
    if (!data?.length) break;
    reviews.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Loaded ${reviews.length} active reviews`);

  // Aggregate by place
  const stats = new Map<string, { count: number; sum: number }>();
  for (const r of reviews) {
    const s = stats.get(r.place_id) ?? { count: 0, sum: 0 };
    s.count++;
    s.sum += r.rating ?? 0;
    stats.set(r.place_id, s);
  }

  // Pull current denormalized values for places that have at least one review
  // OR places with non-zero review_count (drift candidates)
  const placeIds = [...stats.keys()];
  let drifts: { id: string; expected_count: number; expected_avg: number; current_count: number; current_avg: number }[] = [];

  for (let i = 0; i < placeIds.length; i += 200) {
    const batch = placeIds.slice(i, i + 200);
    const { data } = await sb.from('places')
      .select('id, review_count, average_rating')
      .in('id', batch);
    if (!data) continue;
    for (const p of data) {
      const s = stats.get(p.id)!;
      const expectedAvg = s.count ? Number((s.sum / s.count).toFixed(2)) : 0;
      const currentCount = p.review_count ?? 0;
      const currentAvg = p.average_rating ?? 0;
      if (currentCount !== s.count || Math.abs(currentAvg - expectedAvg) > 0.01) {
        drifts.push({ id: p.id, expected_count: s.count, expected_avg: expectedAvg, current_count: currentCount, current_avg: currentAvg });
      }
    }
  }

  // Also check places with non-zero review_count but no reviews (orphaned counts)
  const { data: orphans } = await sb.from('places')
    .select('id, review_count, average_rating')
    .gt('review_count', 0)
    .is('archived_at', null);
  for (const p of orphans ?? []) {
    if (!stats.has(p.id)) {
      drifts.push({ id: p.id, expected_count: 0, expected_avg: 0, current_count: p.review_count, current_avg: p.average_rating ?? 0 });
    }
  }

  console.log(`${drifts.length} places have drifted stats`);
  if (DRY_RUN) {
    drifts.slice(0, 20).forEach(d => console.log(`  ${d.id}: count ${d.current_count}→${d.expected_count}, avg ${d.current_avg}→${d.expected_avg}`));
    return;
  }

  let fixed = 0;
  for (const d of drifts) {
    const { error } = await sb.from('places').update({
      review_count: d.expected_count,
      average_rating: d.expected_count > 0 ? d.expected_avg : null,
    }).eq('id', d.id);
    if (!error) fixed++;
  }
  console.log(`Fixed ${fixed} drifted records`);
}

main().catch(console.error);
