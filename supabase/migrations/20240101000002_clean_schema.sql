-- Clean schema for VeganConnect - no auth.users modifications
-- This migration is guaranteed to work in local development

-- Create custom user profiles table
create table if not exists public.users (
  id uuid not null primary key,
  email text unique not null,
  username text unique not null,
  first_name text,
  last_name text,
  bio text,
  avatar_url text,
  is_private boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create posts table
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  content text not null check (char_length(content) <= 500),
  privacy text check (privacy in ('public', 'friends')) default 'public',
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create comments table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null,
  user_id uuid not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create follows table
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(follower_id, following_id)
);

-- Create post likes table
create table if not exists public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Create places table
create table if not exists public.places (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  category text check (category in ('restaurant', 'event', 'museum', 'other')) not null,
  latitude double precision not null,
  longitude double precision not null,
  address text not null,
  website text,
  phone text,
  is_pet_friendly boolean default false,
  created_by uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create favorite places table
create table if not exists public.favorite_places (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  place_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, place_id)
);

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.places enable row level security;
alter table public.favorite_places enable row level security;

-- Users policies
create policy "Users can view all profiles" on public.users for select using (true);

-- Posts policies
create policy "Public posts are viewable by everyone" on public.posts for select using (privacy = 'public');

-- Comments policies
create policy "Comments are viewable by everyone" on public.comments for select using (true);

-- Follows policies
create policy "Follows are viewable by everyone" on public.follows for select using (true);

-- Post likes policies
create policy "Likes are viewable by everyone" on public.post_likes for select using (true);

-- Places policies
create policy "Places are viewable by everyone" on public.places for select using (true);

-- Favorite places policies - more permissive for local dev
create policy "Favorite places are viewable" on public.favorite_places for select using (true);

-- Create indexes for better performance
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
create index if not exists places_category_idx on public.places(category);
create index if not exists places_location_idx on public.places(latitude, longitude);

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Add foreign key constraints (these are safe)
alter table public.posts add constraint posts_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.comments add constraint comments_post_id_fkey foreign key (post_id) references public.posts(id) on delete cascade;
alter table public.comments add constraint comments_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.follows add constraint follows_follower_id_fkey foreign key (follower_id) references public.users(id) on delete cascade;
alter table public.follows add constraint follows_following_id_fkey foreign key (following_id) references public.users(id) on delete cascade;
alter table public.post_likes add constraint post_likes_post_id_fkey foreign key (post_id) references public.posts(id) on delete cascade;
alter table public.post_likes add constraint post_likes_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.places add constraint places_created_by_fkey foreign key (created_by) references public.users(id) on delete cascade;
alter table public.favorite_places add constraint favorite_places_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.favorite_places add constraint favorite_places_place_id_fkey foreign key (place_id) references public.places(id) on delete cascade;

-- Create triggers for updated_at (safe to create on public tables)
drop trigger if exists handle_updated_at on public.users;
create trigger handle_updated_at before update on public.users for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_updated_at on public.posts;
create trigger handle_updated_at before update on public.posts for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_updated_at on public.comments;
create trigger handle_updated_at before update on public.comments for each row execute procedure public.handle_updated_at();

drop trigger if exists handle_updated_at on public.places;
create trigger handle_updated_at before update on public.places for each row execute procedure public.handle_updated_at();