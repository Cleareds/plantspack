/**
 * Import animal sanctuaries and vegan stays into places table
 * Usage: npx tsx scripts/import-sanctuaries-stays.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

function toSlug(name: string) {
  return name.replace(/&amp;/g, 'and').replace(/&/g, 'and').replace(/'/g, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const { data: admin } = await sb.from('users').select('id').eq('role', 'admin').limit(1).single();
  if (!admin) { console.log('No admin user'); return; }

  // Get existing place names for dedup
  const { data: existing } = await sb.from('places').select('name');
  const existingNames = new Set((existing || []).map(p => p.name?.toLowerCase()));

  // Import sanctuaries
  const sanctuaries = JSON.parse(readFileSync('scripts/animal-sanctuaries.json', 'utf-8'));
  console.log(`\n═══ Importing ${sanctuaries.length} animal sanctuaries ═══\n`);
  let sImported = 0;
  for (const s of sanctuaries) {
    if (existingNames.has(s.name?.toLowerCase())) {
      console.log(`  SKIP (exists): ${s.name}`);
      continue;
    }
    const { error } = await sb.from('places').insert({
      name: s.name,
      description: s.description,
      category: 'organisation',
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.address || '',
      city: s.city || '',
      country: s.country || '',
      website: s.website || null,
      vegan_level: s.vegan_level || 'fully_vegan',
      source: 'web_research',
      tags: ['animal sanctuary', 'farm sanctuary', 'rescue'],
      slug: toSlug(s.name),
      created_by: admin.id,
      images: [],
    });
    if (error) console.log(`  ERR: ${s.name.slice(0, 40)} — ${error.message}`);
    else { console.log(`  ✅ ${s.name} (${s.country})`); sImported++; }
  }

  // Import vegan stays
  const stays = JSON.parse(readFileSync('scripts/vegan-stays.json', 'utf-8'));
  console.log(`\n═══ Importing ${stays.length} vegan stays ═══\n`);
  let hImported = 0;
  for (const h of stays) {
    if (existingNames.has(h.name?.toLowerCase())) {
      console.log(`  SKIP (exists): ${h.name}`);
      continue;
    }
    const subcatTag = h.subcategory?.replace('vegan_', '') || 'hotel';
    const { error } = await sb.from('places').insert({
      name: h.name,
      description: h.description,
      category: 'hotel',
      latitude: h.latitude,
      longitude: h.longitude,
      address: h.address || '',
      city: h.city || '',
      country: h.country || '',
      website: h.website || null,
      vegan_level: h.vegan_level || 'vegan_friendly',
      source: 'web_research',
      tags: ['vegan stay', subcatTag, 'accommodation'],
      slug: toSlug(h.name),
      created_by: admin.id,
      images: [],
    });
    if (error) console.log(`  ERR: ${h.name.slice(0, 40)} — ${error.message}`);
    else { console.log(`  ✅ ${h.name} (${h.country})`); hImported++; }
  }

  console.log(`\n═══ DONE ═══`);
  console.log(`Sanctuaries: ${sImported}/${sanctuaries.length}`);
  console.log(`Stays: ${hImported}/${stays.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
