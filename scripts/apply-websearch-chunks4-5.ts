import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 4 (places 60-74)
  { id: '06105376-af40-45c3-91c2-f5b0ac4f0df1', verdict: 'fully_vegan' }, // Wingbean Asheville
  { id: '0678e312-b0ed-4168-b639-b84ffb66ebec', verdict: 'fully_vegan' }, // Vegan Bali
  { id: '0683a553-bc46-46be-a767-bd64572273f9', verdict: 'fully_vegan' }, // Cocoëlle Besançon
  { id: '0693fef7-014c-4926-9e55-33124036f0aa', verdict: 'fully_vegan' }, // Magias da Terra Brazil
  { id: '06a41d11-3136-42ca-a62c-b5c2adbe1731', verdict: 'fully_vegan' }, // Chu Minh Seattle
  { id: '061bc2a3-2e21-4847-a7d1-262a900ffed4', verdict: 'not_fully_vegan' }, // Ari Food kebab
  { id: '067312c6-cd64-4852-9a25-0d9c27d2e48a', verdict: 'not_fully_vegan' }, // Volta-Garten Greek
  { id: '0680b059-1a3d-4001-87e7-e4bdf1a63e8c', verdict: 'not_fully_vegan' }, // Çiğköftem (has dairy)
  { id: '0686ae93-1b41-4df9-b863-6be96d553b94', verdict: 'not_fully_vegan' }, // Kross Kebap Essen

  // Chunk 5 (places 75-89)
  { id: '06dc6c70-f4e9-4c46-8f8b-310ea0e19540', verdict: 'fully_vegan' }, // VeganLand Çiğköfte
  { id: '06dee1de-f709-45b5-adee-ad2d630f10a2', verdict: 'fully_vegan' }, // Leo's Vegan Cafe
  { id: '06ffe1a7-35ce-407c-95a4-b12635914506', verdict: 'fully_vegan' }, // Tofu An Israel
  { id: '071e4336-3c0c-49e9-89d3-403aabebcf2f', verdict: 'fully_vegan' }, // Вега-маркет Ukraine
  { id: '07945599-b25d-4415-84b1-2359366bf41b', verdict: 'fully_vegan' }, // Imagine Vegan Memphis
  { id: '07c975c0-2546-4f88-9166-41cceb39e083', verdict: 'fully_vegan' }, // Rekalibracija Novi Sad
  { id: '08baf1c6-62b9-4b3a-affa-70e84ad7a794', verdict: 'fully_vegan' }, // Olive Wood BnB Australia
  { id: '07a899c5-620e-4aaf-844b-f8a54dead99d', verdict: 'not_fully_vegan' }, // Eis Mosena dairy
  { id: '07483e48-eb89-482d-8f95-4f9fb8fc1e92', verdict: 'closed' }, // Phoenix Garden closed
  { id: '082c013c-b7cf-459a-9b83-6951feaf47c0', verdict: 'closed' }, // Soul R. Vegan Café closed
  { id: '0868b9d0-a9e3-4f13-8d04-3959d0c62ca9', verdict: 'closed' }, // Planty Sweet closed
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
      updates.tags = tags;
      updates.verification_status = 'scraping_verified';
      confirmed++;
    } else if (verdict === 'not_fully_vegan') {
      if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag');
      updates.tags = tags;
      flagged++;
    } else if (verdict === 'closed') {
      if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed');
      updates.tags = tags;
      closed++;
    }

    const { error } = await sb.from('places').update(updates).eq('id', id);
    if (error) console.error(`  Error ${place.name}: ${error.message}`);
    else console.log(`  [${verdict}] ${place.name}`);
  }
  console.log(`\nDone: ${confirmed} confirmed, ${flagged} flagged, ${closed} closed.`);
}

main().catch(console.error);
