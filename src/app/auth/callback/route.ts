import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { EmailOtpType } from '@supabase/supabase-js'

async function createProfileIfNeeded(userId: string, userMetadata: Record<string, any>, email: string) {
  const adminClient = createAdminClient()

  const { data: existingProfile } = await adminClient
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfile) return

  const username = userMetadata.preferred_username ||
    userMetadata.user_name ||
    userMetadata.username ||
    email.split('@')[0]

  let finalUsername = username
  let counter = 1
  let usernameExists = true

  while (usernameExists) {
    const { data: existingUser } = await adminClient
      .from('users')
      .select('username')
      .eq('username', finalUsername)
      .maybeSingle()

    if (!existingUser) {
      usernameExists = false
    } else {
      finalUsername = `${username}${counter}`
      counter++
    }
  }

  const fullName = userMetadata.full_name || userMetadata.name || ''
  const nameParts = fullName.split(' ')

  const { error: createError } = await adminClient
    .from('users')
    .insert({
      id: userId,
      email: email,
      username: finalUsername,
      first_name: userMetadata.given_name || userMetadata.first_name || nameParts[0] || '',
      last_name: userMetadata.family_name || userMetadata.last_name || nameParts.slice(1).join(' ') || '',
      avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
      bio: '',
    })

  if (createError) {
    console.error('[Auth Callback] Error creating profile:', createError)
  } else {
    console.log('[Auth Callback] Profile created:', finalUsername)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const error_description = searchParams.get('error_description')
  const error_code = searchParams.get('error')
  const next = searchParams.get('next') ?? '/'

  console.log('[Auth Callback] Params:', { code: !!code, token_hash: !!token_hash, type, error_code })

  // Handle errors passed from Supabase verify endpoint
  if (error_code) {
    console.error('[Auth Callback] Error from provider:', error_code, error_description)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error_description || 'Authentication failed')}`)
  }

  // Flow 1: Direct token_hash verification (from email template with {{ .TokenHash }})
  if (token_hash && type) {
    console.log('[Auth Callback] Verifying token_hash, type:', type)

    // Try SSR client first (has cookie access for session setting)
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (error) {
      console.error('[Auth Callback] SSR verifyOtp failed:', error.message)

      // Fallback: Use admin client to verify the user directly
      if (type === 'signup' || type === 'email') {
        console.log('[Auth Callback] Attempting admin verification fallback...')
        const adminClient = createAdminClient()

        // The token_hash verification failed, but we can try to find and confirm the user
        // via the admin API. This handles cases where PKCE state is missing.
        const { error: adminError } = await adminClient.auth.admin.listUsers()

        if (!adminError) {
          // Find user by checking if there's an unconfirmed user with a recent signup
          // that matches this token. Since we can't directly verify the token with admin,
          // redirect to login with a helpful message.
          console.error('[Auth Callback] Cannot verify token_hash via admin fallback')
        }
      }

      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message || 'Email verification failed. Please try signing in or request a new confirmation email.')}`)
    }

    if (data.user) {
      console.log('[Auth Callback] Token hash verified for user:', data.user.id, 'type:', type)
      await createProfileIfNeeded(data.user.id, data.user.user_metadata || {}, data.user.email || '')

      // Password recovery flow → redirect to set new password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Flow 2: PKCE code exchange (from {{ .ConfirmationURL }} or OAuth)
  if (code) {
    console.log('[Auth Callback] Exchanging code for session...')
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Code exchange failed:', error.message)
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message || 'Authentication failed')}`)
    }

    if (data.user) {
      console.log('[Auth Callback] Code exchanged for user:', data.user.id)
      await createProfileIfNeeded(data.user.id, data.user.user_metadata || {}, data.user.email || '')
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No valid params — show error
  console.error('[Auth Callback] No valid auth params received. Query:', Object.fromEntries(searchParams.entries()))
  return NextResponse.redirect(`${origin}/auth?error=Authentication%20failed.%20Please%20try%20again.`)
}
