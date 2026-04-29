import { config } from 'dotenv'; config({ path: '/Users/antonkravchuk/sidep/Cleareds/plantspack/.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const confirmed_vegan = [
  '000b830a-4461-4b9e-b418-6ba47016d944', // Sunshine Vegan Deli Sheffield
  '0019bebc-100b-435d-9da5-9ed4ec2ff56d', // Merit Vegan Restaurant Sunnyvale
  '0038b40d-f4de-4dc5-8cca-f6e0cc8dc5de', // Café Blume Berlin
  '007a6f12-7fa5-489b-a4c3-9f9862b4b9af', // Journey to Good Health Cafe Kailua-Kona
  '00af7d9c-4bba-4d60-9d24-f65a88b6b0b2', // A Seimeira Lugo
  '0118073d-4f20-4a8a-acb1-6ba618143b24', // Flower Burger Turin
  '012d78da-b9d0-47f9-91e7-50cfd6e6bf8e', // Vegan Junk Food Bar Amsterdam
  '016bdb84-b0f7-4b08-b12e-7d32e72406e3', // Vedge Philadelphia
  '018a4bd1-9ddd-4e33-b7de-deb61dce065c', // Cafe Sunflower Atlanta
  '01b19c9e-1e53-47c3-ac79-f5b1ba3b9ceb', // Garden Cafe Woodstock
  '01d1b7e6-7b28-4601-a08c-a9e0f46c9c51', // Loving Hut Oslo
];

const not_fully_vegan = [
  '003cf4d5-8c2b-4d21-83ac-a6bf85b0a0e5', // Smrat Pure Veg HK - vegetarian with dairy
  '00a011de-3f14-4e6b-a52e-1e4ccb2a90e0', // Nina's ess-Art - serves meat burgers too
  '00e2e7b9-6c98-4cad-a9c6-4e97e27adbb0', // Tian Vienna - vegetarian fine dining
  '00e72e47-9b4a-4da4-9bb5-bb4b2c71f18e', // Bakers & Roasters Amsterdam - serves eggs/bacon
  '00fb9ecf-7aad-43c0-a3a5-60a9c9d23dca', // Nolla Helsinki - meat and fish
  '01235a4b-0d37-4aa7-bb0e-19f8455e7c19', // Cafe Gratitude LA - honey/bee pollen
  '0136a84b-93ae-4a8e-a42e-3f49f793843f', // The Wren London - serves non-vegan
  '0187abc7-62a3-4cf9-a5b8-e98e0c70c2b1', // Govinda's Buffet Vegetariano Barcelona - dairy
  '0191f8ad-6296-495e-8aba-aab0a5c85e75', // Green SF - vegetarian with dairy
  '019a46de-5c0f-4b66-ac01-c8d28c4e3f35', // Hummus Bar Tel Aviv - serves meat
  '01c7ab6e-f2f9-4ea7-ae06-c5f0d57cdbf8', // Thai House Express SF - meat/seafood
  '01fe5bc3-f5c7-4ff3-86e4-6e03db3f0f19', // Bonsai Warsaw - non-vegan Asian restaurant
  '023a9f2e-4d7b-4c1e-a8f3-6b9e2c5d7a1f', // Veggie Galaxy Cambridge - vegetarian with dairy
];

const closed = [
  '006e1e09-72c1-4da4-b720-ee06e7e89cd7', // Juicer Heroes San Antonio
  '0080e1f4-2736-4562-aced-8de22e00d9d4', // Lecko'Mio Berlin
  '01b79c33-9e98-431a-8699-fde83e7a447f', // Cru Cafe Charleston (was also not vegan)
  '01f6f02a-5491-4b99-ab27-0e85ffcf2ce9', // VeganBurg San Francisco
];

async function applyTag(ids: string[], tag: string, extraUpdates?: Record<string,any>) {
  for (const id of ids) {
    const { data: place } = await sb.from('places').select('tags').eq('id', id).single();
    if (!place) { console.log(`Not found: ${id}`); continue; }
    const tags: string[] = [...(place.tags || [])];
    if (!tags.includes(tag)) tags.push(tag);
    const update: Record<string,any> = { tags, updated_at: new Date().toISOString(), ...extraUpdates };
    const { error } = await sb.from('places').update(update).eq('id', id);
    if (error) console.error(`Error ${id}: ${error.message}`);
    else process.stdout.write('.');
  }
}

async function main() {
  console.log('Applying websearch_confirmed_vegan...');
  await applyTag(confirmed_vegan, 'websearch_confirmed_vegan', { verification_status: 'scraping_verified' });

  console.log('\nApplying websearch_review_flag...');
  await applyTag(not_fully_vegan, 'websearch_review_flag');

  console.log('\nApplying websearch_confirmed_closed...');
  await applyTag(closed, 'websearch_confirmed_closed');

  console.log(`\nDone. ${confirmed_vegan.length} confirmed, ${not_fully_vegan.length} flagged, ${closed.length} closed.`);
}

main().catch(console.error);
