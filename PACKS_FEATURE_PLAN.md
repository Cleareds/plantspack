# Packs Feature - Implementation Plan

## Overview
Curated collections of posts (like Pinterest Boards + Facebook Groups hybrid) where paid users can create themed packs and curate posts around topics like recipes, restaurant guides, product reviews, etc.

## Research & Inspiration

### Similar Features
- **Pinterest Boards**: [User-curated collections](https://medium.com/@jeanettebravo2022/user-curated-canvas-understanding-pinterests-content-organization-855938f0545c) with 20-100 items, sections, AI recommendations
- **Vegan Apps**: [Food Monster Collections](https://voyagingherbivore.com/best-vegan-apps/), Vegan Amino community (253k+ members)
- **Community Platforms**: [Discord/Circle alternatives](https://bettermode.com/blog/top-free-alternatives-to-facebook-groups) with granular moderation

### Why Packs Work for Vegans
- **Recipe Collections**: "Best Vegan Desserts", "Quick Weeknight Meals", "Gluten-Free Vegan"
- **Location Guides**: "Vegan Restaurants in NYC", "Plant-Based Shops in London"
- **Topic-Based**: "Beginner Tips", "Activism Resources", "Nutrition Info"
- **Seasonal**: "Vegan Thanksgiving", "Summer BBQ"
- **Product Reviews**: "Best Vegan Cheeses", "Cruelty-Free Beauty"

---

## Phase 1: Core MVP

### Step 1: Database Schema

```sql
-- Packs table
CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,

  -- Social links
  website_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,

  -- Metadata
  category TEXT, -- recipes, places, products, resources, lifestyle
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pack members (join/follow)
CREATE TABLE pack_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- admin, moderator, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pack_id, user_id)
);

-- Pack posts (curated content)
CREATE TABLE pack_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES users(id),

  -- Organization
  position INTEGER DEFAULT 0,
  section_name TEXT, -- for future: "Appetizers", "Mains", etc.
  is_pinned BOOLEAN DEFAULT false,

  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pack_id, post_id)
);

-- Pack follows (for notifications)
CREATE TABLE pack_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pack_id, user_id)
);

-- Indexes
CREATE INDEX idx_packs_creator ON packs(creator_id);
CREATE INDEX idx_packs_category ON packs(category);
CREATE INDEX idx_packs_published ON packs(is_published);

CREATE INDEX idx_pack_members_pack ON pack_members(pack_id);
CREATE INDEX idx_pack_members_user ON pack_members(user_id);
CREATE INDEX idx_pack_members_role ON pack_members(pack_id, role);

CREATE INDEX idx_pack_posts_pack ON pack_posts(pack_id, position);
CREATE INDEX idx_pack_posts_post ON pack_posts(post_id);
CREATE INDEX idx_pack_posts_pinned ON pack_posts(pack_id, is_pinned);

CREATE INDEX idx_pack_follows_pack ON pack_follows(pack_id);
CREATE INDEX idx_pack_follows_user ON pack_follows(user_id);

-- RLS Policies
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_follows ENABLE ROW LEVEL SECURITY;

-- Packs: Anyone can view published packs
CREATE POLICY "packs_select_policy" ON packs
  FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR creator_id = auth.uid()
  );

-- Packs: Users can create their own packs (tier limit checked in API)
CREATE POLICY "packs_insert_policy" ON packs
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Packs: Users can update their own packs
CREATE POLICY "packs_update_policy" ON packs
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Packs: Users can delete their own packs
CREATE POLICY "packs_delete_policy" ON packs
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Pack members: Anyone can view members of published packs
CREATE POLICY "pack_members_select_policy" ON pack_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = pack_members.pack_id
      AND (packs.is_published = true OR packs.creator_id = auth.uid())
    )
  );

-- Pack members: Users can join packs
CREATE POLICY "pack_members_insert_policy" ON pack_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
  );

-- Pack members: Users can leave packs (delete their own membership)
CREATE POLICY "pack_members_delete_policy" ON pack_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Pack posts: Anyone can view posts in published packs
CREATE POLICY "pack_posts_select_policy" ON pack_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = pack_posts.pack_id
      AND (packs.is_published = true OR packs.creator_id = auth.uid())
    )
  );

-- Pack follows: Anyone can view follows
CREATE POLICY "pack_follows_select_policy" ON pack_follows
  FOR SELECT
  TO authenticated
  USING (true);

-- Pack follows: Users can follow packs
CREATE POLICY "pack_follows_insert_policy" ON pack_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Pack follows: Users can unfollow packs
CREATE POLICY "pack_follows_delete_policy" ON pack_follows
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION update_pack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER packs_updated_at_trigger
  BEFORE UPDATE ON packs
  FOR EACH ROW
  EXECUTE FUNCTION update_pack_updated_at();
```

### Step 2: Subscription Tier Limits

**Pack Creation Limits:**
- Free: 0 packs (can only join)
- Mid: 1 pack
- Premium: 5 packs

**Implementation:**
```typescript
// Check if user can create pack
async function canUserCreatePack(userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  const { count: existingPacks } = await supabase
    .from('packs')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId)

  const limits = {
    'free': 0,
    'mid': 1,
    'premium': 5
  }

  const limit = limits[subscription?.subscription_tier || 'free']
  return (existingPacks || 0) < limit
}
```

### Step 3: API Endpoints

**Pack Management:**
- `POST /api/packs` - Create pack (check tier limit)
- `GET /api/packs` - List all packs (with filters)
- `GET /api/packs/[id]` - Get pack details
- `PATCH /api/packs/[id]` - Update pack (admin only)
- `DELETE /api/packs/[id]` - Delete pack (admin only)
- `GET /api/packs/my-packs` - User's created packs

**Pack Membership:**
- `POST /api/packs/[id]/join` - Join pack
- `POST /api/packs/[id]/leave` - Leave pack
- `GET /api/packs/[id]/members` - List members
- `POST /api/packs/[id]/moderators` - Add moderator (admin only)
- `DELETE /api/packs/[id]/moderators/[userId]` - Remove moderator (admin only)

**Pack Posts:**
- `POST /api/packs/[id]/posts` - Add post to pack (admin/moderator)
- `DELETE /api/packs/[id]/posts/[postId]` - Remove post (admin/moderator)
- `GET /api/packs/[id]/posts` - Get pack's posts
- `PATCH /api/packs/[id]/posts/reorder` - Reorder posts (admin/moderator)

**Pack Follows:**
- `POST /api/packs/[id]/follow` - Follow pack
- `DELETE /api/packs/[id]/follow` - Unfollow pack

### Step 4: UI Components

**Components to Create:**
```
components/packs/
  ├── PackCard.tsx           # Pack thumbnail in grid
  ├── PackGrid.tsx           # Grid of pack cards
  ├── PackBanner.tsx         # Pack hero section
  ├── PackHeader.tsx         # Pack title, join button
  ├── PackPostsGrid.tsx      # Posts in pack
  ├── PackSettings.tsx       # Edit pack form
  ├── PackMembers.tsx        # Members list
  ├── CreatePackModal.tsx    # Create new pack
  ├── AddToPackModal.tsx     # Add post to pack
  └── PackSocialLinks.tsx    # Social media links
```

**Pages to Create:**
```
app/
  └── packs/
      ├── page.tsx                    # Browse all packs
      ├── create/
      │   └── page.tsx                # Create new pack
      ├── [id]/
      │   ├── page.tsx                # Pack detail page
      │   ├── edit/
      │   │   └── page.tsx            # Edit pack
      │   ├── settings/
      │   │   └── page.tsx            # Pack settings
      │   └── members/
      │       └── page.tsx            # Pack members
      └── my-packs/
          └── page.tsx                # User's packs
```

### Step 5: Post Menu Integration

**Update PostCard 3-dot menu:**
```typescript
// Add "Add to Pack" option
{
  icon: <Plus />,
  label: 'Add to Pack',
  onClick: () => setShowAddToPackModal(true),
  show: post.privacy === 'public' && userCanAddToPacks
}
```

**AddToPackModal:**
- Shows list of packs where user is admin/moderator
- Checkbox selection (can add to multiple packs)
- Shows which packs already contain this post
- Success notification after adding

### Step 6: Navigation

**Update Header:**
```tsx
<Link href="/packs">
  <Package className="h-5 w-5" />
  <span>Packs</span>
</Link>
```

**Update Profile Sidebar:**
- Add "My Packs" link
- Show pack count badge

---

## Phase 2: Enhanced Features

### Step 7: Categories & Tags

**Pack Categories:**
- 🍽️ Recipes
- 📍 Places
- 🛍️ Products
- 📚 Resources
- 🌱 Lifestyle

**Dietary Tags:**
- Gluten-free, Soy-free, Nut-free, Oil-free
- Raw, Whole-food, High-protein
- Budget-friendly, Quick (<30min)

**Cuisine Tags:**
- Italian, Asian, Mexican, Mediterranean, Indian, etc.

### Step 8: Pack Sections

**Allow organizing posts into sections:**
```sql
ALTER TABLE pack_posts ADD COLUMN section_name TEXT;
CREATE INDEX idx_pack_posts_section ON pack_posts(pack_id, section_name);
```

**UI:**
- Drag & drop sections
- Collapse/expand sections
- E.g., "Appetizers", "Mains", "Desserts"

### Step 9: Discovery Features

**Featured Packs:**
- Admin-curated packs
- Display on homepage
- "Featured" badge

**Trending Packs:**
- Most joined this week
- Most posts added this week
- Algorithm-based ranking

**Similar Packs:**
- Based on category and tags
- "You might also like..." section

### Step 10: Notifications

**Events to notify:**
- New post in followed pack
- Someone joined your pack
- Moderator added/removed
- Pack milestone (100 members, etc.)
- Your post was added to a pack

---

## Phase 3: Advanced Features

### Step 11: Analytics Dashboard

**For pack creators:**
- Total views
- Member growth chart
- Most popular posts
- Engagement rate
- Traffic sources

### Step 12: Advanced Moderation

**Features:**
- Pack guidelines/rules (markdown)
- Report packs (moderation queue)
- Member management (remove/ban)
- Post approval queue (optional)
- Activity log

### Step 13: Privacy Options

**Pack visibility:**
- **Public**: Anyone can view and join
- **Unlisted**: Only accessible with link
- **Private**: Invite-only, admin must approve

### Step 14: Location Features

**For place-based packs:**
- Location tags (city, country)
- Map view of posts
- Distance filtering
- "Near me" discovery

---

## Implementation Checklist

### MVP (Phase 1)
- [ ] Create database schema and migrations
- [ ] Add pack creation limit checks
- [ ] Build pack CRUD API endpoints
- [ ] Build pack membership API endpoints
- [ ] Build pack posts API endpoints
- [ ] Create PackCard component
- [ ] Create PackBanner component
- [ ] Create PackPostsGrid component
- [ ] Create AddToPackModal component
- [ ] Build /packs browse page
- [ ] Build /packs/[id] detail page
- [ ] Build /packs/create page
- [ ] Build /packs/[id]/edit page
- [ ] Add "Add to Pack" to post menu
- [ ] Add "Packs" to header navigation
- [ ] Add "My Packs" to profile sidebar
- [ ] Test tier limits
- [ ] Test permissions (admin/moderator/member)

### Enhanced (Phase 2)
- [ ] Add category filters
- [ ] Add dietary tags
- [ ] Implement pack sections
- [ ] Build featured packs system
- [ ] Build trending packs algorithm
- [ ] Add "Similar Packs" recommendations
- [ ] Implement pack notifications

### Advanced (Phase 3)
- [ ] Build analytics dashboard
- [ ] Add pack guidelines/rules
- [ ] Implement report system
- [ ] Add member management tools
- [ ] Add privacy options
- [ ] Add location features
- [ ] Add map view for places

---

## Success Metrics

**Key Metrics to Track:**
- Number of packs created
- Average posts per pack
- Average members per pack
- Pack creation by tier (Mid vs Premium)
- Most popular categories
- User engagement (posts added, members joined)
- Conversion: free users viewing packs → paid users creating packs

---

## Future Enhancements

**Ideas for later:**
- Pack templates (e.g., "Recipe Collection Template")
- Pack cloning (fork/duplicate)
- Collaborative packs (multiple admins)
- Pack export (PDF, website)
- Pack widgets (embed on external sites)
- Pack RSS feeds
- Pack challenges/contests
- Pack verification badge (for official accounts)
- Pack merch (for popular packs)

---

Last Updated: 2025-12-04
