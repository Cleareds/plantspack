-- 20261025140000 rebuilt notifications_type_check from an older list and
-- dropped 'venue_update' (added 20261023100000). Restore it.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'like','comment','follow','mention','reply','pack_update',
    'submission_received','submission_approved',
    'correction_received','correction_approved','correction_dismissed',
    'report_reviewed','report_dismissed','report_received',
    'place_nearby',
    'announcement',
    'venue_update'
  ));
