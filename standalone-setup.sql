-- Standalone setup for VeganConnect
-- This can be run directly against any PostgreSQL database
-- No Supabase-specific features, just pure PostgreSQL

-- Drop existing tables if they exist (for clean setup)
drop table if exists public.favorite_places cascade;
drop table if exists public.places cascade;
drop table if exists public.post_likes cascade;
drop table if exists public.follows cascade;
drop table if exists public.comments cascade;
drop table if exists public.posts cascade;
drop table if exists public.users cascade;

-- Create users table
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique not null,
  first_name text,
  last_name text,
  bio text,
  avatar_url text,
  is_private boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create posts table
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null check (char_length(content) <= 500),
  privacy text check (privacy in ('public', 'friends')) default 'public',
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create follows table
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(follower_id, following_id)
);

-- Create post likes table
create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

-- Create places table
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text check (category in ('restaurant', 'event', 'museum', 'other')) not null,
  latitude double precision not null,
  longitude double precision not null,
  address text not null,
  website text,
  phone text,
  is_pet_friendly boolean default false,
  created_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create favorite places table
create table public.favorite_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  place_id uuid references public.places(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, place_id)
);

-- Create indexes
create index posts_user_id_idx on public.posts(user_id);
create index posts_created_at_idx on public.posts(created_at desc);
create index comments_post_id_idx on public.comments(post_id);
create index follows_follower_id_idx on public.follows(follower_id);
create index follows_following_id_idx on public.follows(following_id);
create index post_likes_post_id_idx on public.post_likes(post_id);
create index places_category_idx on public.places(category);
create index places_location_idx on public.places(latitude, longitude);

-- Function to update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
create trigger handle_updated_at before update on public.users for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.posts for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.comments for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.places for each row execute procedure public.handle_updated_at();

-- Insert test data
insert into public.users (id, email, username, first_name, last_name, bio, created_at) values
('11111111-1111-1111-1111-111111111111', 'emma@veganlife.com', 'emmagreen', 'Emma', 'Green', 'Plant-based lifestyle enthusiast 🌱 | Love exploring new vegan restaurants and sharing recipes!', now() - interval '30 days'),
('22222222-2222-2222-2222-222222222222', 'marcus@plantbased.org', 'marcusplant', 'Marcus', 'Plant', 'Fitness coach promoting plant-powered performance 💪 | Marathon runner | Dog dad 🐕', now() - interval '25 days'),
('33333333-3333-3333-3333-333333333333', 'lily@herbivore.net', 'lilyherbs', 'Lily', 'Herbs', 'Herbalist and mindful living advocate 🌿 | Sharing natural healing wisdom', now() - interval '20 days'),
('44444444-4444-4444-4444-444444444444', 'david@sprouts.com', 'davidsprouts', 'David', 'Sprouts', 'Sustainable farming and permaculture enthusiast 🌾 | Growing our future', now() - interval '15 days'),
('55555555-5555-5555-5555-555555555555', 'sofia@quinoalover.com', 'sofiaquinoa', 'Sofia', 'Quinoa', 'Traveling the world to discover authentic vegan cuisine 🌍 | Food blogger', now() - interval '10 days');

-- Insert sample posts
insert into public.posts (user_id, content, privacy, created_at) values
('11111111-1111-1111-1111-111111111111', 'Just discovered this amazing cashew-based cheese recipe! 🧀 The texture is so creamy and the flavor is incredible. Plant-based alternatives keep getting better! #VeganCheese #PlantBased', 'public', now() - interval '2 days'),
('11111111-1111-1111-1111-111111111111', 'Morning smoothie bowl with fresh berries, granola, and almond butter 🍓🥣 Starting the day with plants gives me so much energy!', 'public', now() - interval '5 days'),
('22222222-2222-2222-2222-222222222222', 'Completed my first plant-powered marathon today! 🏃‍♂️💨 Proving once again that you don''t need animal products for peak performance. Fueled entirely by fruits, nuts, and determination!', 'public', now() - interval '1 day'),
('22222222-2222-2222-2222-222222222222', 'Pre-workout fuel: banana with almond butter and a green smoothie 🍌💚 Plant protein is all you need for strength training!', 'public', now() - interval '4 days'),
('33333333-3333-3333-3333-333333333333', 'Harvested fresh herbs from my garden today 🌿 There''s something magical about growing your own medicine. Today''s haul: basil, rosemary, thyme, and lavender.', 'public', now() - interval '3 days'),
('44444444-4444-4444-4444-444444444444', 'Planting season is here! 🌱 Started 50 tomato seedlings and 30 pepper plants. This year''s goal is to supply 5 local restaurants with fresh organic produce.', 'public', now() - interval '7 days'),
('55555555-5555-5555-5555-555555555555', 'Found the most incredible street food in Bangkok! 🇹🇭 This som tam (papaya salad) was absolutely perfect - spicy, tangy, and completely plant-based. Travel blog post coming soon!', 'public', now() - interval '1 hour');

