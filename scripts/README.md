# Development Scripts

This directory contains SQL scripts for setting up development and test data.

## Scripts

### `generate-test-users.sql`
Creates test users with different subscription levels and sample content:

- **Free User** (`freeuser`): Demonstrates free tier limits (500 chars, 3 images, no videos)
- **Supporter User** (`supporter`): Demonstrates $3 tier limits (1000 chars, 7 images, 1 video)
- **Premium User** (`premiumuser`): Demonstrates $10 tier limits (unlimited chars/images, 3 videos)

Each user has sample posts, places, and social interactions to demonstrate the platform features.

## How to Run

### Using Supabase CLI (Local Development)
```bash
# Apply the main video support migration first
npx supabase db reset

# Then add test data
psql postgres://postgres:[password]@localhost:54322/postgres < scripts/generate-test-users.sql
```

### Using Supabase Dashboard (Production/Staging)
1. Go to SQL Editor in Supabase Dashboard
2. Copy and paste the content of `generate-test-users.sql`
3. Run the script

## Test Accounts

After running the script, you can use these test accounts:

| Email | Username | Tier | Features |
|-------|----------|------|----------|
| free@test.com | freeuser | Free | 500 chars, 3 images, no videos |
| supporter@test.com | supporter | Supporter ($3) | 1000 chars, 7 images, 1 video |
| premium@test.com | premiumuser | Premium ($10) | Unlimited chars/images, 3 videos |

## Notes

- All test users are created with predictable UUIDs for easy identification
- Sample content includes various post types, images, and social interactions
- Places and favorites are included to test the map functionality
- The script is idempotent - safe to run multiple times