'use client'

import { useState, useEffect } from 'react'
import { Building2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import ClaimBusinessModal from './ClaimBusinessModal'
import type { ClaimStatusResponse } from '@/types/place-claims'
import Link from 'next/link'

interface ClaimBusinessButtonProps {
  placeId: string
  placeName: string
  isOwner?: boolean
}

export default function ClaimBusinessButton({
  placeId,
  placeName,
  isOwner = false
}: ClaimBusinessButtonProps) {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [claimStatus, setClaimStatus] = useState<ClaimStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (user && !isOwner) {
      fetchClaimStatus()
    } else {
      setLoading(false)
    }
  }, [user, placeId, isOwner])

  const fetchClaimStatus = async () => {
    try {
      const response = await fetch(`/api/places/${placeId}/claim`)
      if (response.ok) {
        const data = await response.json()
        setClaimStatus(data)
      }
    } catch (error) {
      console.error('Error fetching claim status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    setShowSuccess(true)
    fetchClaimStatus()

    setTimeout(() => {
      setShowSuccess(false)
    }, 5000)
  }

  // Don't show if user not logged in
  if (!user) return null

  // Don't show if user is already the owner
  if (isOwner) return null

  // Loading state
  if (loading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 ghost-border rounded-md text-sm font-medium text-outline bg-surface-container-low cursor-not-allowed"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </button>
    )
  }

  // Success message
  if (showSuccess) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant/15 rounded-md text-sm font-medium text-primary">
        <CheckCircle className="h-4 w-4" />
        <span>Claim submitted successfully!</span>
      </div>
    )
  }

  // Pending claim
  if (claimStatus?.has_claim && claimStatus.claim?.status === 'pending') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-container/20 border border-outline-variant/15 rounded-md text-sm">
        <Clock className="h-4 w-4 text-secondary" />
        <div className="flex flex-col">
          <span className="font-medium text-secondary">Claim Pending</span>
          <span className="text-xs text-secondary">
            Submitted {new Date(claimStatus.claim.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    )
  }

  // Approved claim (shouldn't normally see this as they'd be isOwner)
  if (claimStatus?.has_claim && claimStatus.claim?.status === 'approved') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant/15 rounded-md text-sm">
        <CheckCircle className="h-4 w-4 text-primary" />
        <span className="font-medium text-primary">Verified Owner</span>
      </div>
    )
  }

  // Rejected claim - allow resubmission
  if (claimStatus?.has_claim && claimStatus.claim?.status === 'rejected') {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-secondary/30 bg-secondary-container/20 hover:bg-secondary-container/30 text-secondary rounded-md text-sm font-medium transition-colors"
        >
          <Building2 className="h-4 w-4" />
          <span>Claim Again</span>
        </button>
        {claimStatus.claim.rejection_reason && (
          <div className="bg-error/10 border border-error/20 rounded-md p-3">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-error mb-1">Previous claim rejected:</p>
                <p className="text-xs text-error">{claimStatus.claim.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}
        <ClaimBusinessModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          placeId={placeId}
          placeName={placeName}
          onSuccess={handleSuccess}
        />
      </div>
    )
  }

  // No claim - show claim button
  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-surface-container-low rounded-md text-sm font-medium transition-colors"
      >
        <Building2 className="h-4 w-4" />
        <span>Claim ownership</span>
      </button>

      <ClaimBusinessModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        placeId={placeId}
        placeName={placeName}
        onSuccess={handleSuccess}
      />
    </>
  )
}
