#!/usr/bin/env tsx
/**
 * Daily data-quality snapshot. Prints a structured summary of the current
 * state of the places table so the user can eyeball health at a glance.
 *
 * Run nightly after the enrichment pipeline; output goes to stdout (and
 * /tmp/quality-YYYY-MM-DD.log via the cron redirection).
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function count(filter: (q: any) => any): Promise<number> {
  let q = sb.from('places').select('*', { count: 'exact', head: true });
  q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

async function main() {
  const now = new Date().toISOString();
  console.log(`=== PlantsPack Data Quality Report — ${now} ===\n`);

  // Active counts
  const active = await count(q => q.is('archived_at', null));
  const archived = await count(q => q.not('archived_at', 'is', null));
  const dupArchived = await count(q => q.not('archived_at', 'is', null).like('archived_reason', 'duplicate%'));
  console.log(`PLACES`);
  console.log(`  active:               ${active.toLocaleString()}`);
  console.log(`  archived:             ${archived.toLocaleString()}`);
  console.log(`  archived as dupes:    ${dupArchived.toLocaleString()}`);

  // Vegan level distribution
  console.log(`\nVEGAN LEVEL DISTRIBUTION (active)`);
  for (const lvl of ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']) {
    const n = await count(q => q.is('archived_at', null).eq('vegan_level', lvl));
    const pct = active ? Math.round(n / active * 1000) / 10 : 0;
    console.log(`  ${lvl.padEnd(20)} ${n.toString().padStart(6)} (${pct}%)`);
  }

  // Coverage metrics
  console.log(`\nCOVERAGE (active)`);
  const noDesc = await count(q => q.is('archived_at', null).or('description.is.null,description.eq.'));
  const noImg = await count(q => q.is('archived_at', null).is('main_image_url', null));
  const noWeb = await count(q => q.is('archived_at', null).is('website', null));
  const noPhone = await count(q => q.is('archived_at', null).is('phone', null));
  const noAddr = await count(q => q.is('archived_at', null).is('address', null));
  const noHours = await count(q => q.is('archived_at', null).is('opening_hours', null));
  console.log(`  missing description:  ${noDesc.toLocaleString()} (${active ? Math.round(noDesc / active * 1000) / 10 : 0}%)`);
  console.log(`  missing image:        ${noImg.toLocaleString()} (${active ? Math.round(noImg / active * 1000) / 10 : 0}%)`);
  console.log(`  missing website:      ${noWeb.toLocaleString()}`);
  console.log(`  missing phone:        ${noPhone.toLocaleString()}`);
  console.log(`  missing address:      ${noAddr.toLocaleString()}`);
  console.log(`  missing hours:        ${noHours.toLocaleString()}`);

  // Verification status
  console.log(`\nVERIFICATION`);
  const verified = await count(q => q.is('archived_at', null).eq('is_verified', true));
  const pending = await count(q => q.eq('verification_status', 'pending'));
  console.log(`  verified:             ${verified.toLocaleString()}`);
  console.log(`  pending review:       ${pending.toLocaleString()}`);

  // Duplicate health (we want this to stay 0)
  const allActive: { source_id: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await sb.from('places').select('source_id').not('source_id', 'is', null).is('archived_at', null).range(from, from + 999);
    if (!data?.length) break;
    allActive.push(...(data as any));
    if (data.length < 1000) break;
    from += 1000;
  }
  const sidCounts = new Map<string, number>();
  for (const p of allActive) sidCounts.set(p.source_id, (sidCounts.get(p.source_id) ?? 0) + 1);
  const sidDupes = [...sidCounts.values()].filter(n => n > 1).length;
  console.log(`\nDEDUP HEALTH`);
  console.log(`  active source_id rows:    ${allActive.length.toLocaleString()}`);
  console.log(`  source_id dupes:          ${sidDupes} (should be 0; UNIQUE INDEX enforces)`);
  console.log(`  total slug aliases:       ${(await sb.from('place_slug_aliases').select('*', { count: 'exact', head: true })).count?.toLocaleString() ?? '?'}`);

  // Reports queue
  const openReports = (await sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')).count ?? 0;
  console.log(`\nREPORTS QUEUE`);
  console.log(`  open reports:         ${openReports}`);

  // Reviews
  const totalReviews = (await sb.from('place_reviews').select('*', { count: 'exact', head: true }).is('deleted_at', null)).count ?? 0;
  console.log(`\nREVIEWS`);
  console.log(`  total active:         ${totalReviews}`);

  console.log(`\n=== end report ===`);
}

main().catch(console.error);
