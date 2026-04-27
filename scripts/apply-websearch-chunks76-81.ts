import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 76
  { id: '623261fe-bf4f-4ca8-8c6e-ef1abeaff64b', verdict: 'fully_vegan' }, // Little Choc Apothecary NYC
  { id: '623e720a-92a0-463d-9f1e-6ca9fff44900', verdict: 'fully_vegan' }, // Grown Brisbane
  { id: '625e5c29-3f8f-42d1-833a-62ffc4b746c9', verdict: 'fully_vegan' }, // Centro Nutricional TAO Mexico City
  { id: '627671db-6d04-481b-a40e-fc0377566749', verdict: 'not_fully_vegan' }, // KR-eat Neu-Ulm - Greek meat restaurant
  { id: '6287b06b-9e47-4be4-9f8e-99660988b118', verdict: 'closed' }, // Cai Cafe London - confirmed closed
  { id: '628fcff7-979b-4acc-9fdf-27cac7fb5e8b', verdict: 'fully_vegan' }, // La Reinette Paris - 100% plant-based patisserie
  { id: '62e3c3e1-f085-4a7f-8a66-b38d32e61965', verdict: 'fully_vegan' }, // Minh Chay Vegan Restaurant Hanoi
  { id: '62e53424-26a4-421e-a3a5-1744c8aa7be2', verdict: 'not_fully_vegan' }, // Blue Boy Vegetarian KL - uses eggs
  { id: '631d75c7-729a-40ea-b3d3-57fb12a418fe', verdict: 'fully_vegan' }, // Zen Cat Gluten-Free Bakery Greensboro
  // Chunk 77
  { id: '6373b983-958d-47ab-96c6-dc8ffaa6a8f9', verdict: 'fully_vegan' }, // Bar Bombon Philadelphia
  { id: '63813b36-37ff-4aa1-bf99-4ea2a691029c', verdict: 'fully_vegan' }, // Simply Pure Las Vegas
  { id: '638cbf2b-7e40-430a-a822-79b2f5918b6d', verdict: 'fully_vegan' }, // Sweet Paradise Tenerife
  { id: '639deeca-b2c1-4a74-ab80-c384a943c4b3', verdict: 'fully_vegan' }, // Quan Chay Vietnamese - chay = vegan by definition
  { id: '63a53077-8c63-4ba5-8b82-24d477722f8d', verdict: 'fully_vegan' }, // Uno Yukiko Gion Kyoto
  { id: '63bc0fd6-3346-4335-a405-549f5b9cc9a3', verdict: 'not_fully_vegan' }, // Le Frigo Vert Montreal - co-op with dairy
  { id: '63bc31ef-9dac-4af3-8a4a-69540abba89f', verdict: 'closed' }, // Vegan Keuken Appingedam - HappyCow closed
  { id: '63bc5772-1844-4502-9e2d-29c37eb3918c', verdict: 'not_fully_vegan' }, // The Allotment Manchester - now includes dairy
  { id: '63c6d23c-7741-49d3-b7de-bd4acb66d70f', verdict: 'not_fully_vegan' }, // Бильярд-кафе Зелёная поляна Minsk - billiards cafe
  { id: '63c9bc69-4b38-4f07-88b9-da8dfbab5377', verdict: 'fully_vegan' }, // Jänön kioski Helsinki - Finland's first vegan kiosk
  { id: '63e18c92-3cbe-432b-be98-97d4006594a6', verdict: 'not_fully_vegan' }, // Athens Vegan Burgers - went vegetarian in 2023
  // Chunk 78
  { id: '6438f4e1-42bb-4e05-82e2-88ac71fc04d6', verdict: 'fully_vegan' }, // AloeVega Blagnac
  { id: '644094d9-08cc-42ee-8b33-c4ec261143bc', verdict: 'fully_vegan' }, // PLANTA Queen Chicago
  { id: '644cc9c0-9c0c-42ee-88c6-12a99309e193', verdict: 'fully_vegan' }, // Caribbean Style Vegan New Haven
  { id: '645045b7-73ca-4529-b99e-a86d923f3a3c', verdict: 'fully_vegan' }, // Pura Vegan Tamarindo
  { id: '64702bf1-31ec-4893-a08d-62f3a5c8e4cb', verdict: 'not_fully_vegan' }, // Ayush Veg Thrissur - uses dairy
  { id: '64b07151-2782-429e-b392-e0ddcfaade07', verdict: 'fully_vegan' }, // Lek and Greg Vegan Camp Li Thailand
  { id: '64df48bb-4fd8-495b-909a-fec6bf390383', verdict: 'fully_vegan' }, // Vegan Life II Kampar
  { id: '6503fc63-c184-4695-8ec3-6f5a7e270eec', verdict: 'closed' }, // Raphsodic Cooperative Bakery - closed March 2026
  { id: '6516359a-649b-4cda-984f-9137ccb5bcb5', verdict: 'fully_vegan' }, // Veganland Cigköfte Cologne
  { id: '65218520-f2bf-48e1-8c96-ac642f7779c8', verdict: 'not_fully_vegan' }, // Thildas Eis Darmstadt - dairy ice cream
  { id: '652fdb62-971d-4436-8c26-f1da9ef267c5', verdict: 'fully_vegan' }, // Sky High Shibuya
  { id: '6540d3e1-5420-431f-8cd0-38ca4c6740f2', verdict: 'not_fully_vegan' }, // Infernos Pizza Thorpe Park - standard buffet
  // Chunk 79
  { id: '65583c59-9385-4206-93fe-7cc4d6cd5fac', verdict: 'closed' }, // Manic Panic LA - clothing store, closed
  { id: '6581978a-fb05-405b-a980-bd9795fc2675', verdict: 'fully_vegan' }, // White Lotus Vientiane
  { id: '658223ed-5f13-4813-b171-54911ec55adf', verdict: 'not_fully_vegan' }, // Kristall Döner Nürnberg - meat doner
  { id: '659471b3-4bce-4611-8cab-3bd3b8865084', verdict: 'not_fully_vegan' }, // Eis Casal Ladbergen - dairy gelato
  { id: '65d53225-a687-4265-8a98-b4ee0ba41182', verdict: 'fully_vegan' }, // Soy Vida Bogota
  { id: '65d54029-ab79-4ce4-abd3-c7bac2271635', verdict: 'closed' }, // Champs Family Bakery Brooklyn - closed Jan 2023
  { id: '65d7bc18-29da-464f-8ed3-1fc882d4072e', verdict: 'closed' }, // Veganland Cigköfte Ratingen - confirmed closed
  { id: '65d7bfd5-baee-424d-aca2-8fc397143f59', verdict: 'fully_vegan' }, // River Green Cafe Norwich
  { id: '65dfb519-d41c-4b3b-95f9-7fb210bb9a69', verdict: 'not_fully_vegan' }, // Van Leeuwen Ice Cream - sells dairy
  { id: '66005411-941a-49cb-84e2-ddcf83f98a3c', verdict: 'not_fully_vegan' }, // Srignags House Derendingen - meat curries
  // Chunk 80
  { id: '660c9cb9-7142-424b-b884-de98209bba43', verdict: 'fully_vegan' }, // FLFL Centraal Utrecht
  { id: '660d8fd9-ea6d-4d96-adf0-bd1e4c2646cb', verdict: 'closed' }, // Vegetarian Butcher Ikebukuro - confirmed closed
  { id: '6637ab99-e767-4af5-af08-f58a5e3b7e2a', verdict: 'fully_vegan' }, // Der Süsse Schmidt Dresden
  { id: '665a048d-9786-4aeb-91da-36f5a8bb861c', verdict: 'fully_vegan' }, // Raw Food World Ojai
  { id: '665da9d2-47bc-4d6a-a7bc-31af0c987e49', verdict: 'fully_vegan' }, // PREM El Arte de Vivir Sucre
  { id: '6668c52c-20bf-4c73-ae53-22c543402bfa', verdict: 'fully_vegan' }, // Huacamole San Pedro Costa Rica
  { id: '66778690-8bc8-4d76-894c-7f3ffe819837', verdict: 'not_fully_vegan' }, // Tramezzini Stehcafe Munich - conventional bakery
  { id: '66813d9e-0cad-4288-af37-39505b99703c', verdict: 'fully_vegan' }, // Cisu Vegan House Hanover MD
  { id: '66f5847d-53a3-44ba-9b2e-d4f1bc4f6abb', verdict: 'fully_vegan' }, // 非常好吃刈包 Hsinchu - Michelin listed
  // Chunk 81
  { id: '677aa92e-8b4b-45c4-a800-6ec899aed80b', verdict: 'fully_vegan' }, // Dom Vegano São José dos Campos
  { id: '67c2634d-db1f-47a7-ad45-457c61e0b4e1', verdict: 'fully_vegan' }, // Sushi Momo Végétalien Montreal
  { id: '67c64676-eb8c-4085-8bde-0944f83299a7', verdict: 'not_fully_vegan' }, // LEGO Pommes LEGOLAND - theme park fries
  { id: '67d82fa2-3fa3-403a-8ed8-bdd2e117b091', verdict: 'fully_vegan' }, // Wayward Vegan Café Seattle
  { id: '67f15b0a-33d3-4433-b592-df2ac3ce5ae4', verdict: 'fully_vegan' }, // Pépite Brussels
  { id: '682f4dc3-b429-4c53-a274-000058299b4e', verdict: 'closed' }, // Vegan Natural Bakery Singapore
  { id: '6837a1e6-665a-4216-a24d-2be6d355288f', verdict: 'closed' }, // Astrid och Aporna Copenhagen - closed Sep 2024
  { id: '688c6dbf-ba45-464d-853b-899b3ebbe276', verdict: 'not_fully_vegan' }, // Vrundavan Pure Veg Pune - lacto-vegetarian
  { id: '69044939-bca6-4e7a-b652-6b4bf927719a', verdict: 'fully_vegan' }, // Lae Lee Vegetarian Bangkok
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
