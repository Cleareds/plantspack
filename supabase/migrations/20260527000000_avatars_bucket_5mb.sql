-- Raise avatars bucket limit from 2MB to 5MB.
-- Pack banners share this bucket and need up to 5MB for 1200x400 hero shots.

UPDATE storage.buckets
SET file_size_limit = 5242880 -- 5MB
WHERE id = 'avatars';
