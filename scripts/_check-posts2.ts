import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});
async function main() {
  // Check constraint on category column
  const { data, error } = await sb.from('posts').insert({ content: 'test', category: 'article', user_id: '00000000-0000-0000-0000-000000000000', post_type: 'original', content_type: 'general' });
  console.log('article try:', error?.message);
  const { data: d2, error: e2 } = await sb.from('posts').insert({ content: 'test', category: 'general', user_id: '00000000-0000-0000-0000-000000000000', post_type: 'original', content_type: 'general' });
  console.log('general try:', e2?.message);
  const { data: d3, error: e3 } = await sb.from('posts').insert({ content: 'test', post_type: 'article', user_id: '00000000-0000-0000-0000-000000000000', content_type: 'general' });
  console.log('post_type=article try:', e3?.message);
}
main().catch(console.error);
