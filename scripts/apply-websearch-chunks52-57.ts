import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 52
  { id: '43a99058-a81a-41bf-8311-77497f52927d', verdict: 'fully_vegan' }, // Fabrik Austin
  { id: '43d98847-8bac-4297-985c-0d94f06f93d2', verdict: 'fully_vegan' }, // Tofoo Com Chay San Jose
  { id: '44112194-0e3b-4573-bac4-4d7b582f1ed7', verdict: 'closed' }, // Vegetarian Ginger Brooklyn
  { id: '443ac851-4ae7-44e9-86fd-d1eee71df648', verdict: 'closed' }, // Dona Vegana Rio de Janeiro
  { id: '447d374e-7c61-4c16-8cd1-e8ccd2fc4011', verdict: 'closed' }, // 야미요밀 Vegan Bakery Seoul
  { id: '4482d115-7fea-4667-a073-61ba9a8aa4b6', verdict: 'fully_vegan' }, // Loving Hut Hamburg
  // Chunk 53
  { id: '44c08155-3752-4278-a6c0-5800f54ded4f', verdict: 'not_fully_vegan' }, // Foreign Affairs Berlin - meat hotel restaurant
  { id: '44db4f79-aebc-4ab7-970f-28ae0b9706f5', verdict: 'not_fully_vegan' }, // Aaru's Indian Restaurant Tallahassee - meat
  { id: '44db53cb-8ba4-424f-8dda-461783ad1738', verdict: 'fully_vegan' }, // Warung Pande Vegan Canggu
  { id: '44ebba00-699c-44d4-8801-de8808759619', verdict: 'closed' }, // Buddha Burgers Tel Aviv
  { id: '4501c40c-3041-4eda-a1cd-7a99664b7e73', verdict: 'fully_vegan' }, // Falafel Kikar Paris Haifa
  { id: '453f9010-b3d4-49ae-b1d1-9f659077cf75', verdict: 'closed' }, // Odd Burger Toronto
  { id: '454b8737-5838-4230-8e32-b5fadf3edf2d', verdict: 'not_fully_vegan' }, // Çiğköftem Wuppertal - dairy products
  { id: '4564d399-9aad-444e-b181-56730cac0167', verdict: 'not_fully_vegan' }, // Amandines Café Diss - dairy
  { id: '458993e9-a22e-44ce-87b0-4125b4da4493', verdict: 'fully_vegan' }, // Rooted Eat More Plants Medford
  // Chunk 54
  { id: '45a57eb0-6e2a-4cf4-8b40-5c0e390768a2', verdict: 'closed' }, // Julia's Kitchen Boulder
  { id: '45debf73-62ab-4bcf-a977-6b61ef36b7f2', verdict: 'not_fully_vegan' }, // Vegan Toastmasters LA - meetup group not restaurant
  { id: '4630558d-337d-4d29-bfbd-b2f712b50b5d', verdict: 'fully_vegan' }, // The RAW Cafe Detroit
  { id: '463b4793-7d49-4d7b-b7e4-bf553491b670', verdict: 'fully_vegan' }, // Veggie Castle 2 Queens
  { id: '464be7d8-82e0-49e2-8ec6-ecd88cd9647c', verdict: 'not_fully_vegan' }, // Tigerharen Stockholm - animal sanctuary not restaurant
  { id: '4660e9f1-c77f-4960-b6fe-16599400def9', verdict: 'fully_vegan' }, // Black Squirrel Bake Shop Lawrence
  { id: '4689255b-15e1-4da8-8c2a-404fe280de41', verdict: 'not_fully_vegan' }, // Meadowbrook Animal Sanctuary Perris - animal rescue not restaurant
  { id: '46a77f6e-6c47-4782-b709-1048b1b37ef8', verdict: 'fully_vegan' }, // VeganLand Cigköfte Saarbrucken
  { id: '46aab839-ec2e-45ad-b204-bdf15229d722', verdict: 'not_fully_vegan' }, // Aylin Aksu Berlin - hair salon
  { id: '4708fb04-7901-4f57-bf44-dfce696a0a4e', verdict: 'fully_vegan' }, // Veggiemaid Oldenburg
  { id: '474be607-1683-421a-8a2a-2dd9a49b65f4', verdict: 'closed' }, // Bioveggy Florence
  // Chunk 55
  { id: '477688e1-e3a4-4910-9dfc-86379571b40e', verdict: 'not_fully_vegan' }, // Green Garden Cafe Coventry - tuna/turkey
  { id: '47997a49-f7f8-4e1d-8654-85b58562544c', verdict: 'fully_vegan' }, // Detroit Vegan Soul
  { id: '479e42bb-26aa-484c-aa54-c2cff76e2dea', verdict: 'fully_vegan' }, // ÖUR Stockholm
  { id: '47cd49b1-8fcf-4301-b154-04f8058fcc80', verdict: 'fully_vegan' }, // Ain Sof Journey Shinjuku
  { id: '47dd336c-b1a6-4d7d-a7ec-9251bc0d024e', verdict: 'not_fully_vegan' }, // FTI Indian Cuisines Iloilo - non-vegan
  { id: '47fbf1ce-7a73-4d1e-9907-738067f079e2', verdict: 'fully_vegan' }, // Swirl Montreal
  { id: '480b41f3-4a19-4f68-9abc-954aacd56a31', verdict: 'not_fully_vegan' }, // Sam's Restaurant Fowey - seafood/meat
  { id: '481754ba-4b72-4ca2-98db-db0bf066580b', verdict: 'fully_vegan' }, // Quán Lục Lạc Cơm Chay
  { id: '4818bc68-877b-4004-97de-453310ea06aa', verdict: 'not_fully_vegan' }, // Bühler & Co London - eggs/cheese
  { id: '48381b0a-ae7a-4fee-aa39-450a966e650b', verdict: 'fully_vegan' }, // Oat and Bean Cardiff
  { id: '486e7d02-0132-48b0-bb90-ed798482e3a3', verdict: 'fully_vegan' }, // Veggie Burger Motomachi Barom Kobe
  { id: '488ca4c9-7c5d-47ba-a900-256baa70da48', verdict: 'fully_vegan' }, // Muz Muz CBD Lounge New York
  { id: '48958a4e-9983-477b-9f0f-102a22136213', verdict: 'closed' }, // Animalchef Sao Paulo
  // Chunk 56
  { id: '48d261f2-e50b-4738-98ca-b4fe2c250f3f', verdict: 'fully_vegan' }, // Southern Fried Vegan LA
  { id: '48e894b6-394b-4e97-a475-f1a41f505792', verdict: 'fully_vegan' }, // La Vie Dirty Vegan Burgers Paris
  { id: '495f8d87-a614-4e53-8f28-59d2a0e67b26', verdict: 'fully_vegan' }, // 新世界パプリカ食堂 Osaka
  { id: '49a37133-f522-48a4-b8db-1f2005fa81f0', verdict: 'fully_vegan' }, // 素虎 Beijing (Vege Tiger)
  { id: '49beec85-0cea-49ce-a076-16539f0cfe7a', verdict: 'not_fully_vegan' }, // Goji Vegetarian Cafe York - dairy
  { id: '49d21c5f-13b3-4d71-ad0e-8bb1225cb51d', verdict: 'fully_vegan' }, // Sunday C&C Eatery New York
  { id: '49ee5835-d5ad-41e5-87db-ec6ed882dc35', verdict: 'fully_vegan' }, // Nhà Hàng Chay Hum - Michelin Bib Gourmand vegan
  // Chunk 57
  { id: '4a573a25-8521-4315-81e6-1e2ca0f2e898', verdict: 'fully_vegan' }, // El Chante Vegano Alajuela
  { id: '4a5a691b-95a1-45a3-8487-38b02f473d06', verdict: 'fully_vegan' }, // Licious Dishes Honolulu
  { id: '4a938ddf-dd12-4d88-8e1c-a0e14b1f9e36', verdict: 'closed' }, // Vegan Plate Studio City
  { id: '4a9d0fbe-34e5-4d72-88ec-881b9209b161', verdict: 'not_fully_vegan' }, // Akshaya Vegetarian - dairy
  { id: '4ad97609-449b-4ab1-8614-be5ac20b9336', verdict: 'fully_vegan' }, // Vegâteau Montreal
  { id: '4b0abc50-d796-456c-b600-54212afd710e', verdict: 'closed' }, // Cafe by Tao North Vancouver
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
