#!/bin/bash
# Vercel Build Step Control Script
# This script determines when to skip builds to save resources

echo "🔍 Checking if build should run..."

# Get the list of changed files
if [[ -n "$VERCEL_GIT_COMMIT_REF" ]]; then
  # We're in Vercel environment
  
  # Check if this is a main branch deployment
  if [[ "$VERCEL_GIT_COMMIT_REF" == "main" ]]; then
    echo "✅ Main branch deployment - building"
    exit 1  # Build
  fi
  
  # Check if this is a preview deployment with significant changes
  if git diff HEAD^ HEAD --name-only | grep -E "\.(tsx?|jsx?|css|md)$|package\.json|vercel\.json|next\.config" > /dev/null; then
    echo "✅ Significant changes detected - building"
    exit 1  # Build  
  fi
  
  # Check if only documentation or test files changed
  if git diff HEAD^ HEAD --name-only | grep -v -E "\.(md|spec\.ts|test\.ts)$|/tests/|README|CHANGELOG" > /dev/null; then
    echo "✅ Code changes detected - building"
    exit 1  # Build
  fi
  
  echo "⏭️  Only docs/tests changed - skipping build"
  exit 0  # Skip build
else
  # Not in Vercel environment, always build
  echo "✅ Local environment - building"
  exit 1  # Build
fi