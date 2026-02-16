'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { CheckCircle, XCircle, Clock, MapPin, User, Mail, FileText, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface PlaceClaim {
  id: string
  place_id: string
  user_id: string
  proof_text: string
  status: string
  created_at: string
  reviewed_at: string | null
  rejection_reason: string | null
  places: {
    name: string
    address: string
  } | null
  users: {
    username: string
    email: string
    first_name: string
    last_name: string
  } | null
}

export default function ClaimsManagement() {
  const { user } = useAuth()
  const [claims, setClaims] = useState<PlaceClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [processingClaim, setProcessingClaim] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)

  useEffect(() => {
    loadClaims()
  }, [filterStatus])

  const loadClaims = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('place_claim_requests')
        .select(`
          id,
          place_id,
          user_id,
          proof_text,
          status,
          created_at,
          reviewed_at,
          rejection_reason,
          places!place_claim_requests_place_id_fkey (name, address),
          users!place_claim_requests_user_id_fkey (username, email, first_name, last_name)
        `)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to match interface (Supabase returns single objects for foreign keys with !inner)
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        places: item.places || null,
        users: item.users || null
      }))

      setClaims(transformedData as PlaceClaim[])
    } catch (error) {
      console.error('Error loading claims:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (claimId: string) => {
    if (!confirm('Approve this claim and grant ownership?')) return

    setProcessingClaim(claimId)
    try {
      const response = await fetch(`/api/admin/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ ' + data.message)
        loadClaims()
      } else {
        alert('❌ ' + (data.error || 'Failed to approve claim'))
      }
    } catch (error) {
      console.error('Error approving claim:', error)
      alert('Failed to approve claim')
    } finally {
      setProcessingClaim(null)
    }
  }

  const handleReject = async (claimId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setProcessingClaim(claimId)
    try {
      const response = await fetch(`/api/admin/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReason.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ ' + data.message)
        setShowRejectModal(null)
        setRejectionReason('')
        loadClaims()
      } else {
        alert('❌ ' + (data.error || 'Failed to reject claim'))
      }
    } catch (error) {
      console.error('Error rejecting claim:', error)
      alert('Failed to reject claim')
    } finally {
      setProcessingClaim(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Business Claims Management</h1>
        <p className="text-gray-600 mt-1">Review and approve business ownership claims</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Status
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No {filterStatus !== 'all' ? filterStatus : ''} claims found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {claim.places?.name}
                    </h3>
                    {getStatusBadge(claim.status)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {claim.places?.address}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              {/* Claimant Info */}
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Claimant Information
                </h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Name:</strong> {claim.users?.first_name} {claim.users?.last_name}</p>
                  <p><strong>Username:</strong> @{claim.users?.username}</p>
                  <p className="flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {claim.users?.email}
                  </p>
                </div>
              </div>

              {/* Proof */}
              <div className="bg-blue-50 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Proof of Ownership
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{claim.proof_text}</p>
              </div>

              {/* Rejection Reason */}
              {claim.status === 'rejected' && claim.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <h4 className="text-sm font-medium text-red-900 mb-2">Rejection Reason:</h4>
                  <p className="text-sm text-red-800 whitespace-pre-wrap">{claim.rejection_reason}</p>
                </div>
              )}

              {/* Actions */}
              {claim.status === 'pending' && (
                <div className="flex items-center space-x-3 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(claim.id)}
                    disabled={processingClaim === claim.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {processingClaim === claim.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve & Notify
                  </button>
                  <button
                    onClick={() => setShowRejectModal(claim.id)}
                    disabled={processingClaim === claim.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                  <a
                    href={`/place/${claim.place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    View Place
                  </a>
                  <a
                    href={`/profile/${claim.users?.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reject Claim</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this claim. The user will receive an email with this reason and instructions to contact support.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="e.g., Insufficient proof of ownership provided. Please submit business registration documents or other official proof."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectionReason.trim() || processingClaim === showRejectModal}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingClaim === showRejectModal ? 'Processing...' : 'Reject & Notify User'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectionReason('')
                }}
                disabled={processingClaim === showRejectModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
