import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});
async function main() {
  // Get the actual constraint from pg_constraint
  const { data } = await sb.rpc('exec_sql' as any, { sql: "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE 'posts_%check'" }).throwOnError().catch(() => null) || {};
  if (data) console.log('Constraints:', JSON.stringify(data));
  
  // Try to find valid category by looking at distinct values
  const { data: cats } = await sb.from('posts').select('category').limit(100);
  const uniq = [...new Set(cats?.map(r => r.category))];
  console.log('Distinct categories:', uniq);
}
main().catch(console.error);
