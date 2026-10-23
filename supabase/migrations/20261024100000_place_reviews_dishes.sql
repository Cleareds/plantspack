-- Review in three taps (2026-10-24). Additive.
-- dishes: what the reviewer ate, as dish-page slugs (pizza, ramen, ...). Feeds
-- the dish pages later. content may now be empty: a rating plus dishes or a
-- photo is a valid review from the app; the website keeps asking for words.
alter table public.place_reviews add column if not exists dishes text[] not null default '{}';
alter table public.place_reviews drop constraint if exists place_reviews_content_check;
alter table public.place_reviews add constraint place_reviews_content_check check (char_length(content) <= 500);
create index if not exists place_reviews_dishes_idx on public.place_reviews using gin (dishes);
