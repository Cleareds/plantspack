# Manual Database Setup

Since the automated scripts are having connectivity issues, here's a simple manual setup you can do through Supabase Studio.

## Step 1: Start your development environment

```bash
# Start Supabase (if not already running)
npm run db:start

# Start the app
npm run dev
```

## Step 2: Open Supabase Studio

Go directly to: **http://localhost:54323**

```bash
# This just reminds you of the URL
npm run db:studio
```

## Step 3: Create test users manually

### Option A: Through the Auth tab in Studio
1. Go to Authentication → Users in Supabase Studio
2. Click "Add user"
3. Create these users:

| Email | Password | Confirm Email |
|-------|----------|---------------|
| test@example.com | password123 | ✓ |
| emma@veganlife.com | password123 | ✓ |
| marcus@plantbased.org | password123 | ✓ |

### Option B: Through SQL Editor
Go to SQL Editor in Studio and run:

```sql
-- Create test users in auth.users (this creates the authentication records)
-- Note: You'll need to do this through the Auth UI above, as SQL inserts to auth.users are restricted
```

## Step 4: Create user profiles

In the SQL Editor, run:

```sql
-- Insert user profiles (replace the UUIDs with actual auth user IDs from step 3)
-- You can find the actual UUIDs in Authentication → Users

-- Get the UUIDs first:
SELECT id, email FROM auth.users;

-- Then insert profiles using the actual UUIDs:
INSERT INTO public.users (id, email, username, first_name, last_name, bio) VALUES
  ('UUID_FROM_AUTH_USERS', 'test@example.com', 'testuser', 'Test', 'User', 'Test user for vegan social app 🌱'),
  ('UUID_FROM_AUTH_USERS', 'emma@veganlife.com', 'emmagreen', 'Emma', 'Green', 'Plant-based lifestyle enthusiast 🌱'),
  ('UUID_FROM_AUTH_USERS', 'marcus@plantbased.org', 'marcusplant', 'Marcus', 'Plant', 'Fitness coach promoting plant-powered performance 💪');
```

## Step 5: Create sample posts

```sql
-- Create sample posts (use the actual user IDs from step 4)
INSERT INTO public.posts (user_id, content, privacy) VALUES
  ('UUID_OF_TEST_USER', 'Just discovered this amazing cashew-based cheese recipe! 🧀 The texture is so creamy and the flavor is incredible. Plant-based alternatives keep getting better! #VeganCheese #PlantBased', 'public'),
  ('UUID_OF_EMMA', 'Morning smoothie bowl with fresh berries, granola, and almond butter 🍓🥣 Starting the day with plants gives me so much energy!', 'public'),
  ('UUID_OF_MARCUS', 'Completed my first plant-powered marathon today! 🏃‍♂️💨 Proving once again that you don''t need animal products for peak performance.', 'public');
```

## Step 6: Create sample places

```sql
-- Create sample places for the map
INSERT INTO public.places (name, description, category, latitude, longitude, address, created_by) VALUES
  ('Green Seed Vegan', 'Farm-to-table vegan restaurant featuring seasonal California cuisine', 'restaurant', 37.7849, -122.4094, '2205 Fillmore St, San Francisco, CA 94115', 'UUID_OF_TEST_USER'),
  ('The Plant Café Organic', 'Organic, locally-sourced plant-based meals in a cozy atmosphere', 'restaurant', 37.8019, -122.4180, '2884 Webster St, San Francisco, CA 94123', 'UUID_OF_EMMA'),
  ('Weekly Farmers Market', 'Every Saturday! Local organic produce, vegan food vendors, and live music', 'event', 37.7849, -122.4094, 'Ferry Building, San Francisco, CA 94111', 'UUID_OF_MARCUS');
```

## Step 7: Test the application

1. Go to http://localhost:3000
2. Try logging in with any of the test credentials:
   - Email: test@example.com, Password: password123
   - Email: emma@veganlife.com, Password: password123  
   - Email: marcus@plantbased.org, Password: password123

3. Test username login:
   - Username: testuser, Password: password123
   - Username: emmagreen, Password: password123
   - Username: marcusplant, Password: password123

4. Check the map at http://localhost:3000/map
5. Check profiles at http://localhost:3000/profile/testuser

## Simplified One-Command Solution

For the future, you only need:

```bash
# This starts everything you need
npm run dev:full
```

Then manually add users through Supabase Studio as described above.

## Troubleshooting

- **Login not working**: Make sure you created both auth users (step 3) AND profiles (step 4)
- **Profile 404**: Check that the username in the public.users table matches the URL
- **No posts showing**: Verify posts were inserted with correct user_id values
- **Map empty**: Check that places were inserted with valid latitude/longitude

## Database Schema

Your tables are:
- `auth.users` - Supabase authentication (managed through Auth UI)
- `public.users` - User profiles with usernames, bios, etc.
- `public.posts` - User posts
- `public.places` - Vegan-friendly locations
- `public.follows` - User follow relationships
- `public.post_likes` - Post likes
- `public.comments` - Post comments
- `public.favorite_places` - User's favorite places