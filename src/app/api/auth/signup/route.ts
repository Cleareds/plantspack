import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/auth/signup - Handle user registration with server-side validation
 * Validates email and username availability before creating account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, username, firstName, lastName } = body

    // Server-side validation
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters and contain only lowercase letters, numbers, underscores, or hyphens' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Use admin client for validation checks (bypasses RLS)
    const adminClient = createAdminClient()

    // Check if email already exists in auth.users
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      console.error('Error checking existing users:', listError)
      // Continue anyway, Supabase auth will catch duplicate emails
    } else {
      const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
    }

    // Check if username already exists in users table
    const { data: existingUsername } = await adminClient
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken. Please choose another.' },
        { status: 409 }
      )
    }

    // Create Supabase auth client for signup
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Create the auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'}/auth/callback`,
        data: {
          username,
          first_name: firstName || '',
          last_name: lastName || '',
        },
      },
    })

    if (signUpError) {
      console.error('Supabase signup error:', signUpError)

      // Handle specific Supabase errors
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: signUpError.message || 'Registration failed. Please try again.' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }

    // If user is immediately authenticated (email confirmation disabled)
    if (authData.session) {
      // Create user profile
      const { data: profile, error: profileError } = await adminClient
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          username,
          first_name: firstName || '',
          last_name: lastName || '',
          bio: '',
        })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // User is created in auth but profile failed - they can still login
        // Profile will be created on first login via create-profile endpoint
      }

      return NextResponse.json({
        success: true,
        message: 'Account created successfully!',
        user: authData.user,
        session: authData.session,
        emailConfirmationRequired: false
      })
    } else {
      // Email confirmation is required
      // Profile will be created after email confirmation via webhook or on first login
      return NextResponse.json({
        success: true,
        message: 'Account created! Please check your email to verify your address before signing in.',
        user: authData.user,
        emailConfirmationRequired: true
      })
    }
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
