import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

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

    // Extract user data from OAuth metadata
    const userMetadata = user.user_metadata || {}
    const email = user.email || ''

    // Generate username from email or OAuth data
    const baseUsername = userMetadata.preferred_username ||
                        userMetadata.user_name ||
                        userMetadata.username ||
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
    const fullName = userMetadata.full_name || userMetadata.name || ''
    const nameParts = fullName.split(' ')

    const { data: newProfile, error: createError } = await adminClient
      .from('users')
      .insert({
        id: user.id,
        email: email,
        username: finalUsername,
        first_name: userMetadata.given_name || userMetadata.first_name || nameParts[0] || '',
        last_name: userMetadata.family_name || userMetadata.last_name || nameParts.slice(1).join(' ') || '',
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
