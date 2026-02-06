import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  const error_code = searchParams.get('error')
  const next = searchParams.get('next') ?? '/'

  // Handle OAuth errors
  if (error_code) {
    console.error('OAuth error:', error_code, error_description)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error_description || 'Authentication failed')}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message || 'Authentication failed')}`)
    }

    if (data.user) {
      // Check if user profile exists in users table
      const { data: existingProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      // If no profile exists, create one
      if (!existingProfile && !profileError) {
        try {
          // Extract user data from OAuth or email confirmation metadata
          const userMetadata = data.user.user_metadata || {}
          const email = data.user.email || ''

          // Generate username from email or OAuth data
          const username = userMetadata.preferred_username ||
                        userMetadata.user_name ||
                        userMetadata.username ||
                        email.split('@')[0]

          // Use admin client for all user table operations during OAuth
          const adminClient = createAdminClient()

          // Make username unique by checking if it exists
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

          // Create user profile using admin client to bypass RLS
          const fullName = userMetadata.full_name || userMetadata.name || ''
          const nameParts = fullName.split(' ')

          const { error: createError } = await adminClient
            .from('users')
            .insert({
              id: data.user.id,
              email: email,
              username: finalUsername,
              first_name: userMetadata.given_name || userMetadata.first_name || nameParts[0] || '',
              last_name: userMetadata.family_name || userMetadata.last_name || nameParts.slice(1).join(' ') || '',
              avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
              bio: '',
            })

          if (createError) {
            console.error('Error creating user profile:', createError)
            // Continue anyway - the auth context will handle profile creation
          } else {
            console.log('User profile created successfully:', finalUsername)
          }
        } catch (profileCreationError) {
          console.error('Error in profile creation:', profileCreationError)
          // Continue anyway - the auth context will handle profile creation
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=Authentication%20failed.%20Please%20try%20again.`)
}