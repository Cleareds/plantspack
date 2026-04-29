import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 11
  { id: '0f07d6c6-a249-408e-9868-d1e4121474b2', verdict: 'fully_vegan' }, // Gustavo Lyon
  { id: '0f6b7a9a-e46a-407f-bada-c59b20d75ae0', verdict: 'fully_vegan' }, // Jammin Vegan Costa Rica
  { id: '0fc9807e-ac4f-4781-9628-b0e1351f88b5', verdict: 'fully_vegan' }, // Loving Hut Prague
  { id: '0fd4d984-77cc-42a4-b55e-6ffbec7096c0', verdict: 'fully_vegan' }, // The Veggie Grill W. Hollywood
  { id: '0fe76d58-1cf8-47ad-83ef-eb5eecd8d31d', verdict: 'fully_vegan' }, // Liberación Cocina Vegana
  { id: '1074e3b3-f72b-447a-8696-c6587377bc9b', verdict: 'fully_vegan' }, // Meşhur Adıyaman Çiğ Köftecisi
  { id: '107eb3d7-6869-4e4b-8c9f-9f949fc7449e', verdict: 'fully_vegan' }, // Yamiyomil Seoul
  { id: '1090676e-3f7f-40d3-a05c-6f97465a4ea1', verdict: 'not_fully_vegan' }, // Karunia Baru Bogor
  { id: '0f5cace4-5ba7-450e-a153-63e3ea57fe47', verdict: 'closed' }, // Verite Catering Chicago
  { id: '0f754f6e-4b3a-4e61-938d-7fd8da8320b3', verdict: 'closed' }, // Pomegranate LA
  { id: '106a1954-0343-4722-9bb0-61fad463e7c3', verdict: 'closed' }, // Gnome Cafe Charleston
  { id: '107cf623-101d-4eb5-b22a-dd5d1505a155', verdict: 'closed' }, // Nha Hang Chay Houston
  // Chunk 12
  { id: '11349617-357f-4839-8fe6-2417192eed6d', verdict: 'fully_vegan' }, // Nhà Hàng Chay Sân Mây
  { id: '1172bb2f-b6e2-4cf4-b25d-29ec6eaa59f5', verdict: 'fully_vegan' }, // Veggie Grill LA
  { id: '117db3a7-1ca3-46a5-9fc1-43d706de2b7b', verdict: 'fully_vegan' }, // Breathe Montorgueil Paris
  { id: '1192e373-e77a-496d-a7d5-90258a6c2069', verdict: 'fully_vegan' }, // Eighth Day Manchester
  { id: '11b00b00-a2aa-4f33-a0a4-eb93c492e9ca', verdict: 'fully_vegan' }, // Super Soya Querétaro
  { id: '1198c760-892b-4dd7-ad3b-a0794d676085', verdict: 'not_fully_vegan' }, // Döner La Fiesta Leipzig
  { id: '11a12b5f-8ce9-4919-a742-183ae5116741', verdict: 'not_fully_vegan' }, // Chifa & Thai Bolivia
  { id: '11f5183f-924f-4f91-a1ed-3a0ce4ba618a', verdict: 'closed' }, // Jack's Bean Seoul
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
    if (error) console.error(`Error ${place.name}: ${error.message}`);
    else process.stdout.write(verdict === 'fully_vegan' ? '✓' : verdict === 'closed' ? '✗' : '⚠');
  }
  console.log(`\nDone: ${confirmed} confirmed, ${flagged} flagged, ${closed} closed.`);
}
main().catch(console.error);
