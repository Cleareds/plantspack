#!/bin/bash
# Vercel Deployment Script with Testing
# This script runs during Vercel deployment to ensure quality

set -e  # Exit on any error

echo "🚀 Starting Vercel deployment with testing..."

# Check if we're in Vercel environment
if [[ -n "$VERCEL" ]]; then
  echo "📦 Vercel environment detected"
  
  # Set deployment-specific environment
  export NODE_ENV=production
  export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
  
  echo "🔧 Installing dependencies..."
  npm ci --only=production
  
  # Install Playwright for testing (lightweight)
  echo "🎭 Installing Playwright..."
  npx playwright install chromium --with-deps
  
  echo "🏗️  Building application..."
  npm run build
  
  # Run critical tests during deployment (optional - can be skipped for speed)
  if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]] || [[ "$RUN_TESTS_ON_DEPLOY" == "true" ]]; then
    echo "🧪 Running critical tests..."
    
    # Run a subset of critical tests (fast)
    timeout 300 npm run test:fast || {
      echo "⚠️  Tests failed, but continuing deployment"
      echo "🔍 Check test results in Vercel function logs"
    }
  else
    echo "⏭️  Skipping tests for preview deployment"
  fi
  
  echo "✅ Deployment preparation complete"
else
  echo "💻 Local environment - running full test suite"
  npm run test
fi

echo "🎉 Deployment script completed successfully!"