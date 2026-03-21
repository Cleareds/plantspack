-- Routes table (schema only - no UI yet)
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  waypoints JSONB NOT NULL DEFAULT '[]',
  polyline TEXT,
  total_distance_km NUMERIC(8,2),
  estimated_duration_min INT,
  category TEXT CHECK (category IN ('food_tour','city_walk','road_trip','day_trip','multi_day')),
  difficulty TEXT CHECK (difficulty IN ('easy','moderate','challenging')),
  transport_mode TEXT CHECK (transport_mode IN ('walking','cycling','driving','transit','mixed')),
  images TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route-Place junction table
CREATE TABLE IF NOT EXISTS route_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  note TEXT,
  stay_duration_min INT,
  UNIQUE(route_id, place_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_routes_creator ON routes(creator_id);
CREATE INDEX IF NOT EXISTS idx_routes_category ON routes(category);
CREATE INDEX IF NOT EXISTS idx_routes_published ON routes(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_route_places_route ON route_places(route_id);

-- RLS
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_places ENABLE ROW LEVEL SECURITY;

-- Routes policies
CREATE POLICY "Published routes are viewable by everyone" ON routes
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can view their own routes" ON routes
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create routes" ON routes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own routes" ON routes
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own routes" ON routes
  FOR DELETE USING (auth.uid() = creator_id);

-- Route places policies
CREATE POLICY "Route places viewable with route" ON route_places
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM routes WHERE routes.id = route_places.route_id
    AND (routes.is_published = true OR routes.creator_id = auth.uid())
  ));

CREATE POLICY "Route creators can manage route places" ON route_places
  FOR ALL USING (EXISTS (
    SELECT 1 FROM routes WHERE routes.id = route_places.route_id
    AND routes.creator_id = auth.uid()
  ));
