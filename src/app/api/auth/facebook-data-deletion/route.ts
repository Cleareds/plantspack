import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Facebook Data Deletion Callback
 * Required endpoint for Facebook Login compliance
 * Handles user data deletion requests from Facebook
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const signedRequest = formData.get('signed_request') as string

    if (!signedRequest) {
      return NextResponse.json(
        { error: 'Missing signed_request parameter' },
        { status: 400 }
      )
    }

    // Parse the signed request
    const [encodedSig, payload] = signedRequest.split('.')
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'))

    // Verify signature if app secret is available
    const appSecret = process.env.FACEBOOK_APP_SECRET
    if (appSecret) {
      const expectedSig = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      if (encodedSig !== expectedSig) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const userId = data.user_id
    const confirmationCode = `${userId}_${Date.now()}`

    // Find and delete user data
    const adminClient = createAdminClient()

    // Find user by Facebook ID in metadata
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    const userToDelete = authUsers?.users.find(
      u => u.user_metadata?.provider_id === userId ||
           u.app_metadata?.provider_id === userId
    )

    if (userToDelete) {
      // Delete from users table
      await adminClient
        .from('users')
        .delete()
        .eq('id', userToDelete.id)

      // Delete from auth
      await adminClient.auth.admin.deleteUser(userToDelete.id)

      console.log(`Deleted user data for Facebook user: ${userId}`)
    }

    // Return confirmation URL as required by Facebook
    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'}/data-deletion-confirmation?code=${confirmationCode}`

    return NextResponse.json({
      url: confirmationUrl,
      confirmation_code: confirmationCode
    })
  } catch (error) {
    console.error('Facebook data deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to display data deletion policy
 */
export async function GET() {
  return NextResponse.json({
    message: 'Facebook Data Deletion Callback',
    description: 'This endpoint handles data deletion requests from Facebook users.',
    policy: 'When a user requests data deletion through Facebook, all their profile data, posts, and related content will be permanently deleted from our system within 30 days.',
    contact: 'For questions, please contact support through our website.'
  })
}
