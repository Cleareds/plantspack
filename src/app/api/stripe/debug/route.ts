import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // This endpoint helps debug Stripe configuration
  // Should be removed in production for security
  
  const debug = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY ? 'Set (length: ' + process.env.STRIPE_SECRET_KEY.length + ')' : 'Missing',
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set (length: ' + process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.length + ')' : 'Missing',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set (length: ' + process.env.STRIPE_WEBHOOK_SECRET.length + ')' : 'Missing',
      mediumPriceId: process.env.STRIPE_MEDIUM_PRICE_ID || 'Missing',
      premiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'Missing',
    },
    headers: {
      host: request.headers.get('host'),
      'user-agent': request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
    }
  }

  return NextResponse.json(debug)
}