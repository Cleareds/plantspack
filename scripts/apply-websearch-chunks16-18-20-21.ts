import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 16
  { id: '160f143f-b5b0-4b87-b808-df45d786cfa2', verdict: 'fully_vegan' }, // Holy Plants Lima
  { id: '1658919c-2ba9-401f-a720-124a5ba3b0bc', verdict: 'fully_vegan' }, // Earth Cafe Canggu
  { id: '168ab060-e240-437e-8108-34ae5b0522b4', verdict: 'fully_vegan' }, // CHAT Maruyama Sapporo
  { id: '16c26990-75ad-44ab-831a-a1766201b70a', verdict: 'fully_vegan' }, // Naturalmente Bogota
  { id: '16c87496-ec04-474a-b0ce-d13669d7a8ea', verdict: 'fully_vegan' }, // Vegan Picnic SF
  { id: '170d1ffb-73b9-4a11-8926-94a99c00287c', verdict: 'fully_vegan' }, // Mandala Ravensburg
  { id: '171303cc-e50c-4562-b4fd-fa3a042c8aea', verdict: 'fully_vegan' }, // Apeti Segur Paris
  { id: '166df02a-710e-4cca-b53f-3e0565a92b56', verdict: 'closed' }, // Cafe Life Marietta
  { id: '1673ddfd-f782-4a72-bf3d-853f0a236ea2', verdict: 'closed' }, // Lean Green Cuisine Fayetteville
  // Chunk 17
  { id: '1755dcb7-9c06-48a2-a899-9971359bc8c8', verdict: 'fully_vegan' }, // Keep Bañana Munich
  { id: '17a4cc30-f71f-434f-93eb-949274d83937', verdict: 'fully_vegan' }, // Veganarie Bangkok
  { id: '17e74592-341d-4ac5-a97a-05a772182b45', verdict: 'fully_vegan' }, // Jesse Miner Vegan Personal Chef SF
  { id: '18309dd2-fe5f-4619-b259-fd3fb1cca0fa', verdict: 'fully_vegan' }, // Armazém VegAninha Curitiba
  { id: '1843dff0-c044-4250-9501-f525cc39263b', verdict: 'fully_vegan' }, // Kupfert and Kim Toronto
  { id: '189719d4-d47a-4a97-8dcd-e9cc2899cdc2', verdict: 'fully_vegan' }, // Beet Bar Margate
  { id: '172956cc-dc1b-4e25-96bb-dfab902a52a1', verdict: 'not_fully_vegan' }, // Sweet Elites Fresno
  { id: '179796ee-866a-4c46-aa76-0448ca357f09', verdict: 'not_fully_vegan' }, // Gopinatha Tokyo - dairy
  { id: '17d659b2-fb49-4c85-bc74-8330012237fd', verdict: 'not_fully_vegan' }, // Gelato e Caffe Munich - dairy
  { id: '175f290e-95dd-45ab-a7c8-0ae15df8f070', verdict: 'closed' }, // Angelica Kitchen NYC - closed 2017
  { id: '17dc1ef5-2d53-4ea0-8cf1-e4a1cfad8d3e', verdict: 'closed' }, // Raw Capers Canberra
  // Chunk 18
  { id: '18988458-5a90-4955-9299-dedd275281f3', verdict: 'fully_vegan' }, // Protected cat cafe Osaka
  { id: '18c55a4d-3a13-41c3-bb4d-ffaaa5894a2e', verdict: 'fully_vegan' }, // Bon Coeur France
  { id: '18c76120-421f-4257-b624-4126b13d0281', verdict: 'fully_vegan' }, // Caribbean Style Vegan
  { id: '18eb2ffe-8ee1-4456-a084-0bbdbafcbfbf', verdict: 'fully_vegan' }, // Kiwi Cafe Tbilisi
  { id: '18f5f031-2635-45b8-85e2-cafe821efbca', verdict: 'fully_vegan' }, // Botane Budapest
  { id: '1921e98b-c00c-44fd-8081-e10275c591f9', verdict: 'fully_vegan' }, // Vegan Nirvana Huntington Beach
  { id: '19360661-68cd-49de-a479-566c42d8c818', verdict: 'fully_vegan' }, // VeganLand Cigkofte Mulheim
  { id: '1989554a-bcb2-4789-8987-1653b520fdeb', verdict: 'fully_vegan' }, // Daily Press Cleveland
  { id: '192b56e7-4172-43a2-842c-1e2004946b84', verdict: 'not_fully_vegan' }, // Taqueria Ta'Cabron Berlin
  { id: '19475ea8-3b19-4155-8802-ac55daf8505e', verdict: 'not_fully_vegan' }, // Sara Ethiopian Vietnam
  { id: '19875cc0-c779-4e4e-8908-680755a87843', verdict: 'not_fully_vegan' }, // Nhà Hàng The Organic Vietnam
  { id: '1986c704-00fa-4aba-8d34-c7652ca4ff88', verdict: 'closed' }, // Rooster Cart Richmond
  // Chunk 20
  { id: '1b3aa4a6-7a86-4baf-acf7-5d557447eb6f', verdict: 'fully_vegan' }, // The Well Bean Co London
  { id: '1b5c9cbd-68e7-4ce2-b6bb-6e1ae7c74fa5', verdict: 'fully_vegan' }, // The Cannon New Haven
  { id: '1b8c2302-116f-4a8c-ad4d-01e0a47e8fea', verdict: 'fully_vegan' }, // Vegan Bistro Jangara Shibuya
  { id: '1b9e2bfd-fd96-444c-abf6-03c8daff20b5', verdict: 'fully_vegan' }, // Alegria Tel Aviv
  { id: '1bf4adfd-63f1-438f-aa18-a0988378b744', verdict: 'fully_vegan' }, // Peloton Canggu
  { id: '1c17cdf5-23e7-4c94-8e4b-6f1ea3cce497', verdict: 'fully_vegan' }, // The Green Stove Mumbai
  { id: '1c31ef83-526b-41eb-a180-6d46529e7589', verdict: 'fully_vegan' }, // El Cantaro Monterey
  { id: '1c24a232-efab-4626-a1cc-ebbc3ffe18d7', verdict: 'not_fully_vegan' }, // Nilaa Nilaveli - seafood
  { id: '1b38e349-3d7c-46d9-a0cd-d677f05cf849', verdict: 'closed' }, // Thrive Energy Lab Waterloo
  { id: '1c011421-c39c-4c1b-849e-71a9b828988d', verdict: 'closed' }, // Earthly Kitchen San Jose
  { id: '1c2496f0-ad5b-4fff-848b-6a632bbb9668', verdict: 'closed' }, // Long Hung Coffee Phu Quoc
  // Chunk 21
  { id: '1c9868c4-ff9e-4799-b34d-0ec8759e76b4', verdict: 'fully_vegan' }, // Cafe Ren Kyoto
  { id: '1cd0d259-ce8b-43e4-9940-3637a191a7ff', verdict: 'fully_vegan' }, // Cream Vegan Pastries London
  { id: '1cd19328-5e14-49ae-967a-cb9580fb6bf1', verdict: 'fully_vegan' }, // Local Love Vegan Catering Oakland
  { id: '1d35f9d5-393f-4400-b4a9-11d597d560ad', verdict: 'fully_vegan' }, // Loving Heart Vegan Kathmandu
  { id: '1d7afb8b-815c-4809-b061-54ddba6b7015', verdict: 'fully_vegan' }, // iVegan Hanoi
  { id: '1e01c9bc-9afe-4f04-ad11-127ed1a9b6b2', verdict: 'fully_vegan' }, // Harmonia da Terra Camboriu
  { id: '1e033e2c-b0c0-453d-a827-f9da84f57e68', verdict: 'not_fully_vegan' }, // Picasso's Naturals San Diego - eggs/cheese
  { id: '1da9df98-5193-4980-9cf5-17139ba1fa9b', verdict: 'closed' }, // Planeta Vegano Madrid
  { id: '1ddada00-90c0-4051-8bf4-8823adabdcbd', verdict: 'closed' }, // O2 Vegan Cafe Cambridge MA
  { id: '1de4ce9e-6304-4294-aebd-fd36723a0a7d', verdict: 'closed' }, // O! Vegasm! New Orleans
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
