-- Add missing RLS policies for profile updates and inserts

-- Users policies - allow users to insert and update their own profiles
create policy "Users can insert their own profile" on public.users 
  for insert 
  with check (auth.uid() = id);

create policy "Users can update their own profile" on public.users 
  for update 
  using (auth.uid() = id) 
  with check (auth.uid() = id);

-- Posts policies - allow users to insert, update, and delete their own posts
create policy "Users can insert their own posts" on public.posts 
  for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own posts" on public.posts 
  for update 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

create policy "Users can delete their own posts" on public.posts 
  for delete 
  using (auth.uid() = user_id);

-- Comments policies - allow users to insert, update, delete their own comments
create policy "Users can insert comments" on public.comments 
  for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own comments" on public.comments 
  for update 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments" on public.comments 
  for delete 
  using (auth.uid() = user_id);

-- Follows policies - allow users to manage their own follows
create policy "Users can insert follows" on public.follows 
  for insert 
  with check (auth.uid() = follower_id);

create policy "Users can delete their own follows" on public.follows 
  for delete 
  using (auth.uid() = follower_id);

-- Post likes policies - allow users to manage their own likes
create policy "Users can insert likes" on public.post_likes 
  for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete their own likes" on public.post_likes 
  for delete 
  using (auth.uid() = user_id);

-- Places policies - allow users to insert, update, delete places they created
create policy "Users can insert places" on public.places 
  for insert 
  with check (auth.uid() = created_by);

create policy "Users can update their own places" on public.places 
  for update 
  using (auth.uid() = created_by) 
  with check (auth.uid() = created_by);

create policy "Users can delete their own places" on public.places 
  for delete 
  using (auth.uid() = created_by);

-- Favorite places policies - allow users to manage their own favorites
create policy "Users can insert favorite places" on public.favorite_places 
  for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorite places" on public.favorite_places 
  for delete 
  using (auth.uid() = user_id);