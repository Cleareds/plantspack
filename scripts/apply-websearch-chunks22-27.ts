import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 22
  { id: '1e0d993f-aab8-402f-8da1-02363bba418d', verdict: 'fully_vegan' }, // Nucleus Raw Foods Luzerne
  { id: '1e147ffc-3b2f-4823-b932-a1957c1cf8b6', verdict: 'fully_vegan' }, // Tofu An Binyamina Israel
  { id: '1e59665f-8597-4dc7-8a6a-4a6361732931', verdict: 'fully_vegan' }, // Tripperia Vegana TAN8 Florence
  { id: '1eac0b58-3cb6-4d78-96e4-bcae714a7b29', verdict: 'fully_vegan' }, // Peace Street Bakery Cincinnati
  { id: '1ec6a120-359e-4996-a9c6-ade52f372d7e', verdict: 'fully_vegan' }, // Fast and Vegan Bolivia
  { id: '1f0c000d-a2dc-4d00-b423-736ff66ac6e8', verdict: 'fully_vegan' }, // Cupcakes and Shhht London
  { id: '1e041f0c-d1dc-4235-89d8-6bd3e5e10d86', verdict: 'not_fully_vegan' }, // Trinatura Caracas - vegetarian
  { id: '1e14b206-6488-417a-abba-8214d0f9ac6b', verdict: 'not_fully_vegan' }, // Maria Doceu - non-vegan options
  { id: '1e462ab0-6f49-4f3e-a71a-e1655d15b687', verdict: 'not_fully_vegan' }, // Al's Dorado See-Kiosk - hot dogs
  { id: '1e637af8-244c-4ac1-a40d-d28edd088847', verdict: 'not_fully_vegan' }, // Le Bateleur - Michelin meat/seafood
  { id: '1e1afffe-c640-4cdc-b80e-482e135f66a2', verdict: 'closed' }, // LOVJuice Boca Raton
  { id: '1e8280e7-ae18-4463-b922-79378507fa72', verdict: 'closed' }, // Purely Simple Raw Westerville
  // Chunk 23
  { id: '1f4f7477-15b0-45e6-a0f1-12ee4a4c9082', verdict: 'fully_vegan' }, // The Vegan Fairies Nea Erythraia
  { id: '1f5fd853-51d0-4780-941c-f3f34044e8c4', verdict: 'fully_vegan' }, // Organic Livity London
  { id: '1f7a95b4-f53c-4d7e-9a7f-7796de321262', verdict: 'fully_vegan' }, // Meng Kee Vegetarian Ipoh
  { id: '1f8f1794-91c0-4e0d-9572-e5388cb969c3', verdict: 'fully_vegan' }, // Guna Vegan São Paulo
  { id: '1fdb1fbe-00df-4f4d-98bf-deba9410ae74', verdict: 'fully_vegan' }, // El Bajón Vegano Tulum
  { id: '1ff72de6-e02f-4b91-980e-10cacb58f172', verdict: 'fully_vegan' }, // Ocean Jade Health Retreat
  { id: '200b04df-ae0d-492c-a3e5-f2ce7f09d915', verdict: 'fully_vegan' }, // Cafe Ren Kamigyo Kyoto
  { id: '2023add4-af96-4ba8-a4eb-31e0dd396b71', verdict: 'fully_vegan' }, // Chay Tâm An Vietnam
  { id: '204a79fa-4214-4751-9fed-0b6f32676ab9', verdict: 'fully_vegan' }, // Sustainable Sustenance Maine
  { id: '1f47d319-d03f-4744-959d-025d3b4b35cc', verdict: 'closed' }, // Floret Vegan Kitchen Glendale
  // Chunk 24
  { id: '20c10d4b-df6c-4235-b89b-ae1c63d30c39', verdict: 'fully_vegan' }, // Umamitu Warsaw
  { id: '20dfc496-29c7-44a2-a625-ecb5ffc257e3', verdict: 'fully_vegan' }, // Nhà Hàng Chay Bach Thao
  { id: '2141b2e1-6c6a-4b2f-af76-e908672fce0e', verdict: 'fully_vegan' }, // Y la Vaca Chocha Buenos Aires
  { id: '21dbec62-56f4-4fe1-a5d0-4dab0fc63595', verdict: 'not_fully_vegan' }, // Nepal Haus Berlin - serves meat
  { id: '20704bcb-7914-47c1-a1a7-550de8c988a2', verdict: 'closed' }, // Changing Seasons Personal Chef Asheville
  { id: '20aafe52-3522-42d8-8bb8-ee9374387121', verdict: 'closed' }, // New Leaf Elementals Tampa
  { id: '21409d38-c7fc-48f1-955d-afc9b867c2fa', verdict: 'closed' }, // Sunset Moon Wellness Center Bryn Mawr
  // Chunk 25
  { id: '2236521d-8506-4d27-814c-3a0a10719dc7', verdict: 'fully_vegan' }, // Emvassy Davao City
  { id: '226f7a8e-fadd-43ac-853c-38156b23daab', verdict: 'fully_vegan' }, // Çiğköftem Amsterdam
  { id: '235ffcaa-8935-49a9-a69e-03fea5eb6e52', verdict: 'fully_vegan' }, // Vegan Brunch Riga
  { id: '22ced9ba-577f-4e7e-9fba-6845c5a21150', verdict: 'not_fully_vegan' }, // Sri Kumari Kanyakumari - dairy
  { id: '23085cc3-0fe8-4ddb-958b-21ec1dea9006', verdict: 'not_fully_vegan' }, // Coney 1871 Wismar - meat hot dogs
  { id: '232d9113-eba6-49c7-a863-037a5b7c8e77', verdict: 'not_fully_vegan' }, // Prahok Noodle Siem Reap - fish
  { id: '236ac165-b3b7-48b5-97c7-9a43e5f5040d', verdict: 'not_fully_vegan' }, // Hoagie Bros - meat sandwiches
  { id: '220d2b63-e513-41ef-a598-c45d92a74b82', verdict: 'closed' }, // Veni Vedi Vegi Berlin
  { id: '228f3efb-f797-480e-bd9a-ba51537dfcba', verdict: 'closed' }, // Umah VG Denpasar
  // Chunk 26
  { id: '23723a7d-377e-4940-a2e7-72ce25fd0df2', verdict: 'fully_vegan' }, // Loving Hut/BODHI Leuven
  { id: '237c0853-4c73-46c0-bef7-6edf807c488b', verdict: 'fully_vegan' }, // Shakti Beer Sheva
  { id: '24403b83-53aa-4184-8d9a-62d21094253c', verdict: 'fully_vegan' }, // El Hogar Animal Sanctuary Vic
  { id: '249b8b94-ed48-42cf-b4fd-1e54e84843af', verdict: 'fully_vegan' }, // Çiğköfteci Ömer Schaerbeek
  { id: '24ed3875-0773-4d0f-8d8d-cfc26eb4bcf8', verdict: 'fully_vegan' }, // Çiğköftem Karlsruhe
  { id: '2508ba67-2b3f-41f1-8830-025d8d3f237d', verdict: 'fully_vegan' }, // EatHappy Vegan Oslo
  { id: '24ba4c6b-ad25-4b3b-85c0-1dcf3917bb92', verdict: 'closed' }, // eden-a vegan cafe Scranton
  { id: '24c2342b-19a0-4977-9dfe-bcc5bade4182', verdict: 'closed' }, // Screaming Carrots Hallandale Beach
  // Chunk 27
  { id: '2528a951-5c54-438e-b3f7-042ca91181bc', verdict: 'fully_vegan' }, // Taco Sin Karma Pasadena
  { id: '25455453-2fb3-4bb4-acc5-7961562a99e6', verdict: 'fully_vegan' }, // 維根素食 Tainan
  { id: '25672821-8988-47e7-9f53-7d3ea85c983f', verdict: 'fully_vegan' }, // Coven Plant Based Hamilton
  { id: '25f040db-3407-4eb2-ba27-a4054309ac3e', verdict: 'fully_vegan' }, // Fire and Earth Kitchen Shoreline
  { id: '262476fa-58f4-4b25-afbd-e5bdf44eaafc', verdict: 'fully_vegan' }, // Loving Hut Prague
  { id: '257330e2-9bb9-48bc-ad38-70802f90555e', verdict: 'not_fully_vegan' }, // MELT Crêperie Berlin - eggs/dairy
  { id: '257f4d17-adb8-428a-ab3c-1b7398c50f6e', verdict: 'not_fully_vegan' }, // New Marwadi Restaurant Pokhara - dairy
  { id: '252db278-2389-4e2d-b6dc-45499d6eaccc', verdict: 'closed' }, // Sol Veggie Logrono
  { id: '25ac3eb1-3090-4536-bc9c-0a624d166a58', verdict: 'closed' }, // Lucky Veg Shanghai
  { id: '25d8647c-4053-4c58-95e1-344eaf1bda8a', verdict: 'closed' }, // Veganoteca Barcelona
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
