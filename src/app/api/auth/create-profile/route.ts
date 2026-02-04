import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

/**
 * API route to create user profile during OAuth sign-in
 * Uses admin client to bypass RLS policies
 */
export async function POST() {
  try {
    // Get the authenticated user from the session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if profile already exists
    const adminClient = createAdminClient()
    const { data: existingProfile } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { message: 'Profile already exists', profile: existingProfile },
        { status: 200 }
      )
    }

    // Extract user data from auth metadata (includes signup form data)
    const userMetadata = user.user_metadata || {}
    const email = user.email || ''

    // Generate username from metadata (prioritize form data for email/password signup)
    const baseUsername = userMetadata.username ||
                        userMetadata.preferred_username ||
                        userMetadata.user_name ||
                        email.split('@')[0] ||
                        `user_${user.id.slice(0, 8)}`

    // Make username unique
    let finalUsername = baseUsername
    let counter = 1
    let usernameExists = true

    while (usernameExists && counter < 100) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('username')
        .eq('username', finalUsername)
        .maybeSingle()

      if (!existingUser) {
        usernameExists = false
      } else {
        finalUsername = `${baseUsername}${counter}`
        counter++
      }
    }

    // Create user profile using admin client to bypass RLS
    // Priority: 1) Form data (first_name/last_name from signup)
    //           2) OAuth data (given_name/family_name)
    //           3) Full name parsing
    const firstName = userMetadata.first_name ||
                     userMetadata.given_name ||
                     ''

    const lastName = userMetadata.last_name ||
                    userMetadata.family_name ||
                    ''

    // Fallback: parse full_name or name if first/last not provided
    const fullName = userMetadata.full_name || userMetadata.name || ''
    const nameParts = fullName.split(' ')

    const finalFirstName = firstName || nameParts[0] || ''
    const finalLastName = lastName || nameParts.slice(1).join(' ') || ''

    const { data: newProfile, error: createError } = await adminClient
      .from('users')
      .insert({
        id: user.id,
        email: email,
        username: finalUsername,
        first_name: finalFirstName,
        last_name: finalLastName,
        avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
        bio: '',
      })
      .select()
      .single()

    if (createError) {
      // If profile already exists (duplicate key error), fetch and return it
      if (createError.code === '23505') {
        const { data: existingProfile } = await adminClient
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (existingProfile) {
          return NextResponse.json(
            { message: 'Profile already exists', profile: existingProfile },
            { status: 200 }
          )
        }
      }

      console.error('Error creating profile:', createError)
      return NextResponse.json(
        { error: 'Failed to create profile', details: createError.message },
        { status: 500 }
      )
    }

    // Send welcome email to new user (don't await - send in background)
    if (email) {
      sendWelcomeEmail(email, finalUsername).catch((err) => {
        console.error('Failed to send welcome email:', err)
      })
    }

    return NextResponse.json(
      { message: 'Profile created successfully', profile: newProfile },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in create-profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
