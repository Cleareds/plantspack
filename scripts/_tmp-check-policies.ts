import { config } from 'dotenv'; config({ path: '.env.local' });
const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
// Use the management API to check policies
const resp = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('.supabase.co', '')}/api/v1/projects/mfeelaqjbtnypoojhfjp/database/policies`,
  { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
);
console.log('Status:', resp.status);

// Try the pg query via the admin endpoint directly
const pgResp = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/pg/query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
    },
    body: JSON.stringify({ query: "SELECT bucket_id, name, definition FROM storage.policies WHERE bucket_id = 'post-images' ORDER BY name" })
  }
);
console.log('PG status:', pgResp.status);
const text = await pgResp.text();
console.log('PG response:', text.slice(0, 500));
