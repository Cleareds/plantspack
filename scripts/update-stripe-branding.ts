import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function updateStripeBranding() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🎨 Updating Stripe Customer Portal Branding...\n')

  try {
    // Get product IDs from price IDs
    const mediumPriceId = process.env.STRIPE_MEDIUM_PRICE_ID
    const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID

    if (!mediumPriceId || !premiumPriceId) {
      console.error('❌ Missing price IDs in environment variables')
      return
    }

    // Get the products from the prices
    const mediumPrice = await stripe.prices.retrieve(mediumPriceId)
    const premiumPrice = await stripe.prices.retrieve(premiumPriceId)

    const mediumProductId = typeof mediumPrice.product === 'string' ? mediumPrice.product : mediumPrice.product.id
    const premiumProductId = typeof premiumPrice.product === 'string' ? premiumPrice.product : premiumPrice.product.id

    console.log(`Medium product: ${mediumProductId}`)
    console.log(`Premium product: ${premiumProductId}\n`)

    // Update the billing portal configuration
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your PlantsPack subscription',
        privacy_policy_url: 'https://plantspack.com/privacy',
        terms_of_service_url: 'https://plantspack.com/terms',
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address'],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'always_invoice',
          products: [
            {
              product: mediumProductId,
              prices: [mediumPriceId],
            },
            {
              product: premiumProductId,
              prices: [premiumPriceId],
            },
          ],
        },
      },
      default_return_url: 'https://plantspack.com/settings',
    })

    console.log('✅ Customer Portal configuration created!')
    console.log(`   Configuration ID: ${configuration.id}`)
    console.log(`   Business name: PlantsPack`)
    console.log(`   Default return URL: https://plantspack.com/settings`)
    console.log(`\n   Features enabled:`)
    console.log(`   - Update email and address`)
    console.log(`   - View invoice history`)
    console.log(`   - Update payment method`)
    console.log(`   - Cancel subscription (at period end)`)
    console.log(`   - Upgrade/downgrade subscription (immediate with proration)`)

    console.log(`\n✅ Portal branding updated successfully!`)
    console.log(`\nNext steps:`)
    console.log(`1. Go to: https://dashboard.stripe.com/test/settings/billing/portal`)
    console.log(`2. You should see the new configuration`)
    console.log(`3. Set it as the default if needed`)
    console.log(`4. Test by clicking "Manage Subscription" in your app`)
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error updating portal configuration:', error.message)

      if (error.message.includes('already exists')) {
        console.log('\n💡 A portal configuration already exists.')
        console.log('   You can update it manually in the Stripe Dashboard:')
        console.log('   1. Go to: https://dashboard.stripe.com/test/settings/billing/portal')
        console.log('   2. Update "Business information":')
        console.log('      - Business name: PlantsPack')
        console.log('      - Support email: support@plantspack.com')
        console.log('   3. Update "Default settings":')
        console.log('      - Default return URL: https://plantspack.com/settings')
        console.log('   4. Update "Privacy policy" and "Terms of service" URLs')
      }
    } else {
      console.error('❌ Unknown error:', error)
    }
  }
}

updateStripeBranding().catch(console.error)
