import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendClaimApprovedEmail, sendClaimRejectedEmail } from '@/lib/email'

/**
 * PATCH /api/admin/claims/[claimId] - Approve or reject a claim
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const { claimId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, rejection_reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json(
        { error: 'rejection_reason is required when rejecting' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get claim details
    const { data: claim, error: claimError } = await adminClient
      .from('place_claim_requests')
      .select(`
        id,
        place_id,
        user_id,
        proof_text,
        status,
        places!place_claim_requests_place_id_fkey (
          id,
          name,
          address
        ),
        users!place_claim_requests_user_id_fkey (
          id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'Claim request not found' },
        { status: 404 }
      )
    }

    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: `Claim already ${claim.status}` },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      // Approve claim
      const { error: updateError } = await adminClient
        .from('place_claim_requests')
        .update({
          status: 'approved',
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', claimId)

      if (updateError) {
        console.error('[Admin Claims API] Error updating claim:', updateError)
        throw updateError
      }

      // Add user as place owner
      const { error: ownerError } = await adminClient
        .from('place_owners')
        .insert({
          place_id: claim.place_id,
          user_id: claim.user_id,
          claim_request_id: claimId,
          verified_by: session.user.id
        })

      if (ownerError) {
        console.error('[Admin Claims API] Error creating place owner:', ownerError)
        throw ownerError
      }

      // Send approval email
      const userEmail = (claim.users as any)?.email
      const userFirstName = (claim.users as any)?.first_name
      const userLastName = (claim.users as any)?.last_name
      const userName = (claim.users as any)?.username
      const placeName = (claim.places as any)?.name

      if (userEmail) {
        const displayName = userFirstName
          ? `${userFirstName} ${userLastName || ''}`.trim()
          : userName

        const placeUrl = `https://plantspack.com/place/${claim.place_id}`

        await sendClaimApprovedEmail(
          userEmail,
          displayName,
          placeName || 'the business',
          placeUrl
        ).catch(err => {
          console.error('[Admin Claims API] Error sending approval email:', err)
        })
      }

      console.log('[Admin Claims API] Claim approved:', claimId)

      return NextResponse.json({
        success: true,
        message: 'Claim approved and owner notified'
      })
    } else {
      // Reject claim
      const { error: updateError } = await adminClient
        .from('place_claim_requests')
        .update({
          status: 'rejected',
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason
        })
        .eq('id', claimId)

      if (updateError) {
        console.error('[Admin Claims API] Error updating claim:', updateError)
        throw updateError
      }

      // Send rejection email
      const userEmail = (claim.users as any)?.email
      const userFirstName = (claim.users as any)?.first_name
      const userLastName = (claim.users as any)?.last_name
      const userName = (claim.users as any)?.username
      const placeName = (claim.places as any)?.name

      if (userEmail) {
        const displayName = userFirstName
          ? `${userFirstName} ${userLastName || ''}`.trim()
          : userName

        await sendClaimRejectedEmail(
          userEmail,
          displayName,
          placeName || 'the business',
          rejection_reason
        ).catch(err => {
          console.error('[Admin Claims API] Error sending rejection email:', err)
        })
      }

      console.log('[Admin Claims API] Claim rejected:', claimId)

      return NextResponse.json({
        success: true,
        message: 'Claim rejected and user notified'
      })
    }
  } catch (error) {
    console.error('[Admin Claims API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process claim' },
      { status: 500 }
    )
  }
}
