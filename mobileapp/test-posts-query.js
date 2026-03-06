import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuery() {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:users!posts_user_id_fkey(*),
      likes:post_likes(count),
      comments:comments(count)
    `)
    .is('deleted_at', null)
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Query result:', JSON.stringify(data, null, 2));
    if (data && data.length > 0) {
      console.log('\nFirst post user field:', data[0].user);
      console.log('First post content:', data[0].content);
    }
  }
}

testQuery();
