import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 10
  { id: '0d3258c3-0cc1-435a-bc63-91c19841979c', verdict: 'fully_vegan' }, // organ Sendai
  { id: '0debf847-deb0-4481-8ba2-76d2ee02d56b', verdict: 'fully_vegan' }, // San Viet Edinburgh
  { id: '0e0e036d-06c0-4007-aecc-c5bf0c72c8cb', verdict: 'fully_vegan' }, // Sopra la Panca Trento
  { id: '0e5fd3c2-8bde-4e41-b9f3-f3e6b01e3cf7', verdict: 'fully_vegan' }, // Yun Shan He Penang
  { id: '0e992749-95e0-4ee2-8c80-935e61494a91', verdict: 'fully_vegan' }, // Habesha Village Brixton
  { id: '0d3beecc-4b9b-45be-af0f-1c9659ed06c5', verdict: 'not_fully_vegan' }, // Le Majeur Nancy - meat/fish
  { id: '0dbdc105-a658-45b6-9cbf-47a84f840b3a', verdict: 'not_fully_vegan' }, // Nam Chew KL - Chinese coffee shop
  { id: '0dd5b508-b128-4d25-8489-9c629720c155', verdict: 'not_fully_vegan' }, // Eissalon Israel dairy
  { id: '0e627bb0-90e9-480c-887d-e10c56e2e1ba', verdict: 'not_fully_vegan' }, // Soulfood Koblenz - vegetarian
  { id: '0edcf99c-ac1e-4ebf-b3e2-094ae3a8619a', verdict: 'not_fully_vegan' }, // The Veg Hanoi - uses eggs
  // Chunk 13
  { id: '129edd60-e469-4122-9db8-b270acf51280', verdict: 'fully_vegan' }, // Ritzen Tsukuba
  { id: '12c7276d-dacc-48e7-8b27-6defa934a49d', verdict: 'fully_vegan' }, // The Veggie Grill LA
  { id: '12f48411-036f-49f6-8f01-d402a9a830ff', verdict: 'fully_vegan' }, // New Deli Venice CA
  { id: '12f7313f-399e-4d1d-9cce-166eec8f9b58', verdict: 'fully_vegan' }, // L'orto di Alice Italy
  { id: '13559925-9ded-4249-b4c0-b4ae5ae0fc33', verdict: 'fully_vegan' }, // Cúrcuma Argentina
  { id: '123b10aa-6f93-4a8c-947c-611d199d1188', verdict: 'not_fully_vegan' }, // Uncle Bing - non-vegan opts
  { id: '123f64a2-1b98-4c85-9533-e2cd74829d42', verdict: 'not_fully_vegan' }, // Paraiso Ecuador dairy
  { id: '12a5e16d-2bb8-4101-8491-87c074ca1a94', verdict: 'not_fully_vegan' }, // Tâm An Hanoi
  { id: '138a702a-d99c-4fd1-a3a3-0be71a70ae03', verdict: 'not_fully_vegan' }, // Grand Café Utopie - vegetarian
  { id: '124d64ba-0858-4925-81f8-7715811674cb', verdict: 'closed' }, // Ritual JuiceBox Laguna Beach
  { id: '12d32e7c-0cb0-44d0-b8c7-c65fa997a95a', verdict: 'closed' }, // Akemi Salon Portland
  // Chunk 14
  { id: '1476eafb-6366-410c-b455-76d25463b692', verdict: 'fully_vegan' }, // Chew Xin Jai Thailand
  { id: '14b3de90-4da3-4d94-af53-e738dbadb2eb', verdict: 'fully_vegan' }, // Tu Bi Vegan Hanoi
  { id: '14b5d2fb-3ded-4817-89e5-880e7f493d9f', verdict: 'fully_vegan' }, // Marla & Mathildas Germany
  { id: '13af5077-11af-4d17-a384-b14e10f75806', verdict: 'not_fully_vegan' }, // Anya Todd - not a restaurant
  { id: '13de61ca-9323-49b2-992f-59cbc28cacd0', verdict: 'not_fully_vegan' }, // Çığköftecısı - non-vegan sides
  { id: '13fc38b2-6de5-48d4-b99f-9c89d3545cb7', verdict: 'not_fully_vegan' }, // Busey Brews smokehouse
  { id: '1479b03b-1597-46dc-a47d-6324007e31f4', verdict: 'not_fully_vegan' }, // Cafe Einstein Ulm Bavarian
  { id: '14b4a3c8-58c5-4117-8d84-7ca55f41e25c', verdict: 'not_fully_vegan' }, // Urban Tadka Dubai dairy
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
