#!/bin/bash

# Script to apply Supabase migrations
# This ensures all migrations are applied to your production database

echo "🚀 Applying Supabase migrations..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "📋 Available migrations:"
ls -1 supabase/migrations/ | grep ".sql$"
echo ""

# Apply migrations
echo "🔄 Running: npx supabase db push"
npx supabase db push

# Check the result
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations applied successfully!"
    echo ""
    echo "📝 To verify, check your Supabase dashboard:"
    echo "   1. Go to Table Editor"
    echo "   2. Check 'posts' table has these columns:"
    echo "      - post_type"
    echo "      - parent_post_id"
    echo "      - quote_content"
    echo "      - deleted_at"
    echo "      - edited_at"
    echo "      - images"
    echo ""
    echo "   3. Go to Authentication > Policies"
    echo "      Check 'posts' table has these policies:"
    echo "      - Users can view posts"
    echo "      - Users can insert posts"
    echo "      - Users can update their own posts"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    echo ""
    echo "💡 Alternative: Apply migrations manually in Supabase dashboard:"
    echo "   1. Go to SQL Editor in your Supabase dashboard"
    echo "   2. Copy and paste the contents of:"
    echo "      - supabase/migrations/20251112000001_ensure_all_columns_exist.sql"
    echo "      - supabase/migrations/20251112000000_add_post_update_delete_policies.sql"
    echo "   3. Execute each migration"
    exit 1
fi
