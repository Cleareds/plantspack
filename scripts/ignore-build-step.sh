#!/bin/bash
# Vercel Build Step Control Script
# Simplified version - only skip builds for pure documentation changes

echo "🔍 Checking if build should run..."

# Always build on main branch
if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]]; then
  echo "✅ Main branch deployment - always building"
  exit 1  # Build
fi

# For other branches, check if only docs changed
if [[ -n "$VERCEL_GIT_COMMIT_REF" ]]; then
  # Get changed files
  CHANGED_FILES=$(git diff HEAD^ HEAD --name-only 2>/dev/null || echo "")
  
  if [[ -z "$CHANGED_FILES" ]]; then
    echo "✅ Cannot determine changes - building to be safe"
    exit 1  # Build
  fi
  
  # Check if ONLY markdown files changed
  if echo "$CHANGED_FILES" | grep -v -E "\.md$|README|CHANGELOG" > /dev/null; then
    echo "✅ Code changes detected - building"
    exit 1  # Build
  else
    echo "⏭️  Only documentation changed - skipping build"
    exit 0  # Skip build
  fi
else
  echo "✅ Non-Vercel environment - building"
  exit 1  # Build
fi