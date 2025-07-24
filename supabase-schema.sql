-- Enable RLS
alter table if exists auth.users enable row level security;

-- Create custom user profiles table
create table public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
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
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null check (char_length(content) <= 500),
  privacy text check (privacy in ('public', 'friends')) default 'public',
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create comments table
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create follows table
create table public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(follower_id, following_id)
);

-- Create post likes table
create table public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Create places table
create table public.places (
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
  created_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create favorite places table
create table public.favorite_places (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  place_id uuid references public.places(id) on delete cascade not null,
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
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Enable insert for authenticated users only" on public.users for insert with check (auth.uid() = id);

-- Posts policies
create policy "Public posts are viewable by everyone" on public.posts for select using (privacy = 'public' or auth.uid() is not null);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts" on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- Comments policies
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Users can create comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on public.comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

-- Follows policies
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow others" on public.follows for delete using (auth.uid() = follower_id);

-- Post likes policies
create policy "Likes are viewable by everyone" on public.post_likes for select using (true);
create policy "Users can like posts" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike posts" on public.post_likes for delete using (auth.uid() = user_id);

-- Places policies
create policy "Places are viewable by everyone" on public.places for select using (true);
create policy "Users can create places" on public.places for insert with check (auth.uid() = created_by);
create policy "Users can update own places" on public.places for update using (auth.uid() = created_by);
create policy "Users can delete own places" on public.places for delete using (auth.uid() = created_by);

-- Favorite places policies
create policy "Users can view own favorite places" on public.favorite_places for select using (auth.uid() = user_id);
create policy "Users can add favorite places" on public.favorite_places for insert with check (auth.uid() = user_id);
create policy "Users can remove favorite places" on public.favorite_places for delete using (auth.uid() = user_id);

-- Create indexes for better performance
create index posts_user_id_idx on public.posts(user_id);
create index posts_created_at_idx on public.posts(created_at desc);
create index comments_post_id_idx on public.comments(post_id);
create index follows_follower_id_idx on public.follows(follower_id);
create index follows_following_id_idx on public.follows(following_id);
create index post_likes_post_id_idx on public.post_likes(post_id);
create index places_category_idx on public.places(category);
create index places_location_idx on public.places(latitude, longitude);

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, username, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  return new;
end;
$$;

-- Create trigger for user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

-- Create triggers for updated_at
create trigger handle_updated_at before update on public.users for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.posts for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.comments for each row execute procedure public.handle_updated_at();
create trigger handle_updated_at before update on public.places for each row execute procedure public.handle_updated_at();