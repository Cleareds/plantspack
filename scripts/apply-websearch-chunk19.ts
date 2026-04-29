import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  { id: '198a7a56-2ba9-4807-b319-5e979db369b3', verdict: 'fully_vegan' }, // Donald Watson's Vegan Bar Leicester
  { id: '19ff3dd6-be1b-448c-bdbc-946eb2a8cfe1', verdict: 'fully_vegan' }, // Universo Vegano Verona
  { id: '1a3a674e-74da-43a4-ae39-08ba62a4a3c6', verdict: 'fully_vegan' }, // Izzi B's Cupcakes Norwalk
  { id: '1aba0692-5b5e-4aa5-8edc-22be8ed67b6f', verdict: 'fully_vegan' }, // The Veggie Table Beijing
  { id: '1b2b4380-ba74-4686-ad77-ab866ba5968d', verdict: 'fully_vegan' }, // Babette's Garden Berlin
  { id: '1b2d4d0a-cc76-4ebe-8c6a-b046ff6648ec', verdict: 'fully_vegan' }, // Au Lac Fountain Valley
  { id: '1a5742ea-93b8-4cfe-8054-a7848ef4b105', verdict: 'not_fully_vegan' }, // Cafe Buffi Bernried - Bavarian food
  { id: '199f0be8-5176-4ffd-a463-00a9460d75bd', verdict: 'closed' }, // Saboro Comida Consciente
  { id: '1a7678a9-428b-4e9f-af9a-08c5008c14bb', verdict: 'closed' }, // Mi Vegana Madre Glendale
  { id: '1b269e89-f139-4394-ae9e-2f79b40bde65', verdict: 'closed' }, // Vegan with Joy Rancho Cucamonga
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
