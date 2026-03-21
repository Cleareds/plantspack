-- Link posts to places with a foreign key
ALTER TABLE posts ADD COLUMN place_id UUID REFERENCES places(id) ON DELETE SET NULL;
CREATE INDEX idx_posts_place_id ON posts(place_id);
