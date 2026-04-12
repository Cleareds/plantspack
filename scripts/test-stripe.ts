import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function testStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
    return
  }

  console.log('Testing Stripe connection...')
  console.log('Secret Key prefix:', secretKey.substring(0, 20) + '...')

  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
    })

    console.log('\n1. Testing connection by listing products...')
    const products = await stripe.products.list({ limit: 3 })
    console.log(`✅ Connection successful! Found ${products.data.length} products`)

    console.log('\n2. Testing Medium Price ID...')
    const mediumPriceId = process.env.STRIPE_MEDIUM_PRICE_ID
    if (mediumPriceId) {
      const price = await stripe.prices.retrieve(mediumPriceId)
      console.log(`✅ Medium price found: $${(price.unit_amount || 0) / 100}/${price.recurring?.interval}`)
    }

    console.log('\n3. Testing Premium Price ID...')
    const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID
    if (premiumPriceId) {
      const price = await stripe.prices.retrieve(premiumPriceId)
      console.log(`✅ Premium price found: $${(price.unit_amount || 0) / 100}/${price.recurring?.interval}`)
    }

    console.log('\n✅ All tests passed! Stripe is configured correctly.')
  } catch (error) {
    console.error('\n❌ Stripe test failed:')
    if (error instanceof Error) {
      console.error('Error:', error.message)
      console.error('Details:', error)
    }
  }
}

testStripe()
