import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  { id: '14c7dcd3-e468-4759-80fe-b57a9444222e', verdict: 'fully_vegan' }, // LuvBurger Nosara
  { id: '152756b2-7d8c-47b4-8651-c9203ccb0aab', verdict: 'fully_vegan' }, // Nhà Hàng Chay Huế An
  { id: '15478ee3-0d83-4a85-a53f-2fa1d6fad6ca', verdict: 'fully_vegan' }, // Loving Hut Praha 1
  { id: '155ba47f-6c76-4820-878e-dfff66523d33', verdict: 'fully_vegan' }, // Tokyo Vegan Ramen Center
  { id: '15b1e7c1-9f6f-4b50-baf7-b844f4a14fe0', verdict: 'fully_vegan' }, // Pura Vida Tacos Antwerp
  { id: '15fec8ff-cfa6-4c52-bbbd-98f1c5341b5a', verdict: 'fully_vegan' }, // Wine bar Gutenberger Mainz
  { id: '14b5f5c4-9e04-47e4-85a9-643b4b3f112f', verdict: 'not_fully_vegan' }, // BMS Organics - dairy
  { id: '14f1bf7a-7dee-49bb-b877-86ae42dc6dac', verdict: 'not_fully_vegan' }, // Sushi Sano Munich - fish
  { id: '15aff006-222b-4194-8ab8-35eb5d90b830', verdict: 'not_fully_vegan' }, // Bäckerei Schmid - traditional
  { id: '15441f80-7b1d-4efa-b0d1-f874555b82be', verdict: 'closed' }, // Recoccole Osaka
  { id: '15de8fa3-724b-4820-bfb8-61a11f9fe090', verdict: 'closed' }, // Juice Served Here
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
