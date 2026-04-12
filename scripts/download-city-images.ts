/**
 * Download Wikipedia city images and upload to Supabase Storage
 * Usage: npx tsx scripts/download-city-images.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BUCKET = 'city-images';

async function main() {
  await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const cityImages: Record<string, string> = JSON.parse(readFileSync('public/data/city-images.json', 'utf-8'));

  // Load progress file if exists (resume support)
  const progressFile = 'scripts/city-images-progress.json';
  let hosted: Record<string, string> = {};
  if (existsSync(progressFile)) {
    hosted = JSON.parse(readFileSync(progressFile, 'utf-8'));
    console.log(`Resuming: ${Object.keys(hosted).length} already done`);
  }

  const entries = Object.entries(cityImages);
  console.log(`Processing ${entries.length} city images...\n`);

  let downloaded = 0, failed = 0, skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const [key, wikiUrl] = entries[i];

    // Skip if already hosted
    if (hosted[key]) { skipped++; continue; }

    const slug = key.replace(/\|\|\|/g, '--').replace(/[^a-zA-Z0-9\-]/g, '_').toLowerCase();
    const fileName = `${slug}.jpg`;

    try {
      const res = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'PlantsPack/1.0 (https://plantspack.com; info@plantspack.com) city-image-mirror' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) { failed++; continue; }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) { failed++; continue; }

      const { error } = await sb.storage.from(BUCKET).upload(fileName, buffer, {
        contentType: 'image/jpeg', upsert: true,
      });

      if (error) { failed++; continue; }

      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(fileName);
      hosted[key] = urlData.publicUrl;
      downloaded++;
    } catch {
      failed++;
    }

    // Progress logging + save every 50
    if ((i + 1) % 50 === 0 || i === entries.length - 1) {
      console.log(`  [${i + 1}/${entries.length}] ${downloaded} ok, ${skipped} skip, ${failed} fail`);
      writeFileSync(progressFile, JSON.stringify(hosted));
    }

    // 1 second delay to respect Wikimedia rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ Done: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  console.log(`Total hosted: ${Object.keys(hosted).length}`);

  // Save final URLs
  writeFileSync('public/data/city-images.json', JSON.stringify(hosted, null, 2));
  writeFileSync(progressFile, JSON.stringify(hosted));
  console.log('Updated city-images.json with Supabase URLs');
}

main().catch(e => { console.error(e); process.exit(1); });
