import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET() {
  try {
    const stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' })
      : null

    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Stripe not initialized',
        env: {
          STRIPE_SECRET_KEY: 'Missing',
          STRIPE_MEDIUM_PRICE_ID: process.env.STRIPE_MEDIUM_PRICE_ID || 'Missing',
          STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID || 'Missing',
        }
      })
    }

    // Test the connection by listing products
    const products = await stripe.products.list({ limit: 3 })

    // Try to retrieve the price IDs
    const mediumPriceId = process.env.STRIPE_MEDIUM_PRICE_ID
    const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID

    let mediumPrice = null
    let premiumPrice = null
    let mediumError = null
    let premiumError = null

    if (mediumPriceId) {
      try {
        mediumPrice = await stripe.prices.retrieve(mediumPriceId)
      } catch (err) {
        mediumError = err instanceof Error ? err.message : 'Unknown error'
      }
    }

    if (premiumPriceId) {
      try {
        premiumPrice = await stripe.prices.retrieve(premiumPriceId)
      } catch (err) {
        premiumError = err instanceof Error ? err.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      success: true,
      connection: 'Working',
      keyType: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'Test Mode' : 'Live Mode',
      products: products.data.length,
      prices: {
        medium: {
          id: mediumPriceId,
          valid: !!mediumPrice && !mediumError,
          amount: mediumPrice?.unit_amount ? mediumPrice.unit_amount / 100 : null,
          currency: mediumPrice?.currency,
          error: mediumError
        },
        premium: {
          id: premiumPriceId,
          valid: !!premiumPrice && !premiumError,
          amount: premiumPrice?.unit_amount ? premiumPrice.unit_amount / 100 : null,
          currency: premiumPrice?.currency,
          error: premiumError
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 15) + '...'
    })
  }
}
