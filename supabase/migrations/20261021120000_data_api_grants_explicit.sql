-- Explicit Data API grants for every relation in public (generated 2026-10-21
-- from backups/schema-snapshot-2026-10-21-before.json). See scripts/generate-grants-migration.mjs for the rationale.
-- Idempotent: on the live DB every statement is a no-op; on a rebuilt schema it
-- restores exactly the grants production holds. RLS policies remain the gate.

-- admin_logs (table)
grant insert, select, update, delete, truncate, references, trigger on table public."admin_logs" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."admin_logs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."admin_logs" to service_role;

-- app_release_config (table)
grant insert, select, update, delete, truncate, references, trigger on table public."app_release_config" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."app_release_config" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."app_release_config" to service_role;

-- categories (table)
grant insert, select, update, delete, truncate, references, trigger on table public."categories" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."categories" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."categories" to service_role;

-- city_experiences (table)
grant insert, select, update, delete, truncate, references, trigger on table public."city_experiences" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."city_experiences" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."city_experiences" to service_role;

-- city_experiences_summary (view)
grant select on public."city_experiences_summary" to anon;
grant select on public."city_experiences_summary" to authenticated;
grant select on public."city_experiences_summary" to service_role;
revoke insert, update, delete, truncate, references, trigger on public."city_experiences_summary" from anon, authenticated;

-- city_populations (table)
grant insert, select, update, delete, truncate, references, trigger on table public."city_populations" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."city_populations" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."city_populations" to service_role;

-- city_scores (materialized view)
grant select on public."city_scores" to anon;
grant select on public."city_scores" to authenticated;
grant select on public."city_scores" to service_role;
revoke insert, update, delete, truncate, references, trigger on public."city_scores" from anon, authenticated;

-- comment_reactions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."comment_reactions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."comment_reactions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."comment_reactions" to service_role;

-- comments (table)
grant insert, select, update, delete, truncate, references, trigger on table public."comments" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."comments" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."comments" to service_role;

-- companions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."companions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."companions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."companions" to service_role;

-- contact_submissions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."contact_submissions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."contact_submissions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."contact_submissions" to service_role;

-- content_view_daily (table)
grant insert, select, update, delete, truncate, references, trigger on table public."content_view_daily" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."content_view_daily" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."content_view_daily" to service_role;

-- country_regions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."country_regions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."country_regions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."country_regions" to service_role;

-- country_regions_id_seq (sequence)
grant select, update, usage on sequence public."country_regions_id_seq" to anon;
grant select, update, usage on sequence public."country_regions_id_seq" to authenticated;
grant select, update, usage on sequence public."country_regions_id_seq" to service_role;

-- directory_cities (materialized view)
grant select on public."directory_cities" to anon;
grant select on public."directory_cities" to authenticated;
grant select on public."directory_cities" to service_role;
revoke insert, update, delete, truncate, references, trigger on public."directory_cities" from anon, authenticated;

-- directory_countries (materialized view)
grant select on public."directory_countries" to anon;
grant select on public."directory_countries" to authenticated;
grant select on public."directory_countries" to service_role;
revoke insert, update, delete, truncate, references, trigger on public."directory_countries" from anon, authenticated;

-- event_responses (table)
grant insert, select, update, delete, truncate, references, trigger on table public."event_responses" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."event_responses" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."event_responses" to service_role;

-- favorite_places (table)
grant insert, select, update, delete, truncate, references, trigger on table public."favorite_places" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."favorite_places" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."favorite_places" to service_role;

-- follows (table)
grant insert, select, update, delete, truncate, references, trigger on table public."follows" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."follows" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."follows" to service_role;

-- game_saves (table)
grant insert, select, update, delete, truncate, references, trigger on table public."game_saves" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."game_saves" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."game_saves" to service_role;

-- hashtags (table)
grant insert, select, update, delete, truncate, references, trigger on table public."hashtags" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."hashtags" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."hashtags" to service_role;

-- newsletter_sends (table)
grant insert, select, update, delete, truncate, references, trigger on table public."newsletter_sends" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."newsletter_sends" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."newsletter_sends" to service_role;

