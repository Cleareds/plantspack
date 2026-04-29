import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 70
  { id: '5b29c206-f7c0-421e-9f40-40006594e0cb', verdict: 'fully_vegan' }, // Com chay Thien Y
  { id: '5b573e46-c7e5-4155-b837-4fe0348cbd88', verdict: 'closed' }, // Tasca Vegetariana Nehuen Valencia
  { id: '5b6e7264-7174-470c-a24c-43487afe7010', verdict: 'fully_vegan' }, // Veganatomy Newcastle
  { id: '5bac7ce3-b9cb-4d78-b98d-862271681586', verdict: 'closed' }, // Shanti Yoga Vegan Café Hiroshima
  { id: '5bd1a758-d0f4-4242-9072-0d01c81282da', verdict: 'fully_vegan' }, // Currant Affairs Leicester
  { id: '5bf3767e-78e0-4a9e-90e1-e53fd3a41d12', verdict: 'fully_vegan' }, // Nha Hang Chay An Duyen HCMC
  { id: '5c6894d5-8eee-45d9-908c-b12fbb1cf06f', verdict: 'closed' }, // Vegacy Sao Paulo
  { id: '5c8335d3-3356-4db2-ac85-4f64a4e5467c', verdict: 'fully_vegan' }, // IIMORI VEGAN Berlin
  // Chunk 71
  { id: '5c8c206d-44a4-429c-a569-9010c21eedf1', verdict: 'fully_vegan' }, // La Vie Dirty Vegan Burgers Paris
  { id: '5c96a91b-50f2-4036-a73e-bd702efa2916', verdict: 'not_fully_vegan' }, // Sevil Döner Pizza Augsburg - meat
  { id: '5c995446-444a-448f-b762-48fa288d7114', verdict: 'fully_vegan' }, // Alge Monchengladbach
  { id: '5c9d1313-4baf-4dc2-ae27-4fe911d7650a', verdict: 'fully_vegan' }, // Waltham Forest Vegan Market
  { id: '5ca8cad9-72e2-4b1e-8afa-f63a28d5e8a4', verdict: 'not_fully_vegan' }, // Hare Krishna Buffet - dairy
  { id: '5caaddcf-fa84-4271-b9b8-2ef1c8f82d68', verdict: 'closed' }, // Lake Villa Guatemala
  { id: '5cb60345-ddad-4270-bdc1-745c9f82d295', verdict: 'fully_vegan' }, // 素虎 Beijing
  { id: '5cb66e91-a426-4fcc-93c8-8dc1a3e83446', verdict: 'fully_vegan' }, // 真さか Shibuya
  { id: '5cb8030f-acbc-453d-b3e1-e85f31a04de6', verdict: 'fully_vegan' }, // Bluesomeone's Taichung
  { id: '5cbe88fe-2092-4bf4-a45d-0aad3eb36292', verdict: 'fully_vegan' }, // Copper Branch
  { id: '5ceb3e75-455b-4c99-b49a-535a1e79c886', verdict: 'fully_vegan' }, // Rüpel Food Lab Hannover
  { id: '5cf86e31-1858-4103-bc03-8ee07d8a826c', verdict: 'fully_vegan' }, // VegPod Sheboygan
  { id: '5cfbc550-1e62-4c4b-ab61-e315f9830fed', verdict: 'not_fully_vegan' }, // Le pigeon communal - occasional vegan only
  // Chunk 72
  { id: '5d013c60-947f-48b7-9934-494b5ce19a31', verdict: 'closed' }, // Hotel Swiss Die Krone
  { id: '5d6c6d4a-e9b2-4f5c-b695-b0f0031de392', verdict: 'closed' }, // 3 Brothers Vegan Cafe Copiague
  { id: '5d735563-38b5-444d-ae8f-e48e37e0fc8c', verdict: 'fully_vegan' }, // Tuulispaa Animal Sanctuary
  { id: '5d9ade9b-2a91-4165-bd8f-e6459ad4b588', verdict: 'closed' }, // Power House Living Foods Nanaimo
  { id: '5dada9f0-015e-4829-aaec-f077988265ce', verdict: 'fully_vegan' }, // Açai Rhodes
  { id: '5de62297-6956-4a78-8369-acb6712c2230', verdict: 'closed' }, // The Freshary Shanghai
  { id: '5e024e11-8a79-4f4b-815e-6a369100f642', verdict: 'fully_vegan' }, // Di Lac Vietnamese Cuisine San Jose
  { id: '5e32b217-faf4-4822-9fc4-92f34690bd3e', verdict: 'closed' }, // Brody's Bakery Belton
  // Chunk 73
  { id: '5e62100c-84f3-44fb-b987-978b4f71835c', verdict: 'fully_vegan' }, // Holloway Road Fruit & Veg London
  { id: '5ed92fa0-11b8-463a-b990-962a132d3b27', verdict: 'closed' }, // Flore Vegan Cuisine LA
  { id: '5edfefba-c35e-4ae1-a9aa-bfacab92a33a', verdict: 'fully_vegan' }, // Tandem Donuts Missoula
  { id: '5f48efba-b0d6-44d8-b166-447318050b09', verdict: 'not_fully_vegan' }, // Nennillo Pizzeria Cologne - meat
  { id: '5f7e3efc-8c4c-4c17-b563-86fcb66e9ab5', verdict: 'fully_vegan' }, // ტკბილიკო Tbilisi
  { id: '5f9b1467-e9d9-4659-a29b-d98f0a32ea99', verdict: 'not_fully_vegan' }, // Fisch Klette Kombüse - fish restaurant
  { id: '5fd64e71-e792-4228-b24a-3703bdd04200', verdict: 'closed' }, // Charly's Vegan Tacos Tulum
  // Chunk 74
  { id: '5ff36eeb-d0ee-492c-8953-752b868e98a7', verdict: 'fully_vegan' }, // Çiğköfte Vegan Land Bonn
  { id: '600637af-82e6-46a4-b359-ca540f294c2b', verdict: 'fully_vegan' }, // 술고당 Busan
  { id: '6046a8cb-8a7a-40e4-b5d4-117bb3002d53', verdict: 'closed' }, // Green Palace Sydney
  { id: '6053fa48-4618-4709-847c-34b44f1e4102', verdict: 'not_fully_vegan' }, // Yonah Schimmel Knish Bakery - dairy
  { id: '605be0df-ac4b-4059-9a9f-3636b436deaa', verdict: 'not_fully_vegan' }, // Asiagaststätte Luu - meat
  { id: '605f22f4-8d3f-4646-b99e-7cd61d8ab5d2', verdict: 'fully_vegan' }, // Vleischpflanzerl Salzburg
  { id: '605f28f1-90eb-4135-b3b3-776d223f32a1', verdict: 'fully_vegan' }, // Tea Leaf Vegan Pizza Koh Phangan
  { id: '607c91cc-c4f5-4d7d-b244-ff97a2af6396', verdict: 'fully_vegan' }, // Phuc Quang Chay Thu Duc
  { id: '60e4e38d-33ae-4679-acac-28ff8a71d75f', verdict: 'not_fully_vegan' }, // Menya Ikko Munich - ramen/meat
  { id: '60ff5b2e-2cf2-4e98-92b7-879a20c87b5c', verdict: 'fully_vegan' }, // Merit Vegan Restaurant Sunnyvale
  // Chunk 75
  { id: '61138b9c-104c-4edf-954e-c1f529cbc9c0', verdict: 'not_fully_vegan' }, // Вега-маркет Kyiv - sells dairy/eggs too
  { id: '61281cd0-5bd6-40cc-ae71-fc30dd38c5f9', verdict: 'fully_vegan' }, // Zero Kebab Berlin
  { id: '6147ac33-12d7-4cf7-ae4f-776fcc4ec44b', verdict: 'fully_vegan' }, // Franchia NYC
  { id: '6149e03c-a955-4703-9d98-4b8b5ffe65b4', verdict: 'not_fully_vegan' }, // El Olivo Caracas - vegetarian with dairy
  { id: '616ed893-d391-4258-8622-f2305f42de18', verdict: 'fully_vegan' }, // Falafel Temple Canggu
  { id: '6175f568-291f-4f56-abfa-8357a5f0937b', verdict: 'not_fully_vegan' }, // Primo Hilversum - Italian with meat
  { id: '61921b28-41eb-4af2-8938-6f5432b4b752', verdict: 'fully_vegan' }, // Éden Budapest
  { id: '61f3e18f-73a0-48f6-9db9-e44c088b3dc7', verdict: 'fully_vegan' }, // Veguísimi Mexico City
  { id: '62188c67-67ff-43b9-bb2f-04d4ade88390', verdict: 'closed' }, // Namaste Cafe New Brunswick
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
