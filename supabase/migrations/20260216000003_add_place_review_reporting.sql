-- Add 'place_review' to reports table check constraint
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_reported_type_check;

ALTER TABLE reports
ADD CONSTRAINT reports_reported_type_check
CHECK (reported_type IN ('post', 'comment', 'user', 'place_review'));
