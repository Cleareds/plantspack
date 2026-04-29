import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 7
  { id: '09ef51fc-685b-42f2-ba31-a7b5bc7af770', verdict: 'fully_vegan' }, // Allegro Bakery Pittsburgh
  { id: '0a202bfc-fe66-453a-a9be-f5032c3f4a2c', verdict: 'fully_vegan' }, // Great Lakes Tokyo
  { id: '0ab8d613-83ff-486a-889f-16fb51fd7ab4', verdict: 'fully_vegan' }, // Trivoli Ilioupoli
  { id: '09f7fcf2-c87f-44aa-9b34-0cf85e1a4a3b', verdict: 'not_fully_vegan' }, // Кринг Sofia - vegetarian
  { id: '0a402e4c-9815-45f0-88f2-ac9c19f15d34', verdict: 'not_fully_vegan' }, // Himalaya Imbiss - meat
  { id: '0ad5b90b-af01-4643-a7dc-e958895fd74a', verdict: 'not_fully_vegan' }, // Kebab Orient meat
  { id: '0ade6df2-4c91-4c8b-b8d8-627ae42d5b4e', verdict: 'not_fully_vegan' }, // Dublin Chicken and Rice
  { id: '0ad63def-17b5-48b1-8db2-cc6deab3336b', verdict: 'closed' }, // Perrybrook Foods Manhattan
  { id: '0aef2cf4-7867-48e1-b94d-ca7bf531933c', verdict: 'closed' }, // Vegan Recipe Cafe Malaysia
  // Chunk 8
  { id: '0affe42e-95e2-49a4-9d46-00a260a33e17', verdict: 'fully_vegan' }, // Leo's Superfood Bakery
  { id: '0b18a9e8-896c-4708-bb8b-70726e84b54c', verdict: 'fully_vegan' }, // Romeo and Vero Cape Town
  { id: '0b51bd5a-64ab-410a-beed-a137b6e61516', verdict: 'fully_vegan' }, // CapHe Fort Bragg
  { id: '0b9a2a9b-239d-454a-a18e-3d6e1782e218', verdict: 'fully_vegan' }, // Green Borders London
  { id: '0b030688-9ccf-491c-a664-77ced12f99e8', verdict: 'not_fully_vegan' }, // Atman Kafe eggs/dairy
  { id: '0b6d5168-0538-452a-b1aa-1ff741f10b70', verdict: 'not_fully_vegan' }, // Menta Bar vegetarian
  { id: '0b767cb4-860d-4c82-8799-41255d79dfed', verdict: 'not_fully_vegan' }, // Raw Vegan Bakery Bucharest dairy
  { id: '0b991ec1-d43f-4844-9513-244f88b901d6', verdict: 'not_fully_vegan' }, // The Drift Inn seafood
  { id: '0bd2a8ce-ba17-4387-8697-390e977c890e', verdict: 'not_fully_vegan' }, // Çiğköftem Koblenz dairy
  { id: '0afe607e-0a22-4569-855c-85350e93c68c', verdict: 'closed' }, // House of the Sun
  { id: '0b0f8518-e70c-4776-9007-2d987ea29a8b', verdict: 'closed' }, // Ariya Organic Cafe
  // Chunk 9
  { id: '0c516574-22e3-4c12-9f05-d1a90bc2b676', verdict: 'fully_vegan' }, // Eateco Switzerland
  { id: '0c6b240c-e7dc-4d7d-b9a3-8aaf7c23290a', verdict: 'fully_vegan' }, // Por Siempre Vegana
  { id: '0c77f1c6-d5ce-4f6c-8b53-58790b329a1a', verdict: 'fully_vegan' }, // Deer Run BnB
  { id: '0cddf583-5b1b-4f2e-9260-95cc155afb95', verdict: 'fully_vegan' }, // Clementine Bakery Brooklyn
  { id: '0d107ec8-d57e-4481-9a03-5f091bc43c8a', verdict: 'fully_vegan' }, // Pura Vita Estepona
  { id: '0c5264fc-f682-4bff-a3f5-df5d0e589ae4', verdict: 'not_fully_vegan' }, // Döner City Berlin
  { id: '0c576086-2b47-4303-bad6-7f0767bd7573', verdict: 'not_fully_vegan' }, // Nina's Indian serves meat
  { id: '0c356f7e-4f34-445f-b143-c55b36effef3', verdict: 'closed' }, // Crazy Mae's closed
  { id: '0ce4e645-7549-4267-a6aa-aab2dbc097a7', verdict: 'closed' }, // No Tox Life closed
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
