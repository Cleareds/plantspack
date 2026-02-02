-- Storage policies for the media bucket (videos)
-- The bucket itself is created via the Supabase admin API

-- Public read access for media files
CREATE POLICY "Public read access on media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Authenticated users can upload media files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Authenticated users can update media files
CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Authenticated users can delete their own media files
CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.role() = 'authenticated');
