/**
 * Enrich animal sanctuaries and vegan stays with images from their websites.
 * Fetches og:image or first large image from each place's website.
 *
 * Usage: npx tsx scripts/enrich-sanctuary-images.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TIMEOUT = 12000;
const CONCURRENCY = 5;

/** Fetch HTML with timeout and basic error handling */
async function fetchHTML(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Resolve a potentially relative URL against a base */
function resolveUrl(src: string, baseUrl: string): string | null {
  try {
    if (src.startsWith('data:') || src.startsWith('blob:')) return null;
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

/** Extract the best image URL from HTML */
function extractImage(html: string, baseUrl: string): string | null {
  // 1. Try og:image
  const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i);
  if (ogMatch) {
    const resolved = resolveUrl(ogMatch[1], baseUrl);
    if (resolved) return resolved;
  }

  // 2. Try twitter:image
  const twMatch = html.match(/<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i);
  if (twMatch) {
    const resolved = resolveUrl(twMatch[1], baseUrl);
    if (resolved) return resolved;
  }

  // 3. Find first img with reasonable dimensions or class hints
  const imgTags = html.match(/<img\s[^>]+>/gi) || [];
  for (const tag of imgTags) {
    // Skip tiny images (icons, trackers)
    const widthMatch = tag.match(/width=["']?(\d+)/i);
    const heightMatch = tag.match(/height=["']?(\d+)/i);
    if (widthMatch && parseInt(widthMatch[1]) < 200) continue;
    if (heightMatch && parseInt(heightMatch[1]) < 150) continue;

    // Skip common non-content images
    if (/logo|icon|avatar|badge|sprite|pixel|tracking/i.test(tag)) continue;

    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      const resolved = resolveUrl(srcMatch[1], baseUrl);
      if (resolved && /\.(jpg|jpeg|png|webp)/i.test(resolved)) return resolved;
    }
  }

  // 4. Fallback: any img with a reasonable src
  for (const tag of imgTags) {
    if (/logo|icon|avatar|badge|sprite|pixel|tracking/i.test(tag)) continue;
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      const resolved = resolveUrl(srcMatch[1], baseUrl);
      if (resolved && /\.(jpg|jpeg|png|webp)/i.test(resolved)) return resolved;
    }
  }

  return null;
}

/** Process a batch of places concurrently */
async function processBatch(places: any[]): Promise<{ updated: number; failed: string[] }> {
  let updated = 0;
  const failed: string[] = [];

  // Process in chunks
  for (let i = 0; i < places.length; i += CONCURRENCY) {
    const chunk = places.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async (place) => {
        // Skip Facebook/Instagram - can't scrape
        if (/facebook\.com|instagram\.com/i.test(place.website)) {
          console.log(`  SKIP (social): ${place.name}`);
          failed.push(`${place.name} (social media URL)`);
          return;
        }

        const html = await fetchHTML(place.website);
        if (!html) {
          console.log(`  FAIL (fetch): ${place.name} — ${place.website}`);
          failed.push(`${place.name} (fetch failed)`);
          return;
        }

        const imageUrl = extractImage(html, place.website);
        if (!imageUrl) {
          console.log(`  FAIL (no img): ${place.name} — ${place.website}`);
          failed.push(`${place.name} (no image found)`);
          return;
        }

        const { error } = await sb.from('places').update({
          images: [imageUrl],
          main_image_url: imageUrl,
        }).eq('id', place.id);

        if (error) {
          console.log(`  ERR (db): ${place.name} — ${error.message}`);
          failed.push(`${place.name} (db error)`);
        } else {
          console.log(`  OK: ${place.name} → ${imageUrl.slice(0, 80)}...`);
          updated++;
        }
      })
    );
  }

  return { updated, failed };
}

async function main() {
  console.log('═══ Enriching places with images from websites ═══\n');

  // 1. Animal sanctuaries
  const { data: sanctuaries } = await sb
    .from('places')
    .select('id, name, website, images, tags')
    .eq('category', 'organisation')
    .contains('tags', ['animal sanctuary'])
    .not('website', 'is', null);

  const sanctuariesNeedImages = (sanctuaries || []).filter(
    s => s.website && (!s.images || s.images.length === 0)
  );
  console.log(`Animal sanctuaries needing images: ${sanctuariesNeedImages.length}\n`);

  const sResult = await processBatch(sanctuariesNeedImages);

  // 2. Vegan stays
  const { data: stays } = await sb
    .from('places')
    .select('id, name, website, images, tags')
    .eq('category', 'hotel')
    .contains('tags', ['vegan stay'])
    .not('website', 'is', null);

  const staysNeedImages = (stays || []).filter(
    s => s.website && (!s.images || s.images.length === 0)
  );
  console.log(`\nVegan stays needing images: ${staysNeedImages.length}\n`);

  const hResult = await processBatch(staysNeedImages);

  // Summary
  console.log('\n═══ SUMMARY ═══');
  console.log(`Sanctuaries: ${sResult.updated}/${sanctuariesNeedImages.length} updated`);
  console.log(`Stays: ${hResult.updated}/${staysNeedImages.length} updated`);
  const totalFailed = [...sResult.failed, ...hResult.failed];
  if (totalFailed.length > 0) {
    console.log(`\nFailed (${totalFailed.length}):`);
    totalFailed.forEach(f => console.log(`  - ${f}`));
  }
}

main().catch(console.error);
