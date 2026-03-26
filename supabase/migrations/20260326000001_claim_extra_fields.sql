-- Add extra fields to place_claim_requests for better verification
ALTER TABLE place_claim_requests
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS business_role text DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS website_url text;
