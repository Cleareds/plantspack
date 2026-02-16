-- Increase media bucket file size limit to 256MB for Premium users
-- Current limit: 50MB (52428800 bytes)
-- New limit: 256MB (268435456 bytes)

UPDATE storage.buckets
SET file_size_limit = 268435456
WHERE id = 'media';