-- Insert vegan places
insert into public.places (name, description, category, latitude, longitude, address, website, phone, is_pet_friendly, created_by, created_at) values
('Green Seed Vegan', 'Farm-to-table vegan restaurant featuring seasonal California cuisine with creative plant-based dishes.', 'restaurant', 37.7849, -122.4094, '2205 Fillmore St, San Francisco, CA 94115', 'https://greenseedvegan.com', '(415) 885-4311', true, '11111111-1111-1111-1111-111111111111', now() - interval '20 days'),
('The Plant Café Organic', 'Organic, locally-sourced plant-based meals in a cozy atmosphere. Great for brunch and healthy bowls!', 'restaurant', 37.8019, -122.4180, '2884 Webster St, San Francisco, CA 94123', 'https://theplantcafe.com', '(415) 931-2777', true, '22222222-2222-2222-2222-222222222222', now() - interval '18 days'),
('Buddha''s Kitchen', 'Asian-fusion vegan restaurant with incredible mock meat dishes and traditional favorites.', 'restaurant', 37.7849, -122.4186, '1800 Fillmore St, San Francisco, CA 94115', 'https://buddhaskitchensf.com', '(415) 921-1218', false, '33333333-3333-3333-3333-333333333333', now() - interval '15 days'),
('Weekly Farmers Market', 'Every Saturday! Local organic produce, vegan food vendors, and live music. Dog-friendly market.', 'event', 37.7849, -122.4094, 'Ferry Building, San Francisco, CA 94111', 'https://ferrybuildingmarketplace.com', null, true, '11111111-1111-1111-1111-111111111111', now() - interval '5 days'),
('Conservatory of Flowers', 'Historic Victorian greenhouse with exotic plants from around the world. Perfect for plant lovers!', 'museum', 37.7714, -122.4606, '100 John F Kennedy Dr, San Francisco, CA 94117', 'https://conservatoryofflowers.org', '(415) 831-2090', true, '55555555-5555-5555-5555-555555555555', now() - interval '10 days');

-- Insert some follows
insert into public.follows (follower_id, following_id, created_at) values
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', now() - interval '20 days'),
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', now() - interval '18 days'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', now() - interval '19 days'),
('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', now() - interval '12 days');

-- Insert some likes
insert into public.post_likes (post_id, user_id)
select p.id, u.id
from public.posts p, public.users u
where 
  (p.content like '%cashew-based cheese%' and u.username in ('marcusplant', 'lilyherbs'))
  or (p.content like '%marathon%' and u.username in ('emmagreen', 'davidsprouts'))
  or (p.content like '%Bangkok%' and u.username in ('emmagreen', 'marcusplant'));

-- Insert some comments
insert into public.comments (post_id, user_id, content, created_at)
select p.id, '22222222-2222-2222-2222-222222222222', 'I need this recipe! 🙏 Have you tried making it with macadamia nuts too?', now() - interval '1 day'
from public.posts p where p.content like '%cashew-based cheese%' limit 1;

insert into public.comments (post_id, user_id, content, created_at)
select p.id, '11111111-1111-1111-1111-111111111111', 'Congratulations! 🎉 You''re such an inspiration. What was your fuel strategy during the race?', now() - interval '6 hours'
from public.posts p where p.content like '%marathon%' limit 1;

-- Insert favorite places
insert into public.favorite_places (user_id, place_id)
select u.id, p.id 
from public.users u, public.places p 
where 
  (u.username = 'emmagreen' and p.name in ('Green Seed Vegan', 'Weekly Farmers Market'))
  or (u.username = 'marcusplant' and p.name = 'The Plant Café Organic');

-- Success message
select 'VeganConnect database setup complete! 🌱' as message,
       (select count(*) from public.users) as users,
       (select count(*) from public.posts) as posts,
       (select count(*) from public.places) as places;