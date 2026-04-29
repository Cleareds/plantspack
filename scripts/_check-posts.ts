import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});
async function main() {
  // Find existing article posts to see the valid category value
  const { data } = await sb.from('posts').select('category, privacy, post_type, content_type').limit(20);
  const uniq = new Set(data?.map(r => JSON.stringify({category: r.category, post_type: r.post_type, content_type: r.content_type})));
  console.log('Existing combos:', [...uniq].slice(0, 10));
}
main().catch(console.error);
