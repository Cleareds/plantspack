import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 28
  { id: '2669171e-a784-4e1b-b8d0-7b17a1c2f9a2', verdict: 'fully_vegan' }, // Casa Diablo Portland
  { id: '2669dab3-80b3-4cc9-85e9-7b6a7bee4e74', verdict: 'fully_vegan' }, // Inner You Costa Adeje
  { id: '268cfc34-01d8-48b0-8638-f9e557736064', verdict: 'fully_vegan' }, // The Red Herring Urbana
  { id: '2698c2e3-3b44-4b51-97be-e46bd3b10c1d', verdict: 'fully_vegan' }, // Planta Queen Washington DC
  { id: '26bdf78f-020c-448b-9c0f-2f6dd43f602f', verdict: 'fully_vegan' }, // Simbiosis Ibiza
  { id: '26cb3439-502c-4826-a662-ad5a22f128f1', verdict: 'fully_vegan' }, // El Buda Profano Arequipa
  { id: '26ccf5e6-a940-4d02-9852-34eaa1a058b1', verdict: 'fully_vegan' }, // Taste and See São Paulo
  { id: '26f6b10c-731b-425e-bf61-be181cb6b64d', verdict: 'fully_vegan' }, // Hippocrates Health Institute West Palm Beach
  { id: '26aad0e0-9c2f-44ad-9d8c-c92da9de773b', verdict: 'not_fully_vegan' }, // Ciorbe si Placinte Bucharest - meat
  { id: '26d008b1-a7e6-42ca-adbb-ac814a23f6a6', verdict: 'not_fully_vegan' }, // Mam Mam Leipzig - non-vegan
  { id: '270634f3-67ed-4fd5-9faa-5880d920f96e', verdict: 'not_fully_vegan' }, // Dunya Falafel Cologne - meat
  // Chunk 29
  { id: '27115b91-3a24-4ccd-8eb9-17b7a79651ed', verdict: 'fully_vegan' }, // Honest to Goodness Hoylake
  { id: '271cbd5d-da58-4f6b-aa56-0b015e39a840', verdict: 'fully_vegan' }, // Vegan Life Prague
  { id: '27240617-5828-476c-a228-07f5720c6fe6', verdict: 'fully_vegan' }, // Viriditas Vegan Kitchen Oaxaca
  { id: '274506fb-4b2a-46e5-8031-73136c031347', verdict: 'fully_vegan' }, // Happy Food and Health Rotterdam
  { id: '277d7ab3-fc71-480f-92f4-20366f8e2b2d', verdict: 'fully_vegan' }, // Lafferie Malang
  { id: '27d5bf3c-4493-4f96-bd33-a1b67a6de158', verdict: 'fully_vegan' }, // Biomania Street Food Bol
  { id: '27ea0886-289a-4b0f-810f-f564027b1617', verdict: 'fully_vegan' }, // Loving Hut Pak Chong
  { id: '2815c0a4-9298-463d-bb2c-2fa7b3aca0e0', verdict: 'fully_vegan' }, // May Kaidee Chiang Mai
  { id: '283a2fb2-31e3-4500-a208-52553f8b53a0', verdict: 'fully_vegan' }, // Situ Coffee & Tea Prague
  { id: '27b5e2ea-d6fb-4f36-9354-1e3188ebd8bf', verdict: 'not_fully_vegan' }, // Eiscafe Cappuccino Duren - dairy
  { id: '28095f9a-d954-4c12-b371-bce615bd4cf4', verdict: 'closed' }, // Universo Vegano Rome
  // Chunk 30
  { id: '28454dad-d952-4b01-8766-0d49e6f2c734', verdict: 'fully_vegan' }, // Sunday Night Vegan Feast Brooklyn
  { id: '284b0f81-c890-4127-9574-f4b85ae2e0d1', verdict: 'fully_vegan' }, // The Sprout Charleston
  { id: '286445a8-2358-4475-91fb-ff4478e292a0', verdict: 'fully_vegan' }, // Khanh Ly Vegan Restaurant
  { id: '28762176-95f9-404b-847f-59a7f6b15a46', verdict: 'fully_vegan' }, // What the Pitta Shoreditch
  { id: '28909ea3-793c-4c4e-9cd1-704c8be22d37', verdict: 'fully_vegan' }, // Tue Tam Houston
  { id: '29142d4f-68fb-4132-a6c0-5e2ff9fd8192', verdict: 'fully_vegan' }, // Nude Food Augsburg
  { id: '285b9505-b29f-4533-ac7c-d0b8308126cf', verdict: 'not_fully_vegan' }, // Eiscafe Gelato Piu Gartringen - dairy
  { id: '287ee69a-8aa0-47cc-8fc2-a9f051ccad46', verdict: 'not_fully_vegan' }, // Artisan Cottage Sourdough Bakers - dairy
  { id: '28803eb0-0c33-440c-bc6c-23bfb4154235', verdict: 'not_fully_vegan' }, // Garbanzo Copenhagen - meat
  { id: '28885c9e-11ed-4e40-9bed-3a8a124cd2b1', verdict: 'not_fully_vegan' }, // Amy's Drive Thru - dairy
  { id: '28d2cef6-f5f9-474e-a6dd-deb88b45afdb', verdict: 'not_fully_vegan' }, // Cigkoftem London - not fully vegan
  { id: '2919765c-d535-4d76-8b92-0ddfbc376b1c', verdict: 'not_fully_vegan' }, // Thoy Anh Dresden - not vegan
  // Chunk 31
  { id: '296c847e-505d-4b62-8098-a8b69428fefa', verdict: 'fully_vegan' }, // Sin Gluten Vegan Bombon Alicante
  { id: '29e4bdac-9a73-483a-b9db-f910f7cd888a', verdict: 'fully_vegan' }, // Venerable Bean Morgantown
  { id: '2a282113-ab82-4d30-bcb2-87a94ee32ff1', verdict: 'fully_vegan' }, // No 18 Vegan Cafe Bar Swansea
  { id: '2a6b051d-25c1-4c24-986d-4b8af28722a4', verdict: 'fully_vegan' }, // Crudo Glyfada
  { id: '2a740e18-f5a9-4135-8645-4128e7a48c5a', verdict: 'fully_vegan' }, // Andy's Pure Food Rye
  { id: '2a767932-99d5-4bfc-8695-2249a93ed245', verdict: 'fully_vegan' }, // Macelleria Vegetariana Italia Naples
  { id: '2a897033-77a9-47da-a8d5-3289180ca542', verdict: 'fully_vegan' }, // Denton Vegan Cooperative Denton
  { id: '29cec764-6121-40b3-bff1-6ca32055ee62', verdict: 'not_fully_vegan' }, // Bottas Nudelbar Bad Soden - seafood
  { id: '29f02af5-d9c3-45ec-95fe-7c12bf0ce6f1', verdict: 'not_fully_vegan' }, // Shirin Persian Foods - meat/fish
  { id: '2aa90d4d-276f-418c-8a12-b794c115cfa8', verdict: 'not_fully_vegan' }, // Main Street Creamery & Smokehouse - dairy/meat
  { id: '2a9e2fba-f26b-4271-80f0-e1ea1a7a5f74', verdict: 'closed' }, // Pferdegnadenhof Edelweiss Wildon
  // Chunk 32
  { id: '2aabaf4f-dc98-4444-9b6e-9c4018d24cd0', verdict: 'fully_vegan' }, // Vegazzi Budapest
  { id: '2b108fca-1624-41d7-8433-700b5cd8c4bb', verdict: 'fully_vegan' }, // ALCHEMY Tokyo
  { id: '2b21970a-1c94-4090-bbb9-948f71623b2d', verdict: 'fully_vegan' }, // Iku Wholefood Kitchen Bondi Beach
  { id: '2b6c34b3-1305-45b2-997f-950fd0f44e55', verdict: 'fully_vegan' }, // Once Across the Garden York
  { id: '2c29d3af-2ad7-444a-9511-a55c8e605035', verdict: 'fully_vegan' }, // El Vegetaliano Tulum
  { id: '2aed8c39-b5f3-45dc-9492-1ce779a92f83', verdict: 'not_fully_vegan' }, // Resept Cafe Stavanger - non-vegan
  { id: '2bb92158-6c24-4107-bd1e-22e4cea9971f', verdict: 'not_fully_vegan' }, // Murudi's Hotel Chennai - dairy
  { id: '2bc9a5ec-d417-4cb5-9628-a4b53c9173f9', verdict: 'not_fully_vegan' }, // Rudy's Neapolitan Pizza Leeds - dairy
  // Chunk 33
  { id: '2c529b9d-da38-4b50-b565-6dd8232c6725', verdict: 'fully_vegan' }, // Compassionate Cake Milwaukee
  { id: '2c57ff39-0d20-4077-9f09-07bc10026c64', verdict: 'fully_vegan' }, // Romeo and Vero Vegan Butcherie Cape Town
  { id: '2cb27391-a1bb-4da4-80cf-a4d3a4a36d0a', verdict: 'fully_vegan' }, // Sadhana Forest Cerro Azul
  { id: '2d089e2c-ae86-4434-b294-73e6011e2944', verdict: 'fully_vegan' }, // Nha hang Chay Giac Ngo Vietnam
  { id: '2d2a6fe3-8104-4119-af91-256578e98532', verdict: 'fully_vegan' }, // Sadhana Forest Kenya Kilifi
  { id: '2d652e17-6256-4e81-bb1a-9d299c3a5b5e', verdict: 'fully_vegan' }, // KURUMI Da Nang
  { id: '2dc3b130-4f7e-4101-ab46-ce176e2f95c2', verdict: 'fully_vegan' }, // Rahel Ethiopian Vegan LA
  { id: '2c5df0d3-d652-4384-a7b2-61e067b8267b', verdict: 'not_fully_vegan' }, // Ahmed Mohamed Foul - eggs
  { id: '2dc9ba63-037a-4574-8749-9e6e447e3692', verdict: 'not_fully_vegan' }, // Good Grief Coffee Roasters - dairy
  { id: '2dd54d44-200b-4f64-b280-069dc0ab79a0', verdict: 'closed' }, // Buddha Burgers Tel Aviv
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
