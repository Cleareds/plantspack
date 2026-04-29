import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 64
  { id: '53b0e716-056f-46c8-aff2-203cc66990ca', verdict: 'fully_vegan' }, // Mana Moabit Berlin
  { id: '53cd8f68-f154-4f3f-95d9-bde86a5cd34d', verdict: 'not_fully_vegan' }, // Oehme Brot & Kuchen Dusseldorf - dairy
  { id: '53da6ad2-92a9-4cfc-9a4b-92cdd8127fe9', verdict: 'fully_vegan' }, // Essential Cafe London
  { id: '53e92acf-4a66-4c87-b498-03e0bf7f842d', verdict: 'not_fully_vegan' }, // Eis Cafe Da Pian Aachen - dairy
  { id: '53f52f9f-1f80-45ed-ab17-9b0ca25711e8', verdict: 'fully_vegan' }, // Veggie Inn Middlesex
  { id: '54006df9-dc4f-4f68-9010-7f34a709ddc2', verdict: 'fully_vegan' }, // Boots Bakery Spokane
  { id: '5422987e-28eb-4527-8d83-6447bbd35b0f', verdict: 'fully_vegan' }, // Ocean Beach People's Market San Diego
  { id: '5422b8fe-bf6f-445b-9b41-688d9259298f', verdict: 'closed' }, // Fala Bar LA
  { id: '544c6d22-cad7-4e83-bd4b-df2d9c69ba0b', verdict: 'not_fully_vegan' }, // Dog Day Afternoon - meat
  { id: '54507335-ed64-4f84-b411-eeeb37a13b4e', verdict: 'not_fully_vegan' }, // Le Jardin Céleste Wolfisheim - meat
  { id: '5453bf13-b977-42ac-9956-b2fa7eedff53', verdict: 'fully_vegan' }, // Years Hong Kong
  { id: '546adc89-0a48-4f6f-a0f8-eb1cbe1c7b80', verdict: 'fully_vegan' }, // Wild Vegan Farm Animal Sanctuary Gauteng
  // Chunk 65
  { id: '547a0f1c-a752-48c3-8b16-269a0909a194', verdict: 'fully_vegan' }, // Next Level Burger Denver
  { id: '5517053f-3b92-452c-9d3f-84cc5c624bc7', verdict: 'closed' }, // Vorixo Torres
  { id: '554d1713-8b2c-43ef-8c70-623b754766d8', verdict: 'not_fully_vegan' }, // Vel South Indian Kitchen Brighton - meat
  { id: '55afa080-a77e-43ff-bd05-c15e78a533fe', verdict: 'fully_vegan' }, // All vegan dumplings Bangkok
  // Chunk 66
  { id: '55bcb50a-c4df-4c2e-958f-883b103240b5', verdict: 'not_fully_vegan' }, // A Saude na Panela Salvador - lacto-vegetarian
  { id: '55e75ed6-8202-497a-835f-f210b3eabda6', verdict: 'fully_vegan' }, // Passionate Vegan Hurst
  { id: '560c09da-b304-4d2a-8843-b032e553c48a', verdict: 'fully_vegan' }, // Seren-table Takatsuki
  { id: '561bc37d-2760-42ad-9236-2e8d49269aac', verdict: 'fully_vegan' }, // Green Gorilla Montpellier
  { id: '5665e1ec-b4d1-4d37-b858-6e6075c67f80', verdict: 'fully_vegan' }, // Shoezuu vegan shoe store Gelsenkirchen
  { id: '56a37941-8c72-42e6-9030-f46085b884a2', verdict: 'not_fully_vegan' }, // Bo De Tinh Tam Chay Westminster - eggs/dairy
  { id: '56dbd5c3-87a0-4a75-b225-9850d70d05ac', verdict: 'closed' }, // Awa Viva Biofood Las Palmas
  { id: '56f22b67-e88d-43fd-afb1-3aaffed67187', verdict: 'fully_vegan' }, // Fresh No Meat No Fish Lourinha
  { id: '56fc0b68-5bfc-4bed-8775-bcad8279f6e1', verdict: 'fully_vegan' }, // Fat Vegan Mexico City
  // Chunk 67
  { id: '57393e48-69e7-412e-8764-2a23b8642044', verdict: 'fully_vegan' }, // ナナハコスイーツ工房 Osaka
  { id: '5748cd00-21c3-4f95-a42d-12024a865724', verdict: 'fully_vegan' }, // Sugar Taco LA
  { id: '5778fb48-29ad-4fea-b81b-6c20766c0e2e', verdict: 'not_fully_vegan' }, // Jan Pieter IJsje Amsterdam - dairy
  { id: '578ab243-d003-4a86-bc42-34d023b6a80b', verdict: 'closed' }, // Maja's Deli Berlin
  { id: '579530fb-739c-4497-90ad-8a4f70b31b8d', verdict: 'fully_vegan' }, // Mister Nice Guy Cupcakes Melbourne
  { id: '579ae53d-bb11-4cfa-9947-7c47d81a904c', verdict: 'not_fully_vegan' }, // Babel Cafe Osaka - meat/dairy
  { id: '57b9e601-c72a-4392-b0fc-8275fe20faf8', verdict: 'closed' }, // The Veggie Grill Irvine
  { id: '57bce6bb-297b-4f65-9a6c-f58209235119', verdict: 'closed' }, // Funky Fresh Foods Oslo
  { id: '581b3477-fdcb-48c2-8358-0936da3f3880', verdict: 'not_fully_vegan' }, // Best doner & snacks Amsterdam - meat
  // Chunk 68
  { id: '585b9c4b-b71b-4d39-8041-f8bfaecb276c', verdict: 'fully_vegan' }, // Vegan Burgueria Belo Horizonte
  { id: '58d24a91-24fd-4d01-ac65-ae8ba5c5d581', verdict: 'not_fully_vegan' }, // Kulturschranne Dachau - meat/dairy
  { id: '58e429ed-abb8-4ef8-b617-b4e3f1c02f23', verdict: 'closed' }, // Simply Vegan Kentish Town
  { id: '59060764-0f5b-41b0-a42f-c9a6a1f7b56d', verdict: 'closed' }, // Lovafare Louisville
  { id: '59064a0e-f97f-4d29-a16b-640d929412fc', verdict: 'closed' }, // Babycakes LA
  { id: '591218cf-9c77-423c-a30e-1e2f161320c7', verdict: 'fully_vegan' }, // Be Well Kitchen Santa Ana
  { id: '59221d74-7539-4214-91d5-138a7e91ed3b', verdict: 'fully_vegan' }, // 天慈素食
  { id: '59269ebf-6917-421d-bc90-b21e0fa99cd2', verdict: 'not_fully_vegan' }, // aaryas vegetarian hotel - dairy
  { id: '594a6406-ff1c-4c1f-8e99-55f424a36eb9', verdict: 'fully_vegan' }, // Quan Chay An Lac
  { id: '596b3949-f7cd-44a3-9b5b-2ddcf790bb13', verdict: 'not_fully_vegan' }, // Oak & Ice Berlin - dairy
  { id: '59c9d92e-19fa-43a3-8247-cf11b46d250f', verdict: 'not_fully_vegan' }, // Wishing Well Sanctuary Bradford - farm sanctuary
  { id: '59efd980-3e4f-45d0-b345-030adfbfbde7', verdict: 'fully_vegan' }, // Loving Hut New Plymouth
  { id: '5a0579a2-2519-40af-8334-ab1e4046cef0', verdict: 'not_fully_vegan' }, // Real Fruit Ice Cream Thanet - dairy
  // Chunk 69
  { id: '5a080bdf-e9ce-4886-b305-3e64745c5486', verdict: 'fully_vegan' }, // Légume Seoul - Michelin star vegan
  { id: '5a24fa06-24b4-4cc0-868c-66dcaf45c869', verdict: 'fully_vegan' }, // Delicias Naturales Bucaramanga
  { id: '5a394e3c-93e8-425c-aa27-1066fa804f8d', verdict: 'fully_vegan' }, // Happy Mushroom Chiang Mai
  { id: '5a4c069a-f2a9-4b40-91eb-1d36815f3bdd', verdict: 'fully_vegan' }, // V-Edge Elora
  { id: '5a7fb2c0-545b-453a-8950-81ae585fb0ea', verdict: 'closed' }, // Organic Soul Live Oakland
  { id: '5a9884e0-2a81-41f1-8e5f-7d5526119cde', verdict: 'not_fully_vegan' }, // פיצה פרגו - pizza chain with dairy
  { id: '5aaa85fd-e007-4cc9-b89b-f074414a3eb3', verdict: 'fully_vegan' }, // Rübenrot Augsburg
  { id: '5abf7599-1756-41bb-86f2-e4a2a6090776', verdict: 'not_fully_vegan' }, // Natalka Wismar - Ukrainian with animal products
  { id: '5ac4dbc9-c17a-4a06-a96e-9acf53ffefb3', verdict: 'fully_vegan' }, // To Live For Vancouver
  { id: '5ae1f759-0cf9-4cb0-81c3-22bbfc85f694', verdict: 'fully_vegan' }, // Healthful Essence Atlanta
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
