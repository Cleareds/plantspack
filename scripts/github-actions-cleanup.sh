#!/bin/bash
# GitHub Actions Cleanup Script
# This script helps clean up and fix GitHub Actions issues

echo "🔧 Fixing GitHub Actions & Test Issues..."

# 1. Clean up all test artifacts
echo "🧹 Cleaning test artifacts..."
rm -rf playwright-report/
rm -rf test-results/
rm -rf .playwright/
rm -f tsconfig.tsbuildinfo

# 2. Ensure we have a package-lock.json
if [ ! -f package-lock.json ]; then
  echo "📦 Generating package-lock.json..."
  npm install
else
  echo "✅ package-lock.json already exists"
fi

# 3. Clean install to ensure consistency
echo "🔄 Clean installing dependencies..."
rm -rf node_modules
npm ci

# 4. Verify build works
echo "🏗️  Testing build..."
if npm run build; then
  echo "✅ Build successful"
else
  echo "❌ Build failed - check for errors above"
  exit 1
fi

# 5. Test if Playwright is working locally
echo "🎭 Testing Playwright setup..."
if npx playwright install chromium --with-deps; then
  echo "✅ Playwright setup successful"
else
  echo "⚠️  Playwright setup had issues, but continuing..."
fi

# 6. Clean up after build test
rm -rf .next

echo "✅ GitHub Actions cleanup complete!"
echo ""
echo "📋 What was fixed:"
echo "  - Generated/verified package-lock.json"
echo "  - Cleaned test artifacts"
echo "  - Verified build process"
echo "  - Set up Playwright"
echo ""  
echo "🚀 Next steps:"
echo "  1. Commit the package-lock.json if it was generated"
echo "  2. Push changes to trigger GitHub Actions"
echo "  3. Check GitHub Actions tab for test results"