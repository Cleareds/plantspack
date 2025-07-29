#!/usr/bin/env node

/**
 * Vercel Debug Script
 * This script checks for common deployment issues
 */

console.log('🔍 Vercel Deployment Debug Check\n')

// Check essential environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
]

const optionalEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET'
]

console.log('📋 Required Environment Variables:')
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar]
  const status = value ? '✅' : '❌'
  const displayValue = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'MISSING'
  console.log(`${status} ${envVar}: ${displayValue}`)
})

console.log('\n📋 Optional Environment Variables (Stripe):')
optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar]
  const status = value ? '✅' : '⚠️ '
  const displayValue = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'NOT SET'
  console.log(`${status} ${envVar}: ${displayValue}`)
})

// Check if we're in Vercel environment
console.log('\n🌐 Environment Info:')
console.log(`VERCEL: ${process.env.VERCEL || 'Not detected'}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`)
console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || 'Not set'}`)

// Check if we can import key modules
console.log('\n📦 Module Import Test:')
try {
  require('next')
  console.log('✅ Next.js: OK')
} catch (e) {
  console.log('❌ Next.js: Failed to import')
}

try {
  require('@supabase/supabase-js')
  console.log('✅ Supabase: OK')
} catch (e) {
  console.log('❌ Supabase: Failed to import')
}

try {
  require('stripe')
  console.log('✅ Stripe: OK')
} catch (e) {
  console.log('⚠️  Stripe: Failed to import (optional)')
}

console.log('\n🏗️  Build Configuration Check:')
console.log(`Next.js Version: ${require('next/package.json').version}`)
console.log(`Node.js Version: ${process.version}`)

// Summary
console.log('\n📊 Summary:')
const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar])
const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar])

if (missingRequired.length === 0) {
  console.log('✅ All required environment variables are present')
} else {
  console.log(`❌ Missing required environment variables: ${missingRequired.join(', ')}`)
}

if (missingOptional.length > 0) {
  console.log(`⚠️  Missing optional environment variables: ${missingOptional.join(', ')}`)
  console.log('   (Stripe features will be disabled)')
}

console.log('\n🔗 Useful Links:')
console.log('- Vercel Dashboard: https://vercel.com/dashboard')
console.log('- Vercel Deployment Logs: Check your project dashboard')
console.log('- Environment Variables: Project Settings > Environment Variables')