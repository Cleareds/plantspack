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
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </button>
    )
  }

  // Success message
  if (showSuccess) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-md text-sm font-medium text-green-700">
        <CheckCircle className="h-4 w-4" />
        <span>Claim submitted successfully!</span>
      </div>
    )
  }

  // Pending claim
  if (claimStatus?.has_claim && claimStatus.claim?.status === 'pending') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
        <Clock className="h-4 w-4 text-yellow-600" />
        <div className="flex flex-col">
          <span className="font-medium text-yellow-800">Claim Pending</span>
          <span className="text-xs text-yellow-700">
            Submitted {new Date(claimStatus.claim.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    )
  }

  // Approved claim (shouldn't normally see this as they'd be isOwner)
  if (claimStatus?.has_claim && claimStatus.claim?.status === 'approved') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-md text-sm">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="font-medium text-green-800">Verified Owner</span>
      </div>
    )
  }

  // Rejected claim - allow resubmission
  if (claimStatus?.has_claim && claimStatus.claim?.status === 'rejected') {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-md text-sm font-medium transition-colors"
        >
          <Building2 className="h-4 w-4" />
          <span>Claim Again</span>
        </button>
        {claimStatus.claim.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-800 mb-1">Previous claim rejected:</p>
                <p className="text-xs text-red-700">{claimStatus.claim.rejection_reason}</p>
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
        className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 hover:bg-green-50 rounded-md text-sm font-medium transition-colors"
      >
        <Building2 className="h-4 w-4" />
        <span>Claim this business</span>
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
