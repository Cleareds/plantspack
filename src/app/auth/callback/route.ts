import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user profile exists in users table
      const { data: existingProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      // If no profile exists, create one
      if (!existingProfile && !profileError) {
        try {
          // Extract user data from OAuth metadata
          const userMetadata = data.user.user_metadata || {}
          const email = data.user.email || ''

          // Generate username from email or OAuth data
          let username = userMetadata.preferred_username ||
                        userMetadata.user_name ||
                        userMetadata.username ||
                        email.split('@')[0]

          // Make username unique by checking if it exists
          let finalUsername = username
          let counter = 1
          let usernameExists = true

          while (usernameExists) {
            const { data: existingUser } = await supabase
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

          // Create user profile
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: email,
              username: finalUsername,
              first_name: userMetadata.given_name || userMetadata.first_name || '',
              last_name: userMetadata.family_name || userMetadata.last_name || '',
              full_name: userMetadata.full_name || userMetadata.name || '',
              avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
              bio: '',
            })

          if (createError) {
            console.error('Error creating user profile:', createError)
            // Continue anyway - the auth context will handle profile creation
          } else {
            console.log('OAuth user profile created:', finalUsername)
          }
        } catch (profileCreationError) {
          console.error('Error in profile creation:', profileCreationError)
          // Continue anyway - the auth context will handle profile creation
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}