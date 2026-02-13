// Types for business claim system

export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface PlaceClaimRequest {
  id: string
  place_id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  proof_description: string
  status: ClaimStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface PlaceOwner {
  id: string
  place_id: string
  user_id: string
  claim_request_id: string | null
  verified_at: string
  verified_by: string
  removed_at: string | null
  removed_by: string | null
  removal_reason: string | null
  created_at: string
}

export interface PlaceOwnerPublic {
  user_id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  verified_at: string
}

export interface UserOwnedPlace {
  place_id: string
  place_name: string
  place_address: string
  place_category: string
  verified_at: string
}

export interface ClaimFormData {
  first_name: string
  last_name: string
  email: string
  proof_description: string
}

export interface ClaimStatusResponse {
  has_claim: boolean
  claim?: {
    id: string
    status: ClaimStatus
    created_at: string
    rejection_reason?: string
  }
}
