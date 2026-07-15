import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function setDefaultPortal() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found')
    return
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-06-30.basil',
  })

  console.log('🔧 Setting Default Customer Portal Configuration...\n')

  try {
    // List all configurations
    const configurations = await stripe.billingPortal.configurations.list({
      limit: 10,
    })

    console.log(`Found ${configurations.data.length} portal configuration(s):\n`)

    configurations.data.forEach((config, index) => {
      console.log(`${index + 1}. Configuration ID: ${config.id}`)
      console.log(`   Active: ${config.is_default ? '✅ DEFAULT' : '❌ Not default'}`)
      console.log(`   Headline: ${config.business_profile.headline || 'Not set'}`)
      console.log(`   Return URL: ${config.default_return_url || 'Not set'}`)
      console.log('')
    })

    // Find the Plants Pack configuration (most recent one with our headline)
    const plantspackConfig = configurations.data.find(
      config => config.business_profile.headline?.includes('Plants Pack')
    )

    if (!plantspackConfig) {
      console.error('❌ Could not find Plants Pack configuration')
      console.log('   Run: npx tsx scripts/update-stripe-branding.ts')
      return
    }

    // Update it to be the default
    const updated = await stripe.billingPortal.configurations.update(
      plantspackConfig.id,
      {
        is_default: true,
      }
    )

    console.log('✅ Portal configuration updated!')
    console.log(`   Configuration ID: ${updated.id}`)
    console.log(`   Is Default: ${updated.is_default ? '✅ YES' : '❌ NO'}`)
    console.log(`\n✅ Plants Pack portal is now the default!`)
    console.log(`\nTest it:`)
    console.log(`1. Go to: https://plantspack.com/settings`)
    console.log(`2. Click "Manage Subscription"`)
    console.log(`3. You should see "Plants Pack" branding`)
    console.log(`4. Return URL should be https://plantspack.com/settings`)
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
    } else {
      console.error('❌ Unknown error:', error)
    }
  }
}

setDefaultPortal().catch(console.error)
