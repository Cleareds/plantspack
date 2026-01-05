import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function recreateWebhook() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🔄 Recreating Webhook Endpoint...\n')

  try {
    // 1. List existing webhooks
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
    const existingWebhook = webhooks.data.find(
      w => w.url === 'https://www.plantspack.com/api/stripe/webhooks'
    )

    if (existingWebhook) {
      console.log(`Found existing webhook: ${existingWebhook.id}`)
      console.log(`Deleting old webhook...`)
      await stripe.webhookEndpoints.del(existingWebhook.id)
      console.log(`✅ Old webhook deleted\n`)
    }

    // 2. Create new webhook
    console.log('Creating new webhook endpoint...')
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
      api_version: '2025-06-30.basil',
    })

    console.log('✅ New webhook created!\n')
    console.log('━'.repeat(60))
    console.log('\n📋 WEBHOOK DETAILS:')
    console.log(`   ID: ${newWebhook.id}`)
    console.log(`   URL: ${newWebhook.url}`)
    console.log(`   Status: ${newWebhook.status}`)
    console.log(`   Secret: ${newWebhook.secret}`)
    console.log('\n━'.repeat(60))

    console.log('\n🔧 UPDATE VERCEL ENVIRONMENT VARIABLES:\n')
    console.log('Copy and run these commands:\n')

    console.log(`echo -n "${newWebhook.secret}" | npx vercel env add STRIPE_WEBHOOK_SECRET production --scope cleareds --force`)
    console.log(`echo -n "${newWebhook.secret}" | npx vercel env add STRIPE_WEBHOOK_SECRET preview --scope cleareds --force`)
    console.log(`echo -n "${newWebhook.secret}" | npx vercel env add STRIPE_WEBHOOK_SECRET development --scope cleareds --force`)

    console.log('\n🔧 UPDATE LOCAL .env.local FILE:\n')
    console.log(`STRIPE_WEBHOOK_SECRET=${newWebhook.secret}`)

    console.log('\n✅ DONE!')
    console.log('\nNext steps:')
    console.log('1. Run the commands above to update Vercel')
    console.log('2. Update your .env.local file')
    console.log('3. Trigger a new deployment (or wait for automatic deploy)')
    console.log('4. Test subscription changes in Stripe portal')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

recreateWebhook().catch(console.error)
