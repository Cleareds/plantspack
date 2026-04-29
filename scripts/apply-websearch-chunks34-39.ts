import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 34
  { id: '2e085a3b-5834-4d67-8d20-60507636626c', verdict: 'fully_vegan' }, // Beehive Juice Bar South Miami
  { id: '2e1cfafa-db8b-4b47-ba87-94b69040c4b8', verdict: 'fully_vegan' }, // Vegan Table Baram Jeju
  { id: '2e260ab5-c1df-4ac6-a96d-6cd3d68dcdaf', verdict: 'fully_vegan' }, // Tena'Adam Munich
  { id: '2ea5f6c2-9888-4314-96d8-62b0b0dd967b', verdict: 'fully_vegan' }, // Sushi Kitchen George Town
  { id: '2eaf9107-62d6-4073-8f7d-3fa7d1c440ae', verdict: 'fully_vegan' }, // Arte Vegetal Santiago
  { id: '2edc449b-ba4a-4da1-aa3c-aeb650034041', verdict: 'fully_vegan' }, // Yam Vegan Deli Munich
  { id: '2e84d3fc-b909-456b-a847-dc6da349139d', verdict: 'not_fully_vegan' }, // Hummus Eliyahu - chain not fully vegan
  { id: '2eb8315f-a89e-4b7b-84ec-3237aba88a14', verdict: 'closed' }, // Aisoor Fire Light Kingston
  { id: '2ee3a548-b32c-4b98-9fcf-21ff8a00c47b', verdict: 'closed' }, // Saina Japanese Vegetarian Concord
  // Chunk 35
  { id: '2eead2bd-00e0-4334-910c-9abde3062a9f', verdict: 'fully_vegan' }, // Cindysnacks Huntington
  { id: '2ef3d0cb-3716-4d71-9865-4653007311d3', verdict: 'fully_vegan' }, // Thanh Lieu Vegan Hue
  { id: '2ef7d65b-d182-4e3c-871f-09de16b19a4e', verdict: 'fully_vegan' }, // Veg-In-Out Organic Asheville
  { id: '2f024b88-a38d-4740-88f7-e9a2c095d8e0', verdict: 'fully_vegan' }, // Utopia Vegan Canberra
  { id: '2f34fce9-3777-4d8a-bdb0-195b85fe4d80', verdict: 'fully_vegan' }, // Vleischpflanzerl Salzburg
  { id: '3038a03f-f4f8-44c6-92c6-6081a01565db', verdict: 'fully_vegan' }, // The Vegan Goddess Pittsburgh
  { id: '306f30b2-30a2-4da2-af93-37b3905184d7', verdict: 'fully_vegan' }, // Loving Hut Prague
  { id: '30895adb-bbfa-4ed7-9371-c8ebcf51443b', verdict: 'fully_vegan' }, // Sabertooth Bakery Burlington
  { id: '2eed40f6-c97e-421b-b6d2-508b52826d8f', verdict: 'not_fully_vegan' }, // Bei Taki Munich - kebab/meat
  { id: '2ef127c2-78a4-4ac8-a257-a377b72357d3', verdict: 'not_fully_vegan' }, // Pizza Prego - dairy pizza chain
  { id: '2f43d9a9-d6e4-4461-8fc2-490b736e640a', verdict: 'not_fully_vegan' }, // Laila Krakow - halloumi
  { id: '2ff11172-8aca-4b58-9216-b9566ab0afa4', verdict: 'not_fully_vegan' }, // BMS Organics - eggs/dairy
  { id: '306782fb-9f69-41fc-8af0-2c555f8da315', verdict: 'not_fully_vegan' }, // Heimisch Norden - meat
  { id: '30191731-043e-4ddf-8b77-75938d4a9dac', verdict: 'closed' }, // Karmavore Vegan Shop New Westminster
  // Chunk 36
  { id: '30a62210-a2e5-4911-97d3-8b108a5a329c', verdict: 'fully_vegan' }, // GoodDO India
  { id: '312d784c-a47e-4ced-ae27-109fb7dbb131', verdict: 'fully_vegan' }, // Vegan Food Thai Jae Bangkok
  { id: '31393a32-4a72-4e45-a257-bd44d45be6e2', verdict: 'fully_vegan' }, // Vegan Culinary Tours Paris
  { id: '308c07c1-96ae-4b7f-b6e7-c49bab22e3ba', verdict: 'not_fully_vegan' }, // Le Coq d'Or Nivelles - traditional Belgian
  { id: '3091a9b7-fe15-437b-abcb-fc1a00eefa36', verdict: 'not_fully_vegan' }, // Yushi Wertheim - sushi/meat
  { id: '30fbc9bf-781d-4cbd-b916-ab29a586dce3', verdict: 'not_fully_vegan' }, // Fit Cake Vienna - non-vegan items
  { id: '31227d35-ae48-4eea-8df7-020e4f1f5278', verdict: 'not_fully_vegan' }, // Femo Bistro Döner Kebab Berlin - meat
  { id: '314203e0-c942-48e7-ba0c-171296056f58', verdict: 'not_fully_vegan' }, // Pizzeria Roma Aachen - traditional pizza
  { id: '30eff9e7-4fd2-4e42-9f77-b5c53aabb0c5', verdict: 'closed' }, // Kék Ló Berlin
  // Chunk 37
  { id: '31581f6f-0825-46db-82ab-d4cf5a5d1f3d', verdict: 'fully_vegan' }, // Kusa Japanese Vegan KL
  { id: '316da9c7-6d50-4468-a074-799b5004b22a', verdict: 'fully_vegan' }, // Vegan Dukkan Lokanta Beyoglu
  { id: '31801138-9f92-4270-84e6-6a8bdc1106a0', verdict: 'fully_vegan' }, // Bäristo Vegan Deli Kiel
  { id: '318e59a9-45df-4433-bb70-9d29a6f693e6', verdict: 'fully_vegan' }, // Hej Lucie! Uppsala
  { id: '3281b821-390c-435d-b3d6-afa6a7113e2f', verdict: 'fully_vegan' }, // Gia Vegan Pastries San Jose
  { id: '3282bb65-560f-496a-871f-baa7525a6e80', verdict: 'fully_vegan' }, // La Reverde Buenos Aires
  { id: '31cea11e-98b8-41cd-8ead-f34198345aae', verdict: 'not_fully_vegan' }, // Musafirkhana Hotel Dhaka
  { id: '32941a32-1bee-4279-8922-312054821d7c', verdict: 'not_fully_vegan' }, // PizzAllegro Nurtingen
  { id: '3218cb8f-f6fd-4af2-a479-dc00b211f355', verdict: 'closed' }, // Fo Guang Tea House Edmonton
  { id: '322457d6-b0ec-4d12-998d-1afb5cb89b6e', verdict: 'closed' }, // Ohlala V Tartes-shop Berlin
  { id: '32958713-3ee1-45fe-896d-55eabcce52dc', verdict: 'closed' }, // Malinee Thai Vegetarian Point Chevalier
  // Chunk 38
  { id: '32a4eff2-4f8d-432b-9773-49febb00626a', verdict: 'fully_vegan' }, // Güd Altrincham
  { id: '32ad4513-2cba-4bf9-a1e0-20dfc7c12d44', verdict: 'fully_vegan' }, // Viitals Tampa
  { id: '33816ff2-432a-44bf-8fdf-06c3ebb779e4', verdict: 'fully_vegan' }, // Moonshine Plant Based Kitchen Cocoa FL
  { id: '32e5f3e2-c93d-49e4-99f9-0d7a22966766', verdict: 'not_fully_vegan' }, // Indian Burgers Joint - dairy
  { id: '3346d5e9-bb9c-4ca5-abd7-922204785a5e', verdict: 'not_fully_vegan' }, // Radhe Vega Poznan - dairy
  { id: '3355fc06-3840-468c-9052-67330973b206', verdict: 'not_fully_vegan' }, // El Arao Logrono - dairy/eggs
  { id: '33656b24-4097-4401-87b7-68140067f6bb', verdict: 'not_fully_vegan' }, // Karki's Restaurant Varanasi - non-vegan
  { id: '33ef7048-3b17-4a2e-8b4b-20e0e5d3593f', verdict: 'closed' }, // Oh My Bakeshop Sudbury
  { id: '33f86b70-201e-434a-92f3-3aac56bc5121', verdict: 'closed' }, // Indigo Food Cafe Vancouver
  // Chunk 39
  { id: '341316e3-c804-45f8-9a37-36ba6cf26e64', verdict: 'fully_vegan' }, // Humus Puerto de la Cruz
  { id: '34351b48-eab0-4969-b2d7-647b83751145', verdict: 'fully_vegan' }, // Dove's Donut Oakland
  { id: '34401233-5d69-4a5d-ad7b-aceba5bc961c', verdict: 'fully_vegan' }, // Chay Cao Bang Vietnam
  { id: '3452184b-a439-4993-99aa-a2f96af6c433', verdict: 'fully_vegan' }, // L'orto cafè Torino
  { id: '34955dc9-f089-42c8-8821-837bc28b0ead', verdict: 'fully_vegan' }, // Mundo Vegan Funchal
  { id: '34bc450b-356f-4720-abe0-c8f2d8dacb07', verdict: 'fully_vegan' }, // Hue Quang Chay Vietnam
  { id: '34e45ad8-d316-4ce1-9b8f-6ee0f05a0a06', verdict: 'fully_vegan' }, // Falafel Kikar Paris Haifa
  { id: '3540ec76-a0b6-4f72-bec7-3781adb58131', verdict: 'fully_vegan' }, // Vegeria Vegan Tex-Mex San Antonio
  { id: '34b807fb-494c-4113-9a93-b0f8a3baa3d1', verdict: 'not_fully_vegan' }, // Shahia Döner Leipzig - meat
  { id: '34cc7272-3161-40df-9d85-8be0bbdfe481', verdict: 'not_fully_vegan' }, // Mint Family Restaurant Delhi - non-veg
  { id: '34f6abf3-50a8-42ee-9840-a7fcf3510e20', verdict: 'not_fully_vegan' }, // Fries and More Vegan Brussels - not fully
  { id: '3471af6e-eae5-4ced-8fea-799a38efd8c2', verdict: 'closed' }, // Free Food* Birnam - closed
  { id: '34f165f8-370c-4627-b87b-a498eadfe208', verdict: 'closed' }, // Closer Muizenberg
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
