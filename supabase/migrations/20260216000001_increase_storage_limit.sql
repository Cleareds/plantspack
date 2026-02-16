-- Update media bucket file size limit to 100MB (Supabase Free tier max)
-- Current limit: 50MB (52428800 bytes)
-- New limit: 100MB (104857600 bytes)
-- Note: Supabase Free tier caps uploads at ~100MB regardless of bucket config

UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE id = 'media';
