-- Allow 'barcode' as a valid tool value in tool_scans so signed-in users
-- get a server-side history of OFF lookups alongside ingredient/menu scans.
ALTER TABLE public.tool_scans
  DROP CONSTRAINT IF EXISTS tool_scans_tool_check;

ALTER TABLE public.tool_scans
  ADD CONSTRAINT tool_scans_tool_check
  CHECK (tool IN ('ingredient', 'menu', 'barcode'));
