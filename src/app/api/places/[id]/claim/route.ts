import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendClaimRequestEmail } from '@/lib/email'
import type { ClaimFormData } from '@/types/place-claims'

/**
 * GET /api/places/[id]/claim - Check if user has submitted a claim for this place
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: placeId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check claim status using database function
    const { data, error } = await supabase
      .rpc('check_user_claim_status', {
        p_user_id: session.user.id,
        p_place_id: placeId
      })
      .single()

    if (error) {
      console.error('[Claim API] Error checking claim status:', error)
      throw error
    }

    const claimData = data as any

    if (!claimData || !claimData.has_claim) {
      return NextResponse.json({
        has_claim: false
      })
    }

    return NextResponse.json({
      has_claim: true,
      claim: {
        id: claimData.claim_id,
        status: claimData.status,
        created_at: claimData.created_at,
        rejection_reason: claimData.rejection_reason
      }
    })
  } catch (error) {
    console.error('[Claim API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check claim status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/places/[id]/claim - Submit a claim request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: placeId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user details and check ban status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, is_banned')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('[Claim API] Error fetching user:', userError)
      throw userError
    }

    if (user?.is_banned) {
      return NextResponse.json(
        { error: 'Your account has been suspended and cannot submit claims' },
        { status: 403 }
      )
    }

    // Rate limiting: 3 claims per day
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: userId,
        p_action_type: 'place_claim',
        p_max_actions: 3,
        p_window_minutes: 1440 // 24 hours
      })

    if (rateLimitError) {
      console.error('[Claim API] Rate limit check error:', rateLimitError)
    } else if (rateLimitData === false) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can submit up to 3 claims per day.' },
        { status: 429 }
      )
    }

    // Verify place exists
    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id, name, address')
      .eq('id', placeId)
      .single()

    if (placeError || !place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Check if place already has an owner
    const { data: existingOwner } = await supabase
      .from('place_owners')
      .select('id')
      .eq('place_id', placeId)
      .is('removed_at', null)
      .maybeSingle()

    if (existingOwner) {
      return NextResponse.json(
        { error: 'This place already has a verified owner' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body: ClaimFormData = await request.json()
    const { first_name, last_name, email, proof_description } = body

    // Validation
    if (!first_name || first_name.trim().length < 1 || first_name.trim().length > 100) {
      return NextResponse.json(
        { error: 'First name must be between 1 and 100 characters' },
        { status: 400 }
      )
    }

    if (!last_name || last_name.trim().length < 1 || last_name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Last name must be between 1 and 100 characters' },
        { status: 400 }
      )
    }

    if (!email || email.trim().length > 254) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!proof_description || proof_description.trim().length < 10 || proof_description.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Proof description must be between 10 and 1000 characters' },
        { status: 400 }
      )
    }

    // Check for existing claim (will be caught by unique constraint, but let's be explicit)
    const { data: existingClaim } = await supabase
      .from('place_claim_requests')
      .select('id, status')
      .eq('place_id', placeId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingClaim) {
      if (existingClaim.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending claim for this place' },
          { status: 400 }
        )
      } else if (existingClaim.status === 'approved') {
        return NextResponse.json(
          { error: 'Your claim for this place has already been approved' },
          { status: 400 }
        )
      }
      // If rejected, allow resubmission by deleting old claim
      await supabase
        .from('place_claim_requests')
        .delete()
        .eq('id', existingClaim.id)
    }

    // Create claim request
    const { data: claim, error: createError } = await supabase
      .from('place_claim_requests')
      .insert({
        place_id: placeId,
        user_id: userId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        proof_description: proof_description.trim()
      })
      .select()
      .single()

    if (createError) {
      console.error('[Claim API] Error creating claim:', createError)
      throw createError
    }

    // Send email notification to admins
    try {
      await sendClaimRequestEmail({
        place_name: place.name,
        place_id: place.id,
        place_address: place.address,
        user_name: user.username,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        proof_description: proof_description.trim(),
        claim_id: claim.id
      })
    } catch (emailError) {
      console.error('[Claim API] Failed to send email notification:', emailError)
      // Don't fail the request if email fails
    }

    console.log('[Claim API] Claim submitted:', claim.id)

    return NextResponse.json(
      {
        success: true,
        claim: {
          id: claim.id,
          status: claim.status,
          created_at: claim.created_at
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Claim API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit claim request' },
      { status: 500 }
    )
  }
}
