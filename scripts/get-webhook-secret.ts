import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function getWebhookSecret() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🔍 Getting Webhook Secret from Stripe...\n')

  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })

    if (webhooks.data.length === 0) {
      console.log('❌ No webhooks found')
      return
    }

    console.log(`Found ${webhooks.data.length} webhook endpoint(s):\n`)

    webhooks.data.forEach((webhook, index) => {
      console.log(`${index + 1}. Webhook: ${webhook.id}`)
      console.log(`   URL: ${webhook.url}`)
      console.log(`   Status: ${webhook.status}`)
      console.log(`   Secret: ${webhook.secret || 'Not retrievable via API'}`)

      if (webhook.url.includes('plantspack.com')) {
        console.log(`\n   ⚠️  THIS IS THE PRODUCTION WEBHOOK`)

        if (!webhook.secret) {
          console.log(`   ⚠️  Secret is not available via API!`)
          console.log(`\n   To get the secret:`)
          console.log(`   1. Go to: https://dashboard.stripe.com/test/webhooks`)
          console.log(`   2. Click on this webhook: ${webhook.id}`)
          console.log(`   3. Click "Signing secret" to reveal it`)
          console.log(`   4. Copy the secret (starts with whsec_)`)
          console.log(`\n   Then update Vercel:`)
          console.log(`   echo -n "whsec_YOUR_SECRET_HERE" | npx vercel env add STRIPE_WEBHOOK_SECRET production --scope cleareds --force`)
        } else {
          console.log(`\n   ✅ Secret available: ${webhook.secret}`)
          console.log(`\n   Update Vercel with:`)
          console.log(`   echo -n "${webhook.secret}" | npx vercel env add STRIPE_WEBHOOK_SECRET production --scope cleareds --force`)
          console.log(`   echo -n "${webhook.secret}" | npx vercel env add STRIPE_WEBHOOK_SECRET preview --scope cleareds --force`)
          console.log(`   echo -n "${webhook.secret}" | npx vercel env add STRIPE_WEBHOOK_SECRET development --scope cleareds --force`)
        }
      }
      console.log('')
    })

    console.log('\n━'.repeat(60))
    console.log('\n⚠️  IMPORTANT:')
    console.log('The webhook secret shown above might not be the CURRENT secret.')
    console.log('Stripe only shows the secret when the webhook is first created.')
    console.log('\nIf signature verification is failing, you have 2 options:\n')
    console.log('OPTION 1: Get the secret from Stripe Dashboard')
    console.log('  1. Go to: https://dashboard.stripe.com/test/webhooks')
    console.log('  2. Click on the webhook endpoint')
    console.log('  3. Click "Signing secret" → "Reveal"')
    console.log('  4. Copy the secret and update Vercel\n')
    console.log('OPTION 2: Create a new webhook (will get new secret)')
    console.log('  Run: npx tsx scripts/recreate-webhook.ts')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

getWebhookSecret().catch(console.error)
