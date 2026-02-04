import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for checking username availability
// Uses anon key since this is a public check before authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    // Validate username parameter
    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          available: false,
          error: 'Username must be 3-20 characters and contain only lowercase letters, numbers, underscores, or hyphens'
        },
        { status: 200 }
      )
    }

    // Check if username exists
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('Error checking username:', error)
      return NextResponse.json(
        { error: 'Failed to check username availability' },
        { status: 500 }
      )
    }

    // Username is available if no user was found
    const available = !data

    return NextResponse.json({
      available,
      username
    })
  } catch (error) {
    console.error('Unexpected error in check-username:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
