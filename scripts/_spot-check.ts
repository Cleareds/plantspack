import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const ids = [
    '01c159cd-4dea-475c-8c1c-ff97052d1111', // Tofu Shop Melbourne
    '00c2e5de-cfca-453d-9734-f1c90a9aff43', // Mount Kailash Helsinki
    '00b71eae-29f9-4f00-90d7-864ae8321b35', // Kisaki Kyoto
    '00bdb2bf-95dc-48fd-ab31-1a1b34802166', // Crosstown London
    '00e20be0-09d5-49ce-87ea-91cbb4116899', // La Bibimerie Paris
    '007ae0ad-ef08-487c-a3d2-be4f455b7a0a', // Bohemian Burgers Bruges
  ];
  const { data } = await sb.from('places').select('name, city, description').in('id', ids);
  data?.forEach(p => console.log(`\n--- ${p.name} (${p.city}) ---\n${p.description?.slice(0, 200)}`));
}
main().catch(console.error);
