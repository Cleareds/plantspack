-- Sprouts: PlantsPack's contribution rewards system.
--
-- Three balances per user:
--   sprouts_lifetime — total ever earned. Determines tier (Bronze/Silver/Gold/Platinum).
--                       Never decreases, even when user spends.
--   sprouts_balance  — currently spendable (lifetime minus spent/seeded).
--                       Used to gate redemptions and seedings.
--   sprouts_seeded   — total ever seeded into the user's digital tree.
--                       Counts only digital tree growth; uses balance.
--
-- The ledger is append-only. Reversals are tracked via reversed_at + a
-- reversal ledger entry so the audit trail is always complete.

-- 1. Append-only ledger of every Sprouts transaction.
CREATE TABLE IF NOT EXISTS user_sprouts_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,            -- positive earn, negative spend/seed
  base_amount INTEGER NOT NULL,       -- before supporter multiplier (audit clarity)
  multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  action_type TEXT NOT NULL,          -- e.g. 'add_place', 'review_with_photo', 'profile.vegan_since', 'seed_tree', 'spend.cleareds_discount'
  reference_type TEXT,                -- 'place', 'review', 'post', 'correction', 'profile_field', 'tree', 'redemption'
  reference_id UUID,                  -- pointer to the entity that triggered this
  metadata JSONB DEFAULT '{}'::jsonb,
  reversed_at TIMESTAMPTZ,            -- non-null = this entry has been reversed (don't count toward balance)
  reversal_of UUID REFERENCES user_sprouts_ledger(id),  -- if this entry IS the reversal, links to the original
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprouts_ledger_user ON user_sprouts_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sprouts_ledger_idempotency
  ON user_sprouts_ledger(user_id, action_type, reference_type, reference_id)
  WHERE reversed_at IS NULL;

-- 2. Cached running totals on users.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sprouts_lifetime INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sprouts_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sprouts_seeded INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_sprouts_lifetime ON users(sprouts_lifetime DESC);

-- 3. Per-user digital tree state.
CREATE TABLE IF NOT EXISTS user_trees (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_seeded INTEGER NOT NULL DEFAULT 0,
  current_stage INTEGER NOT NULL DEFAULT 0,  -- 0=plot, 1=seedling, ..., 7=heritage
  stage_reached_at JSONB DEFAULT '{}'::jsonb,  -- {"1":"2026-06-01T...", "2":"..."} for animation history
  real_world_planted_count INTEGER NOT NULL DEFAULT 0,  -- real trees planted via this user
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Real-world tree orders (queued for admin to plant via partner like Eden Reforestation).
CREATE TABLE IF NOT EXISTS real_world_tree_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sprouts_spent INTEGER NOT NULL,           -- typically 1000
  ledger_id UUID REFERENCES user_sprouts_ledger(id),
  status TEXT NOT NULL DEFAULT 'queued',    -- queued | planted | refunded
  partner TEXT,                             -- 'eden_reforestation', 'one_tree_planted', etc.
  partner_tree_id TEXT,                     -- partner's reference
  tree_location TEXT,                       -- country/region
  tree_lat NUMERIC,
  tree_lng NUMERIC,
  user_message TEXT,                        -- optional message from user (e.g., dedication)
  notes TEXT,                               -- admin notes
  planted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rwt_user ON real_world_tree_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rwt_status ON real_world_tree_orders(status);

-- 5. Sprouts redemptions (Cleareds discount, supporter month, featured placement, etc.).
CREATE TABLE IF NOT EXISTS sprouts_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,           -- 'cleareds_discount_50pct', 'supporter_month_1', 'featured_placement_7d', etc.
  sprouts_spent INTEGER NOT NULL,
  ledger_id UUID REFERENCES user_sprouts_ledger(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | fulfilled | refunded
  code TEXT,                            -- generated redemption code (for Cleareds-style)
  payload JSONB DEFAULT '{}'::jsonb,    -- reward-specific data (which place to feature, etc.)
  fulfilled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON sprouts_redemptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON sprouts_redemptions(status);

-- 6. Vegan journey profile fields on users.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_vegan TEXT,                  -- 'vegan' | 'transitioning' | 'curious' | 'vegetarian' | 'omnivore_ally'
  ADD COLUMN IF NOT EXISTS vegan_since DATE,
  ADD COLUMN IF NOT EXISTS vegan_reasons TEXT[],           -- multi-select
  ADD COLUMN IF NOT EXISTS transition_story TEXT,
  ADD COLUMN IF NOT EXISTS favourite_vegan_meal TEXT,
  ADD COLUMN IF NOT EXISTS current_challenges TEXT[],
  ADD COLUMN IF NOT EXISTS dietary_specifics TEXT[],       -- gluten-free, soy-free, WFPB, raw, etc.
  ADD COLUMN IF NOT EXISTS cooking_frequency TEXT,         -- daily | weekly | rarely
  ADD COLUMN IF NOT EXISTS home_city TEXT,
  ADD COLUMN IF NOT EXISTS home_country TEXT;

-- RLS policies. Ledger is read-own by user, full-access by admin.
ALTER TABLE user_sprouts_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_world_tree_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprouts_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_read_own ON user_sprouts_ledger
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY trees_read_own_or_public ON user_trees
  FOR SELECT USING (true);  -- trees can be seen on profiles; public

CREATE POLICY trees_write_admin ON user_trees
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY rwt_read_own_or_admin ON real_world_tree_orders
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY rwt_write_admin ON real_world_tree_orders
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY redemptions_read_own_or_admin ON sprouts_redemptions
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY redemptions_write_admin ON sprouts_redemptions
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- updated_at trigger for user_trees + real_world_tree_orders
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_trees_touch ON user_trees;
CREATE TRIGGER user_trees_touch BEFORE UPDATE ON user_trees
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS rwt_touch ON real_world_tree_orders;
CREATE TRIGGER rwt_touch BEFORE UPDATE ON real_world_tree_orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
