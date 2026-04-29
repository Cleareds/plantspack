import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const verdicts: Array<{ id: string; verdict: string }> = [
  { id: '000b830a-4461-4b9e-b418-6ba47016d944', verdict: 'fully_vegan' },
  { id: '0019bebc-100b-435d-9da5-9ed4ec2ff56d', verdict: 'fully_vegan' },
  { id: '003f4f42-ef3b-4034-8831-2271d1db3055', verdict: 'fully_vegan' },
  { id: '006e1c14-7a1a-48c2-9d42-385ba8b354f8', verdict: 'fully_vegan' },
  { id: '00b2c5c2-3d8e-4597-9ce8-539fbd3d3ed3', verdict: 'fully_vegan' },
  { id: '004bc896-e2b4-423b-8f31-4afa3ae6c390', verdict: 'not_fully_vegan' },
  { id: '00ae3c89-95a2-4ea1-9c19-a512b5dec4dc', verdict: 'not_fully_vegan' },
  { id: '005daa9c-7658-4760-9d00-d6644b91874f', verdict: 'closed' },
  { id: '0080a601-35e4-4daa-b931-490806989e08', verdict: 'closed' },
];

async function main() {
  for (const { id, verdict } of verdicts) {
    const { data: place } = await sb.from('places').select('id, name, tags').eq('id', id).single();
    if (!place) { console.log(`Not found: ${id}`); continue; }

    const tags: string[] = [...(place.tags || [])];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (verdict === 'fully_vegan') {
      if (!tags.includes('websearch_confirmed_vegan')) tags.push('websearch_confirmed_vegan');
      updates.tags = tags;
      updates.verification_status = 'scraping_verified';
    } else if (verdict === 'not_fully_vegan') {
      if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag');
      updates.tags = tags;
    } else if (verdict === 'closed') {
      if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed');
      updates.tags = tags;
    }

    const { error } = await sb.from('places').update(updates).eq('id', id);
    if (error) console.error(`  Error ${place.name}: ${error.message}`);
    else console.log(`  [${verdict}] ${place.name}`);
  }
  console.log('Done.');
}

main().catch(console.error);
