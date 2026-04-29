import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 1 (places 15-29)
  { id: '01375a4f-3881-42df-b984-97038390d73b', verdict: 'fully_vegan' }, // Cortese Florence
  { id: '01410963-1fa7-44c8-be87-3acc96cb6fb7', verdict: 'fully_vegan' }, // Tian Ci Vegan Sydney
  { id: '0168a6b7-4d42-4df2-968d-288af8e3a472', verdict: 'fully_vegan' }, // Viriditas Oaxaca
  { id: '018472c3-8213-4f60-8f74-27d90939bfcf', verdict: 'fully_vegan' }, // Sanam Ging Thailand
  { id: '0204509d-8890-414c-8a1c-651c6f17ca0d', verdict: 'fully_vegan' }, // 上頂皇家素食水煎包 Taipei
  { id: '02b5c806-2216-4125-9aaf-e852f98a98a7', verdict: 'fully_vegan' }, // Ethical Threads
  { id: '03334615-8729-4b5b-9e67-fe35c171e4f2', verdict: 'fully_vegan' }, // Az RAW Food Meetup
  { id: '01dad500-f981-4056-9579-1590cb2fad02', verdict: 'not_fully_vegan' }, // Jollof Café Brighton
  { id: '02249b55-ac16-43f3-8815-1caf5b04af0f', verdict: 'not_fully_vegan' }, // Lê & Vi Erlangen
  { id: '02698328-9ec7-4bf5-afe4-60de958124a3', verdict: 'closed' }, // Vegan Life Shop Luxembourg

  // Chunk 2 (places 30-44)
  { id: '03509d53-57f8-4c70-9fc7-536e4f65ed70', verdict: 'fully_vegan' }, // Green Arts Coffee Ethiopia
  { id: '03578445-aebc-4ef3-b813-87851a559cdf', verdict: 'fully_vegan' }, // Energetic life Germany
  { id: '03753bbc-34a8-48c0-9ea9-9518ab8e5cda', verdict: 'fully_vegan' }, // Vegan Island Thailand
  { id: '03a0339c-966a-4570-a8e0-3b1f865857a4', verdict: 'fully_vegan' }, // Obuthan Busan
  { id: '03ce32a3-20cf-4451-80fb-d93f619a3ad6', verdict: 'fully_vegan' }, // Vegan Delivery Chile
  { id: '045477a1-0b85-4414-ae4a-bfaa790b2af2', verdict: 'fully_vegan' }, // Veganland Cigkofte Cologne
  { id: '048f2050-05e7-48c4-9e48-e378c238ce6f', verdict: 'fully_vegan' }, // Sabor de Zen Ecuador
  { id: '04d167b0-0df5-44d2-bb30-a4c8b77499f3', verdict: 'fully_vegan' }, // 養生素食 New Taipei
  { id: '04bb50b4-d713-4b0c-8e2e-6484c1901e48', verdict: 'not_fully_vegan' }, // Capoue Celtes dairy
  { id: '04bbf697-68c4-4abd-8f3c-be5c80eda0e4', verdict: 'not_fully_vegan' }, // IJssalon Vorst dairy
  { id: '03b1473f-568a-47e7-a32d-d7cfc037952b', verdict: 'closed' }, // Paradise Veg Burnaby

  // Chunk 3 (places 45-59)
  { id: '053dd82e-313f-415c-a1e8-fab722ced974', verdict: 'fully_vegan' }, // Sabor da Aldeia Brazil
  { id: '055fba54-a628-4f9b-9e02-9736db802571', verdict: 'fully_vegan' }, // Fresh & Tasty Bolivia
  { id: '056f4f9b-a1e0-4798-ad09-33f6f2ce01c8', verdict: 'fully_vegan' }, // El Chante Vegano Costa Rica
  { id: '0574fcb0-5e69-4c29-9e26-0b24820d8c1e', verdict: 'fully_vegan' }, // Loving Hut Express Gainesville
  { id: '05b8ff73-9e86-4a0f-990e-30f2b7ee9cdb', verdict: 'fully_vegan' }, // Café Frida Canada
  { id: '05bf47e4-5b0e-44eb-aac2-e167df5a53d1', verdict: 'fully_vegan' }, // Thallo Japan
  { id: '05c7cf43-df9e-45e4-8f14-a480aa0b7df4', verdict: 'fully_vegan' }, // Oses Cigkofte Germany
  { id: '05e4e808-ecc1-4020-8fca-34ba769d04e9', verdict: 'fully_vegan' }, // Bec & Geri's Philippines
  { id: '05fe6985-9310-4690-bc51-5ac90e036b10', verdict: 'fully_vegan' }, // Plant-a Greece
  { id: '05224fd7-aeb9-4ef9-a48c-a6048076a865', verdict: 'not_fully_vegan' }, // River Club Slovakia
  { id: '05897b67-03b4-40bd-ba91-33fb8af9823e', verdict: 'not_fully_vegan' }, // Echzeller Kebap Haus
  { id: '0545c9d9-6a43-4faf-85eb-7ed713597975', verdict: 'closed' }, // The Ranch Daily LA
  { id: '056b5f1b-093c-45f5-9ce5-cf75ee3bc619', verdict: 'closed' }, // Organilicious Boulder
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
