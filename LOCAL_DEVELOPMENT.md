# Local Development Setup

This guide will help you set up VeganConnect for local development with Supabase running locally and populated with dummy data.

## Prerequisites

1. **Docker** - Required for Supabase local development
   - Install from: https://docs.docker.com/get-docker/
   - Make sure Docker is running

2. **PostgreSQL client** (optional but recommended for direct database access)
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql-client`
   - Windows: Download from https://www.postgresql.org/download/windows/

## Quick Start

### 1. Start Local Supabase
```bash
npm run db:start
```
This will:
- Download and start Supabase services (PostgreSQL, Auth, API, etc.)
- Apply your database migrations
- Start local services on the following ports:
  - API: `http://localhost:54321`
  - DB: `postgresql://postgres:postgres@localhost:54322/postgres`
  - Studio: `http://localhost:54323`
  - Auth: `http://localhost:54324`

### 2. Seed the Database with Dummy Data
```bash
npm run db:seed-js
```
This will:
- Reset the database to a clean state
- Apply all migrations
- Create test users in Supabase Auth system
- Populate the database with test users, posts, places, and interactions

### 3. Start the Next.js Development Server
```bash
npm run dev
```

### 4. Or Do Everything at Once
```bash
npm run dev:full
```
This combines starting Supabase and the dev server.

## Test Users

The seed script creates 5 test users you can use:

| Email | Password | Username | Name | Bio |
|-------|----------|-----------|------|-----|
| emma@veganlife.com | password123 | emmagreen | Emma Green | Plant-based lifestyle enthusiast 🌱 |
| marcus@plantbased.org | password123 | marcusplant | Marcus Plant | Fitness coach promoting plant-powered performance 💪 |
| lily@herbivore.net | password123 | lilyherbs | Lily Herbs | Herbalist and mindful living advocate 🌿 |
| david@sprouts.com | password123 | davidsprouts | David Sprouts | Sustainable farming and permaculture enthusiast 🌾 |
| sofia@quinoalover.com | password123 | sofiaquinoa | Sofia Quinoa | Traveling the world to discover authentic vegan cuisine 🌍 |

## What's Included in the Dummy Data

### Users
- 5 test users with complete profiles and bios
- Follow relationships between users
- Different join dates (spread over the last 30 days)

### Posts
- 10+ sample posts from different users
- Mix of public and friends-only posts
- Various topics: recipes, fitness, gardening, travel
- Created at different times for realistic feed

### Places
- 8 vegan-friendly locations in San Francisco area:
  - 3 Restaurants (Green Seed Vegan, The Plant Café Organic, Buddha's Kitchen)
  - 2 Museums (California Academy of Sciences, Conservatory of Flowers)
  - 2 Events (Weekly Farmers Market, Vegan Food Festival)
  - 1 Community Space (Community Garden Project)
- Mix of pet-friendly and regular locations
- Real addresses and contact information
- Different categories to test filtering

### Interactions
- Post likes from various users
- Comments on popular posts
- Favorite places for each user
- Realistic engagement patterns

## Available NPM Scripts

### Database Management
- `npm run db:start` - Start local Supabase services
- `npm run db:stop` - Stop local Supabase services
- `npm run db:reset` - Reset database to clean state (keeps migrations)
- `npm run db:seed` - Reset and populate with dummy data
- `npm run db:populate` - Just add dummy data (without reset)

### Development
- `npm run dev` - Start Next.js development server
- `npm run dev:full` - Start Supabase + Next.js together
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Accessing Local Services

### Supabase Studio (Database GUI)
- URL: http://localhost:54323
- Use this to browse your data, run queries, and manage your database
- No login required for local development

### Direct Database Access
If you have psql installed:
```bash
psql -h localhost -p 54322 -U postgres -d postgres
```
Password: `postgres`

### API Endpoints
- REST API: http://localhost:54321/rest/v1/
- Auth API: http://localhost:54324/auth/v1/
- Realtime: ws://localhost:54321/realtime/v1/

## Testing the Application

1. **Browse Public Feed**: Visit http://localhost:3000 without logging in
2. **Sign Up**: Create a new account or use test credentials
3. **Post Content**: Create posts with different privacy settings
4. **Explore Map**: Visit http://localhost:3000/map to see vegan places
5. **User Profiles**: Visit profile pages like http://localhost:3000/profile/emmagreen

## Environment Configuration

The app is configured to use local Supabase by default. The `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

This connects to your local Supabase instance with the standard development keys.

## Troubleshooting

### Docker Issues
- Make sure Docker is running: `docker ps`
- If ports are in use, stop other services or change ports in `supabase/config.toml`

### Database Connection Issues
- Check if Supabase is running: `npx supabase status`
- Restart services: `npm run db:stop && npm run db:start`

### Migration Issues
- Reset everything: `npm run db:reset`
- Check migration files in `supabase/migrations/`

### Data Issues
- Re-seed database: `npm run db:seed`
- Check data in Supabase Studio: http://localhost:54323

### Next.js Issues
- Clear `.next` folder: `rm -rf .next`
- Restart dev server: `npm run dev`

## Making Changes

### Database Schema Changes
1. Create new migration: `npx supabase migration new your_change_name`
2. Write your SQL in the new migration file
3. Apply: `npm run db:reset`

### Adding More Dummy Data
1. Edit `supabase/seed.sql`
2. Run: `npm run db:seed`

### Switching to Production
1. Create a Supabase project at https://supabase.com
2. Update `.env.local` with your production URLs and keys
3. Run your migrations in production
4. Deploy your app

## File Structure

```
supabase/
├── config.toml              # Supabase configuration
├── migrations/              # Database migrations
│   └── 20240101000001_initial_schema.sql
└── seed.sql                 # Dummy data for local development
```

## Performance Tips

- Use Supabase Studio to monitor query performance
- Check the network tab for API calls
- Use the built-in caching for better performance
- Consider using Supabase's real-time features for live updates

Happy coding! 🌱