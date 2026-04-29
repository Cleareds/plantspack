import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const verdicts: Array<{ id: string; verdict: string }> = [
  { id: '08cb7c2f-dd9b-4cb0-b038-5b6437463d67', verdict: 'fully_vegan' }, // Vegans Café Kyoto
  { id: '08d56745-e35f-48c8-ba9b-20d40a020b2b', verdict: 'fully_vegan' }, // OrganicRaw8Cafe Osaka
  { id: '09813abc-de4d-44a6-aa89-862810007123', verdict: 'fully_vegan' }, // Simple Plant Bantul
  { id: '0985ca33-884e-4c72-872b-11ae506033b3', verdict: 'fully_vegan' }, // Thunbergs Copenhagen
  { id: '0994b7d1-734c-4d4d-b57b-acff79f5c77f', verdict: 'fully_vegan' }, // Kreatief Hair & Beauty
  { id: '0994f472-7f29-4b4a-b622-7d8121f85b7c', verdict: 'fully_vegan' }, // Çiğ Köftecisi Ghent
  { id: '0984557d-ac2f-49d8-b4c6-70ecb6256645', verdict: 'not_fully_vegan' }, // Sachsische Eismanufaktur
  { id: '098f1cd1-0a52-4739-bbe9-034e9d525ce6', verdict: 'not_fully_vegan' }, // Arborfield Sanctuary
  { id: '08d31d4e-3315-4ff0-840f-b026d670f969', verdict: 'closed' }, // The Stand Norwalk
  { id: '08d52846-fbdc-4ec2-bc8f-7380d8192a0b', verdict: 'closed' }, // The Vegan Cafe Houston
  { id: '08e8f0a4-d3c0-494c-b454-88f8c3a155ec', verdict: 'closed' }, // Unity Cafe Phoenix
  { id: '096d2150-21ff-4d00-9852-2608336649d0', verdict: 'closed' }, // Brunch Bird Austin
  { id: '098f4920-3f30-4a6a-ab80-f046b4075809', verdict: 'closed' }, // The Squeeze Manhattan
  { id: '09d4a72f-1863-4d10-9930-f9c9119d63aa', verdict: 'closed' }, // Earthly Kitchen Costa Rica
];

async function main() {
  let confirmed = 0, flagged = 0, closed = 0;
  for (const { id, verdict } of verdicts) {
    const { data: place } = await sb.from('places').select('id, name, tags').eq('id', id).single();
    if (!place) { console.log(`Not found: ${id}`); continue; }
    const tags: string[] = [...(place.tags || [])];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (verdict === 'fully_vegan') {
      if (!tags.includes('websearch_confirmed_vegan')) tags.push('websearch_confirmed_vegan');
      updates.tags = tags; updates.verification_status = 'scraping_verified'; confirmed++;
    } else if (verdict === 'not_fully_vegan') {
      if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag');
      updates.tags = tags; flagged++;
    } else if (verdict === 'closed') {
      if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed');
      updates.tags = tags; closed++;
    }
    const { error } = await sb.from('places').update(updates).eq('id', id);
    if (error) console.error(`  Error ${place.name}: ${error.message}`);
    else process.stdout.write(verdict === 'fully_vegan' ? '✓' : verdict === 'closed' ? '✗' : '⚠');
  }
  console.log(`\nDone: ${confirmed} confirmed, ${flagged} flagged, ${closed} closed.`);
}

main().catch(console.error);
