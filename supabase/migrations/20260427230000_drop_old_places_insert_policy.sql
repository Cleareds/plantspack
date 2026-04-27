-- The previous community-readiness migration added a rate-limited INSERT policy
-- on `places` but didn't drop the original "Users can add places" policy from
-- 20251112000000_add_post_update_delete_policies.sql. Since Postgres OR's
-- multiple permissive policies, the original would let unrestricted inserts
-- through, bypassing our new rate limit.
--
-- Drop it so the rate-limited policy is the only enforcer for community submissions.

DROP POLICY IF EXISTS "Users can add places" ON public.places;
