-- Let user place-suggestions carry photos (optional). Uploaded by the mobile
-- app to the public `post-images` bucket; the URLs land here and, on approval,
-- are copied to places.images / places.main_image_url (see lib/submissions/approve.ts).
ALTER TABLE place_submissions
  ADD COLUMN IF NOT EXISTS images TEXT[];
