import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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
        proof_description,
        status,
        places!place_claim_requests_place_id_fkey (
          id,
          slug,
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

      // Bust the place page's ISR cache. Without this the owner cannot edit.
      //
      // /place/[id] is ISR with revalidate = 86400, and it bakes the owner
      // (from get_place_owner) into the rendered HTML. PlaceEditButton decides
      // between "Edit" and "Suggest correction" by comparing the signed-in user
      // against that baked-in `owner.user_id`. So until the page regenerates,
      // a freshly approved owner is served HTML where owner === null and only
      // ever sees "Suggest correction" — for up to 24 hours after approval.
      //
      // Reported 2026-08-10 for /place/kookplant-drongen: ownership granted
      // 12:45 UTC, owner still submitting suggestions hours later because the
      // cached page predated the approval. The server-side permission check in
      // PUT /api/places/[id] already accepted them the whole time; only the UI
      // was stale. Every other place-mutating route already does this.
      const placeSlug = (claim.places as any)?.slug as string | undefined
      try {
        revalidatePath(`/place/${claim.place_id}`)
        if (placeSlug) revalidatePath(`/place/${placeSlug}`)
      } catch (revalidateErr) {
        // Never fail an approved claim because cache busting failed.
        console.error('[Admin Claims API] revalidatePath failed:', revalidateErr)
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

        const placeUrl = `https://www.plantspack.com/place/${claim.place_id}`

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
