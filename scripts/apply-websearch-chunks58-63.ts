import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 58
  { id: '4b1377c9-be15-4c28-88d1-61692de56f77', verdict: 'not_fully_vegan' }, // Eis-Cafe Orangerie - dairy
  { id: '4b3946a0-d920-4664-a18b-b23743a4b6b0', verdict: 'closed' }, // Buddha Burgers Tel Aviv
  { id: '4b47ebfc-b596-4087-a64e-4ce7a5f1bf87', verdict: 'fully_vegan' }, // Loving Hut Prague
  { id: '4b7459db-8a6c-4f05-9096-2f9723beffd9', verdict: 'fully_vegan' }, // Teshlou's Little Africa Grand Rapids
  { id: '4b9a7eca-f126-4ad8-a060-2128ff3216b6', verdict: 'not_fully_vegan' }, // Çiğköftem Cologne - dairy drinks
  { id: '4bb8ecb1-6bb2-4b0d-be6d-0b1b438a8c7e', verdict: 'closed' }, // Morels Food Truck Louisville
  { id: '4bc1df1a-055e-4f50-84bc-41ea28cfe129', verdict: 'fully_vegan' }, // Cafe Katzentempel Leipzig
  { id: '4c0036db-4a76-4347-b00e-4a6ea2d7111f', verdict: 'not_fully_vegan' }, // Saravanaa Bhavan Decatur - dairy
  { id: '4c459975-f92d-4939-ad1c-08c2b26edb90', verdict: 'closed' }, // VEGAN STORE Taito
  { id: '4c4772c2-d56a-49fb-b614-6576fcd0d166', verdict: 'not_fully_vegan' }, // Van Leeuwen Ice Cream - dairy
  { id: '4c5aded3-a600-45c8-ad52-e0705f0c0e2d', verdict: 'fully_vegan' }, // Nabati Bistro Montreal
  { id: '4c65c2b2-3220-4e1f-b0d1-e214bb9db898', verdict: 'fully_vegan' }, // Api Wasi Quito
  // Chunk 59
  { id: '4c854034-c889-4bd3-b072-90138b39f1c9', verdict: 'fully_vegan' }, // Purely Plant Atlanta
  { id: '4c8a4cc3-f019-44ec-a5f5-d248e0aae623', verdict: 'not_fully_vegan' }, // North Point Cafeteria - campus dining
  { id: '4c9464e8-995f-4957-b49d-6f0e233d760d', verdict: 'not_fully_vegan' }, // Su Xing House Philadelphia - eggs/dairy
  { id: '4c9dbb5a-c203-410c-9171-d00b3b69642e', verdict: 'closed' }, // Season's Plant Based Bistro Salt Lake City
  { id: '4d0b11cf-f8f7-4032-b1ee-d7d2bb69ee2c', verdict: 'not_fully_vegan' }, // DCG District Chicken Gyro - meat
  { id: '4d106fab-7aae-4095-bfad-9c657e6254a7', verdict: 'closed' }, // Roxanne's / Smiling Dog Cafe SLO
  { id: '4d84efe1-1866-421b-9516-9a29884ef672', verdict: 'fully_vegan' }, // Vegan Wagen Monterrey
  { id: '4d864e28-6ba2-4a1b-bf99-11e64d8bb54c', verdict: 'fully_vegan' }, // The Acorn Pie and Mash Leigh-on-Sea
  { id: '4dcf2b88-8234-4984-a229-5371f2c72461', verdict: 'closed' }, // Falafelito Mexico City
  // Chunk 60
  { id: '4dde1eac-2217-483a-afa9-4b1031b9d842', verdict: 'closed' }, // Sugar Tooth Bakery Austin
  { id: '4e161e2c-cf35-43bf-a639-8cba179702ad', verdict: 'fully_vegan' }, // Troo Food Athens
  { id: '4e24d89f-835e-4209-8a45-322e19601635', verdict: 'fully_vegan' }, // Mario Senza Glutine Vegan Cuneo
  { id: '4e5aa36f-47b7-4b0d-a896-7c19fc3a11de', verdict: 'fully_vegan' }, // F (Effe) Kyoto
  { id: '4e63105e-7a76-4512-9fe2-808d498fac3b', verdict: 'not_fully_vegan' }, // Center Street Coffee House Tokyo Disneyland - meat
  { id: '4eac83c3-e901-4031-afdb-be88219e1c32', verdict: 'fully_vegan' }, // Pattycake Bakery Columbus
  { id: '4ecc6e4b-0acc-47f6-8791-c51bc399d615', verdict: 'fully_vegan' }, // Ann Wigmore Natural Health Institute
  { id: '4ef62583-50c4-4078-8e37-8dc776017073', verdict: 'fully_vegan' }, // Green 2 Phoenix
  { id: '4f383c78-c9d7-4613-b5dc-d1c481f6bff1', verdict: 'fully_vegan' }, // Vegan Bro Cafe Batumi
  { id: '4f392534-7f50-466f-b7ec-12660554454f', verdict: 'fully_vegan' }, // Merry Cherry Vegan Milan
  { id: '4f6f54fa-dd98-4836-a51a-40aede0ec36e', verdict: 'not_fully_vegan' }, // Sjamaan Culemborg - optional dairy whipped cream
  // Chunk 61
  { id: '4f7aca30-9d15-4c62-8cbb-bf868ccb4106', verdict: 'closed' }, // Zella Juice Snohomish
  { id: '4f7f3e25-84fd-4eaa-8bbb-6f360efe8b56', verdict: 'not_fully_vegan' }, // Sissi + Franz Hamm - meat burgers
  { id: '4f9dd265-4d12-4ec1-ac1c-13e865d75ab0', verdict: 'fully_vegan' }, // Source Copenhagen
  { id: '4f9f8228-5cc7-49f8-8d56-e4a7f701ee78', verdict: 'fully_vegan' }, // Anastasia Tel Aviv
  { id: '4fbd91ca-e63d-4d93-bdee-a6c06d073eea', verdict: 'closed' }, // The Vegan House Hollywood
  { id: '4fbde071-a69b-4590-93e1-400e93762adb', verdict: 'fully_vegan' }, // WAY Plantbased Bakehouse Ghent
  { id: '4fe2bd8b-00ab-4b9e-b9e9-ba239b462818', verdict: 'not_fully_vegan' }, // Mensa II Berlin - student canteen
  { id: '500c04d9-3e74-4c84-bea5-2a300c7f81c7', verdict: 'not_fully_vegan' }, // Cesme Kebap Haus Bamberg - meat
  { id: '50124ad7-e31e-485c-b3fc-9bb0054bbf8e', verdict: 'closed' }, // Sol D'Licious Cafe Kenosha
  { id: '5054e851-cada-4f18-8fd7-b3f46bcd1b42', verdict: 'fully_vegan' }, // Odd Burger Toronto
  { id: '5071c583-485d-4127-a1c8-753bd827cb8b', verdict: 'fully_vegan' }, // Das Voglhaus Konstanz
  { id: '5073a961-1113-4314-a242-ab103a1cdea8', verdict: 'closed' }, // The Parlour St. Johns - hair salon, closed
  { id: '50bd6c85-1744-4bf4-8c7b-6f2a727c3091', verdict: 'not_fully_vegan' }, // Bee Sweet Worthing - dairy ice cream
  // Chunk 62
  { id: '514b8e80-b9b6-43c7-bdb1-409dd27696fe', verdict: 'fully_vegan' }, // Vegano Cigkofte Recklinghausen
  { id: '514e509a-4c38-4b05-b41a-4fbe9ae24409', verdict: 'fully_vegan' }, // Cosmic Veggies Oak Harbor
  { id: '515a8b2a-0d3e-432a-81ea-461ce317a644', verdict: 'fully_vegan' }, // Fu Cheng Vegetarian Changhua City
  { id: '5188eeeb-be34-45da-b32f-169fefdc5fac', verdict: 'closed' }, // De Aca San Jose
  { id: '51afeda5-1a81-48e9-b401-aa1705f662f0', verdict: 'fully_vegan' }, // The Farriers Vegan B&B Cyprus
  { id: '51c644a1-e365-4575-b7bf-d6921094f8aa', verdict: 'fully_vegan' }, // CÀI Kitchen Hamburg
  { id: '520a13fd-b16b-43ff-89c6-cb787246ae5f', verdict: 'fully_vegan' }, // Mileljos Vegan Alicante
  { id: '52301d2a-66ac-434f-b240-46708651d9ba', verdict: 'fully_vegan' }, // Ras Rody's Roadside Organic Negril
  // Chunk 63
  { id: '52561931-fb1b-4aa7-813e-7051a8d29b2d', verdict: 'fully_vegan' }, // Pascual Vegan Catering LA
  { id: '52a31dc9-f937-4b5d-9c8e-9081945e5d18', verdict: 'fully_vegan' }, // BeReal Doughs Yarmouth Port
  { id: '52a8a810-76d9-488e-9fcd-ea3cfd43a05e', verdict: 'fully_vegan' }, // 蔡老師蔬食 Taipei
  { id: '52d155fd-36fb-49c6-b044-8639c81432f6', verdict: 'not_fully_vegan' }, // Fridas Eiskrem Aschaffenburg - dairy
  { id: '52f9e947-fc57-4dc1-a6e7-b7de27247c11', verdict: 'closed' }, // Veggie Grill Irvine
  { id: '532ce51c-91b6-429d-9534-25ad9cde0b03', verdict: 'fully_vegan' }, // Namoranga Lençóis Brazil
  { id: '53315c95-c743-4139-a26c-ad598ba6bb9a', verdict: 'not_fully_vegan' }, // Los Chamos - Venezuelan meat restaurant
  { id: '53a65a35-e1d2-4bc0-a4c4-769bdb482b1d', verdict: 'fully_vegan' }, // WAVE Hackney London
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
