-- Admin-only notes on places, set during the data-quality review flow.
-- Distinct from `categorization_note` (which is for tagging/categorization
-- decisions) — admin_notes is for free-form verification notes such as
-- "called 2026-05-01, owner confirmed open", "reviewer says menu changed
-- in 2024", or "permanently closed per local Reddit thread".
ALTER TABLE places ADD COLUMN IF NOT EXISTS admin_notes TEXT;
