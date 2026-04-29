import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const { data: c } = await sb.from('directory_countries').select('*').limit(1);
  console.log('directory_countries columns:', c ? Object.keys(c[0]) : 'empty');
  const { data: d } = await sb.from('directory_cities').select('*').eq('city','Berlin').limit(1);
  console.log('directory_cities columns:', d ? Object.keys(d[0]) : 'empty');
  console.log('directory_cities Berlin:', JSON.stringify(d?.[0]));
}
main().catch(console.error);
