import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function fixWebhookUrl() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🔧 Fixing Stripe Webhook URL...\n')

  try {
    // List all webhooks
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })

    console.log(`Found ${webhooks.data.length} webhook endpoint(s):\n`)

    webhooks.data.forEach((webhook, index) => {
      console.log(`${index + 1}. ID: ${webhook.id}`)
      console.log(`   URL: ${webhook.url}`)
      console.log(`   Status: ${webhook.status}`)
      console.log('')
    })

    // Find the plantspack webhook (without www)
    const oldWebhook = webhooks.data.find(
      webhook => webhook.url === 'https://plantspack.com/api/stripe/webhooks'
    )

    if (oldWebhook) {
      console.log('❌ Found webhook with wrong URL (missing www)')
      console.log(`   Current URL: ${oldWebhook.url}`)
      console.log(`   This causes 307 redirects!\n`)

      // Update the webhook URL
      console.log('✅ Updating to: https://www.plantspack.com/api/stripe/webhooks\n')

      const updated = await stripe.webhookEndpoints.update(oldWebhook.id, {
        url: 'https://www.plantspack.com/api/stripe/webhooks',
      })

      console.log('✅ Webhook URL updated successfully!')
      console.log(`   New URL: ${updated.url}`)
      console.log(`   Status: ${updated.status}`)
      console.log(`\n✅ Webhooks should now work without 307 errors!`)
      console.log('\nTest it:')
      console.log('1. Go to: https://dashboard.stripe.com/test/webhooks')
      console.log('2. Click "Send test webhook"')
      console.log('3. Select "customer.subscription.updated"')
      console.log('4. Should return 200 OK (not 307)')
    } else {
      console.log('✅ No webhook with old URL found')

      // Check if correct webhook exists
      const correctWebhook = webhooks.data.find(
        webhook => webhook.url === 'https://www.plantspack.com/api/stripe/webhooks'
      )

      if (correctWebhook) {
        console.log('✅ Webhook with correct URL already exists:')
        console.log(`   URL: ${correctWebhook.url}`)
        console.log(`   Status: ${correctWebhook.status}`)
      } else {
        console.log('⚠️  No webhook found with correct URL')
        console.log('   Creating new webhook endpoint...\n')

        const newWebhook = await stripe.webhookEndpoints.create({
          url: 'https://www.plantspack.com/api/stripe/webhooks',
          enabled_events: [
            'checkout.session.completed',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
          ],
        })

        console.log('✅ Webhook created successfully!')
        console.log(`   ID: ${newWebhook.id}`)
        console.log(`   URL: ${newWebhook.url}`)
        console.log(`   Secret: ${newWebhook.secret}`)
        console.log(`\n⚠️  IMPORTANT: Update STRIPE_WEBHOOK_SECRET in Vercel:`)
        console.log(`   vercel env add STRIPE_WEBHOOK_SECRET production`)
        console.log(`   Value: ${newWebhook.secret}`)
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
    } else {
      console.error('❌ Unknown error:', error)
    }
  }
}

fixWebhookUrl().catch(console.error)
