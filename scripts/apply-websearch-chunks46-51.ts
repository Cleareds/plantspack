import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 46
  { id: '3c99a6b3-fda9-4f95-946d-c86d1a4a925b', verdict: 'fully_vegan' }, // The Allotment Manchester
  { id: '3c9c1909-dcbd-4e63-b5cb-9054f3fb5e31', verdict: 'not_fully_vegan' }, // Oakberry - honey/dairy toppings
  { id: '3ca45c94-dd52-4205-a332-3edc9775b8d7', verdict: 'fully_vegan' }, // Nhà Hàng Chay Bà Xã Thu Duc
  { id: '3cb05eb3-5fb9-42c8-bb50-7ac1089fde56', verdict: 'fully_vegan' }, // GluFREEgan Williamstown
  { id: '3ccad858-bb35-4fb7-868f-6344866e6654', verdict: 'closed' }, // Aka Marvelicious Jamaica Plain
  { id: '3ccada15-d3f0-439d-a90c-03b6eaed28cf', verdict: 'not_fully_vegan' }, // Pu-Ti Guadalupe - vegetarian
  { id: '3cd6253a-ead3-4f1c-85f0-5252ef8d0582', verdict: 'fully_vegan' }, // 御品齋素食自助餐 Taichung
  { id: '3cdb9e15-6d90-4b16-be08-8e635ce444a8', verdict: 'fully_vegan' }, // Planta Maestra Santiago
  { id: '3d18ba89-054a-4094-9982-462b6de192f5', verdict: 'closed' }, // Aldeia Indigo Florianopolis
  { id: '3d2140c4-b03a-4d29-8295-47d62e9019d2', verdict: 'fully_vegan' }, // Resto Vegan Mie Panjang Malang
  { id: '3d3ad46b-4adc-4b73-8736-f45ddd5acc54', verdict: 'fully_vegan' }, // All Live Cafe Philadelphia
  { id: '3d3d8f84-0f3e-4ebd-98b6-8291f646994c', verdict: 'fully_vegan' }, // Khánh Ly Phu Quoc
  { id: '3d4a8b4d-f3d8-4bf2-b7ac-dabf12fb4775', verdict: 'closed' }, // Be Raw Food Dallas
  { id: '3d5ee507-77d1-4ebd-accd-d733a4302686', verdict: 'fully_vegan' }, // Naturhotel aufatmen Leutasch
  // Chunk 47
  { id: '3d7dba90-0c8a-48f6-b5f3-13e84e4b32ad', verdict: 'fully_vegan' }, // Amitabha Vegan Fresh Meadows
  { id: '3dc204da-2d24-42a5-8564-f949e0b8445a', verdict: 'closed' }, // Broad Street Coffee Athens
  { id: '3dd7d772-561b-40ac-8439-883378457780', verdict: 'fully_vegan' }, // Consulado Vegano Lima
  { id: '3de080e3-e005-4dc9-8a53-ddabb9576327', verdict: 'fully_vegan' }, // Gintilla Cagliari
  { id: '3de526e6-4d2d-43bd-9c7e-2feefddd58e7', verdict: 'fully_vegan' }, // Onkel Ha Vegan Mulheim-Karlich
  { id: '3e19f1d6-55ed-439c-a9e0-82d2863acec2', verdict: 'fully_vegan' }, // Simple Plant Bantul
  { id: '3e1b6c35-c7eb-44cb-95a2-f37f707a6801', verdict: 'not_fully_vegan' }, // Dow Vegan Ton Sai - not confirmed fully vegan
  { id: '3e8a730a-f9a5-43a2-ab85-4da1855b74c9', verdict: 'fully_vegan' }, // Com Chay Vegan Buffet Hanoi
  // Chunk 48
  { id: '3efc188e-14db-4d15-9097-3cf568bcbfa1', verdict: 'closed' }, // Vegan's Choice Grocery Newtown
  { id: '3f1bd294-08b1-4194-b8a3-b7eba343f250', verdict: 'not_fully_vegan' }, // Gelateria La Luna Bremen - dairy
  { id: '3f1e64e6-43c6-4857-8087-4ff5ff8af509', verdict: 'not_fully_vegan' }, // Relax Pav Bhaji Pune - dairy
  { id: '3f24651c-9b39-4cc7-9eed-53b178be11e5', verdict: 'closed' }, // Urban Herbivore Toronto
  { id: '3f3705f6-68dd-490a-b489-4271362ebf7c', verdict: 'fully_vegan' }, // Sun Life Juice Bar Bronx
  { id: '3f4ed964-29c4-4ebc-9d23-8d86a69ff018', verdict: 'closed' }, // Wind & Wetter Berlin
  { id: '3f86b5a5-94cb-41a8-8ea4-d0fe1890d506', verdict: 'fully_vegan' }, // Wulf & Lamb London
  { id: '3fa1654a-9b06-4128-82f8-ea384faa9201', verdict: 'fully_vegan' }, // ヴィーガン餃子 Tokyo
  // Chunk 49
  { id: '3fa81922-02d6-42a5-b3bf-fb7c8727d9de', verdict: 'fully_vegan' }, // VegSpot Beijing
  { id: '3fac5c78-a0a2-4535-a435-9b6f12edaefc', verdict: 'fully_vegan' }, // Chickpea Burnaby
  { id: '401ad3bf-f9df-4406-9b55-a7d2481ebae0', verdict: 'not_fully_vegan' }, // Café STU Amersfoort - dairy
  { id: '408366b9-1641-43f5-8208-4ac678f289c5', verdict: 'not_fully_vegan' }, // Eiscafé Gelato degli Angeli Berlin - dairy
  { id: '40a4d505-c0e3-454b-95b0-aa1aea542120', verdict: 'fully_vegan' }, // Kale Cafe Daytona Beach
  { id: '40aaa985-3317-490c-88e8-f63b36ec6bce', verdict: 'not_fully_vegan' }, // Annam Pure Veg Kovalam - dairy
  { id: '40b55630-d92c-4cb4-89ae-be1bfdcafc80', verdict: 'not_fully_vegan' }, // Ruchi Vegetarian Chandler - dairy
  { id: '40ee1b33-a063-4f8a-9678-8831a910306a', verdict: 'not_fully_vegan' }, // The Selkie Scoop Bellingham - dairy ice cream
  { id: '4107aee0-69cb-4f3f-8cd7-d42575310983', verdict: 'not_fully_vegan' }, // Chinesischer Lotus Hamm - Thai/Chinese with meat
  { id: '410f4584-c128-4e9c-86bf-8df1e74db6a6', verdict: 'fully_vegan' }, // Loving Hut Honolulu
  // Chunk 50
  { id: '414ba7bc-a368-41a4-9e86-296540435e0c', verdict: 'fully_vegan' }, // Quan Chay Dieu Hoa
  { id: '4199839b-35dc-4337-b7c7-8649ad4b00b7', verdict: 'fully_vegan' }, // PASTAn Barcelona
  { id: '41a050eb-a109-422b-912e-df97d84a60fc', verdict: 'fully_vegan' }, // Desert Roots Kitchen Tempe
  { id: '41bb658c-9c0e-41d7-855e-75c61faa6828', verdict: 'fully_vegan' }, // Sana Vegan Café Lima
  { id: '41caebff-1da5-4ffc-8dac-21f995c78a61', verdict: 'not_fully_vegan' }, // Was wir wirklich LIEBEN Hamburg - meat
  { id: '41e46614-a0ee-448c-b6e7-ac0fa3868c1f', verdict: 'closed' }, // Ital Shak Brooklyn
  { id: '41ecb007-6c08-45d8-81ee-c144d356882a', verdict: 'not_fully_vegan' }, // Beef & Bun Bielefeld - meat
  { id: '41fcd9e0-0d7b-491f-abf0-dfb7f338ad17', verdict: 'fully_vegan' }, // Wingz London
  { id: '4242871c-1c3a-4d84-aae8-fb25ff7bcd64', verdict: 'closed' }, // bolo'bolo Muizenberg
  { id: '425a4b3a-05eb-4502-94f0-5fdc51cf8b94', verdict: 'fully_vegan' }, // Bami Hoi An
  { id: '425b4d14-d9c7-4eac-9005-062211f9662b', verdict: 'fully_vegan' }, // Bistro TOSSO Tokyo
  { id: '42634b9b-8aec-41ee-845f-30c557e19057', verdict: 'fully_vegan' }, // Motek Frankfurt
  { id: '426daae8-3dfb-463d-84f3-ad915c90d1f2', verdict: 'fully_vegan' }, // GreenVegg Fortaleza
  // Chunk 51
  { id: '4297fe5b-2252-467a-ab03-8fba8eb86fd5', verdict: 'closed' }, // Glazed & Infused Orlando
  { id: '42be27c2-9767-4e4a-9bf9-33674e51bd5d', verdict: 'closed' }, // De Acá San Jose
  { id: '42e954da-feb5-4961-95d1-3ddbcbdd6c1d', verdict: 'fully_vegan' }, // Sumac Cafe Nottingham
  { id: '42f11682-a9a7-4733-9231-1c67a9a16991', verdict: 'fully_vegan' }, // Maracuya Utrecht
  { id: '4316601a-2894-419e-9bfd-8485925aa826', verdict: 'closed' }, // East Side Ovens Cudahy
  { id: '43210c34-44c5-403a-a28f-774d7c3e0cc9', verdict: 'fully_vegan' }, // La Petite Véganerie Berlin
  { id: '433ddd4c-d5b2-4e89-a2bc-87cd4e11e6ca', verdict: 'fully_vegan' }, // LoQueHay Cafe Merida
  { id: '43483bc8-f930-4b5f-a954-5656d3888ced', verdict: 'fully_vegan' }, // Cowley Club Café Brighton
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
