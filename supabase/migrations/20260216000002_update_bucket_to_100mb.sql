-- Update media bucket to 100MB to match Supabase Free tier limit
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'media';