-- notification_preferences (table)
grant insert, select, update, delete, truncate, references, trigger on table public."notification_preferences" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."notification_preferences" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."notification_preferences" to service_role;

-- notifications (table)
grant insert, select, update, delete, truncate, references, trigger on table public."notifications" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."notifications" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."notifications" to service_role;

-- osm_sync_state (table)
grant insert, select, update, delete, truncate, references, trigger on table public."osm_sync_state" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."osm_sync_state" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."osm_sync_state" to service_role;

-- pack_follows (table)
grant insert, select, update, delete, truncate, references, trigger on table public."pack_follows" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_follows" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_follows" to service_role;

-- pack_members (table)
grant insert, select, update, delete, truncate, references, trigger on table public."pack_members" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_members" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_members" to service_role;

-- pack_places (table)
grant insert, select, update, delete, truncate, references, trigger on table public."pack_places" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_places" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_places" to service_role;

-- pack_posts (table)
grant insert, select, update, delete, truncate, references, trigger on table public."pack_posts" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_posts" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."pack_posts" to service_role;

-- packs (table)
grant insert, select, update, delete, truncate, references, trigger on table public."packs" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."packs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."packs" to service_role;

-- place_claim_requests (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_claim_requests" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_claim_requests" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_claim_requests" to service_role;

-- place_contributors (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_contributors" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_contributors" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_contributors" to service_role;

-- place_corrections (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_corrections" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_corrections" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_corrections" to service_role;

-- place_field_provenance (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_field_provenance" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_field_provenance" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_field_provenance" to service_role;

-- place_owners (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_owners" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_owners" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_owners" to service_role;

-- place_reports (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_reports" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_reports" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_reports" to service_role;

-- place_review_reactions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_review_reactions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_review_reactions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_review_reactions" to service_role;

-- place_review_replies (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_review_replies" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_review_replies" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_review_replies" to service_role;

-- place_reviews (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_reviews" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_reviews" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_reviews" to service_role;

-- place_search_stats (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_search_stats" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_search_stats" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_search_stats" to service_role;

-- place_slug_aliases (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_slug_aliases" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_slug_aliases" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_slug_aliases" to service_role;

-- place_staging (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_staging" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_staging" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_staging" to service_role;

-- place_submission_checks (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_submission_checks" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_submission_checks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_submission_checks" to service_role;

-- place_submissions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_submissions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_submissions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_submissions" to service_role;

-- place_verification_log (table)
grant insert, select, update, delete, truncate, references, trigger on table public."place_verification_log" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."place_verification_log" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."place_verification_log" to service_role;

-- places (table)
grant insert, select, update, delete, truncate, references, trigger on table public."places" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."places" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."places" to service_role;

-- platform_stats (materialized view)
grant select on public."platform_stats" to anon;
grant select on public."platform_stats" to authenticated;
grant select on public."platform_stats" to service_role;
revoke insert, update, delete, truncate, references, trigger on public."platform_stats" from anon, authenticated;

-- post_hashtags (table)
grant insert, select, update, delete, truncate, references, trigger on table public."post_hashtags" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."post_hashtags" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."post_hashtags" to service_role;

-- post_likes (table)
grant insert, select, update, delete, truncate, references, trigger on table public."post_likes" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."post_likes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."post_likes" to service_role;

-- post_reactions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."post_reactions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."post_reactions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."post_reactions" to service_role;

-- posts (table)
grant insert, select, update, delete, truncate, references, trigger on table public."posts" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."posts" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."posts" to service_role;

-- published_cities (table)
grant insert, select, update, delete, truncate, references, trigger on table public."published_cities" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."published_cities" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."published_cities" to service_role;

-- rate_limits (table)
grant insert, select, update, delete, truncate, references, trigger on table public."rate_limits" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."rate_limits" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."rate_limits" to service_role;

-- real_world_tree_orders (table)
grant insert, select, update, delete, truncate, references, trigger on table public."real_world_tree_orders" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."real_world_tree_orders" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."real_world_tree_orders" to service_role;

-- recipe_reviews (table)
grant insert, select, update, delete, truncate, references, trigger on table public."recipe_reviews" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."recipe_reviews" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."recipe_reviews" to service_role;

-- reports (table)
grant insert, select, update, delete, truncate, references, trigger on table public."reports" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."reports" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."reports" to service_role;

-- roadmap_votes (table)
grant insert, select, update, delete, truncate, references, trigger on table public."roadmap_votes" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."roadmap_votes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."roadmap_votes" to service_role;

-- route_places (table)
grant insert, select, update, delete, truncate, references, trigger on table public."route_places" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."route_places" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."route_places" to service_role;

-- routes (table)
grant insert, select, update, delete, truncate, references, trigger on table public."routes" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."routes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."routes" to service_role;

-- search_logs (table)
grant insert, select, update, delete, truncate, references, trigger on table public."search_logs" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."search_logs" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."search_logs" to service_role;

-- sprouts_redemptions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."sprouts_redemptions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."sprouts_redemptions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."sprouts_redemptions" to service_role;

-- subscription_events (table)
grant insert, select, update, delete, truncate, references, trigger on table public."subscription_events" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."subscription_events" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."subscription_events" to service_role;

-- subscriptions (table)
grant insert, select, update, delete, truncate, references, trigger on table public."subscriptions" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."subscriptions" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."subscriptions" to service_role;

-- tool_scans (table)
grant insert, select, update, delete, truncate, references, trigger on table public."tool_scans" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."tool_scans" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."tool_scans" to service_role;

-- user_badges (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_badges" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_badges" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_badges" to service_role;

-- user_blocks (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_blocks" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_blocks" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_blocks" to service_role;

-- user_contributions_summary (view)
grant select on public."user_contributions_summary" to anon;
grant select on public."user_contributions_summary" to authenticated;
grant select on public."user_contributions_summary" to service_role;
revoke insert, update, delete, truncate, references, trigger on public."user_contributions_summary" from anon, authenticated;

-- user_followed_cities (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_followed_cities" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_followed_cities" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_followed_cities" to service_role;

-- user_forest_trees (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_forest_trees" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_forest_trees" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_forest_trees" to service_role;

-- user_interaction_patterns (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_interaction_patterns" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_interaction_patterns" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_interaction_patterns" to service_role;

-- user_mutes (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_mutes" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_mutes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_mutes" to service_role;

-- user_place_notes (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_place_notes" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_place_notes" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_place_notes" to service_role;

-- user_preferences (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_preferences" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_preferences" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_preferences" to service_role;

-- user_push_tokens (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_push_tokens" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_push_tokens" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_push_tokens" to service_role;

-- user_sprouts_ledger (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_sprouts_ledger" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_sprouts_ledger" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_sprouts_ledger" to service_role;

-- user_trees (table)
grant insert, select, update, delete, truncate, references, trigger on table public."user_trees" to anon;
grant insert, select, update, delete, truncate, references, trigger on table public."user_trees" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."user_trees" to service_role;

-- users (table)
grant insert, update, delete, truncate, references, trigger on table public."users" to anon;
grant insert, update, delete, truncate, references, trigger on table public."users" to authenticated;
grant insert, select, update, delete, truncate, references, trigger on table public."users" to service_role;
grant select ("id") on table public."users" to anon;
grant select ("id") on table public."users" to authenticated;
grant select ("bio") on table public."users" to anon;
grant select ("bio") on table public."users" to authenticated;
grant select ("role") on table public."users" to anon;
grant select ("role") on table public."users" to authenticated;
grant select ("is_vegan") on table public."users" to anon;
grant select ("is_vegan") on table public."users" to authenticated;
grant select ("username") on table public."users" to anon;
grant select ("username") on table public."users" to authenticated;
grant select ("banned_at") on table public."users" to anon;
grant select ("banned_at") on table public."users" to authenticated;
grant select ("banned_by") on table public."users" to anon;
grant select ("banned_by") on table public."users" to authenticated;
grant select ("home_city") on table public."users" to anon;
grant select ("home_city") on table public."users" to authenticated;
grant select ("is_banned") on table public."users" to anon;
grant select ("is_banned") on table public."users" to authenticated;
grant select ("last_name") on table public."users" to anon;
grant select ("last_name") on table public."users" to authenticated;
grant select ("avatar_url") on table public."users" to anon;
grant select ("avatar_url") on table public."users" to authenticated;
grant select ("ban_reason") on table public."users" to anon;
grant select ("ban_reason") on table public."users" to authenticated;
grant select ("created_at") on table public."users" to anon;
grant select ("created_at") on table public."users" to authenticated;
grant select ("first_name") on table public."users" to anon;
grant select ("first_name") on table public."users" to authenticated;
grant select ("is_private") on table public."users" to anon;
grant select ("is_private") on table public."users" to authenticated;
grant select ("updated_at") on table public."users" to anon;
grant select ("updated_at") on table public."users" to authenticated;
grant select ("forest_size") on table public."users" to anon;
grant select ("forest_size") on table public."users" to authenticated;
grant select ("trust_score") on table public."users" to anon;
grant select ("trust_score") on table public."users" to authenticated;
grant select ("vegan_since") on table public."users" to anon;
grant select ("vegan_since") on table public."users" to authenticated;
grant select ("donor_source") on table public."users" to anon;
grant select ("donor_source") on table public."users" to authenticated;
grant select ("home_country") on table public."users" to anon;
grant select ("home_country") on table public."users" to authenticated;
grant select ("vegan_reasons") on table public."users" to anon;
grant select ("vegan_reasons") on table public."users" to authenticated;
grant select ("sprouts_seeded") on table public."users" to anon;
grant select ("sprouts_seeded") on table public."users" to authenticated;
grant select ("sprouts_balance") on table public."users" to anon;
grant select ("sprouts_balance") on table public."users" to authenticated;
grant select ("sprouts_lifetime") on table public."users" to anon;
grant select ("sprouts_lifetime") on table public."users" to authenticated;
grant select ("transition_story") on table public."users" to anon;
grant select ("transition_story") on table public."users" to authenticated;
grant select ("cooking_frequency") on table public."users" to anon;
grant select ("cooking_frequency") on table public."users" to authenticated;
grant select ("dietary_specifics") on table public."users" to anon;
grant select ("dietary_specifics") on table public."users" to authenticated;
grant select ("newsletter_opt_in") on table public."users" to anon;
grant select ("newsletter_opt_in") on table public."users" to authenticated;
grant select ("newsletter_source") on table public."users" to anon;
grant select ("newsletter_source") on table public."users" to authenticated;
grant select ("subscription_tier") on table public."users" to anon;
grant select ("subscription_tier") on table public."users" to authenticated;
grant select ("current_challenges") on table public."users" to anon;
grant select ("current_challenges") on table public."users" to authenticated;
grant select ("founding_supporter") on table public."users" to anon;
grant select ("founding_supporter") on table public."users" to authenticated;
grant select ("subscription_status") on table public."users" to anon;
grant select ("subscription_status") on table public."users" to authenticated;
grant select ("favourite_vegan_meal") on table public."users" to anon;
grant select ("favourite_vegan_meal") on table public."users" to authenticated;
grant select ("subscription_ends_at") on table public."users" to anon;
grant select ("subscription_ends_at") on table public."users" to authenticated;
grant select ("newsletter_opted_in_at") on table public."users" to anon;
grant select ("newsletter_opted_in_at") on table public."users" to authenticated;
grant select ("subscription_period_end") on table public."users" to anon;
grant select ("subscription_period_end") on table public."users" to authenticated;
grant select ("subscription_period_start") on table public."users" to anon;
grant select ("subscription_period_start") on table public."users" to authenticated;
grant select ("newsletter_unsubscribed_at") on table public."users" to anon;
grant select ("newsletter_unsubscribed_at") on table public."users" to authenticated;

-- Skipped (not owned by postgres, cannot be granted by us):
--   geography_columns (owner supabase_admin)
--   geometry_columns (owner supabase_admin)
--   spatial_ref_sys (owner supabase_admin)
