import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});
async function main() {
  const { error } = await sb.from('categories').upsert({
    slug: 'article', display_name: 'Article', description: 'Long-form blog articles and essays',
    icon_name: 'article', display_order: 9, is_active: true, color: '#0a6a1d'
  }, { onConflict: 'slug' });
  if (error) console.error('categories upsert:', error.message);
  else console.log('✅ article category added');
}
main().catch(console.error);
