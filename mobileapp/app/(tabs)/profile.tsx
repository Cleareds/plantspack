import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { ProfileHeader } from '@/src/components/profile/ProfileHeader';
import { ProfileTabs } from '@/src/components/profile/ProfileTabs';
import { colors } from '@/src/constants/theme';
import type { PostWithUser } from '@/src/types/database';

export default function ProfileScreen() {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    packsCount: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchUserData();
      fetchStats();
    }
  }, [profile]);

  const fetchUserData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          *,
          user:users!posts_user_id_fkey(*),
          likes:post_likes(count),
          comments:comments(count)
        `
        )
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 19);

      if (error) throw error;

      const postsWithCounts: PostWithUser[] = (data || []).map((post: any) => ({
        ...post,
        likes_count: post.likes[0]?.count || 0,
        comments_count: post.comments[0]?.count || 0,
      }));

      // Check if user liked each post
      if (user) {
        const postIds = postsWithCounts.map((p) => p.id);
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const likedPostIds = new Set(likes?.map((l) => l.post_id) || []);
        postsWithCounts.forEach((post) => {
          post.is_liked_by_user = likedPostIds.has(post.id);
        });
      }

      setPosts(postsWithCounts);
      setHasMore(postsWithCounts.length === 20);
      setPage(1);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!profile) return;

    try {
      // Posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .is('deleted_at', null);

      // Followers count
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);

      // Following count
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id);

      // Packs count (future feature)
      const packsCount = 0;

      setStats({
        postsCount: postsCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        packsCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLoadMore = async () => {
    if (!profile || !hasMore || loading) return;

    try {
      setLoading(true);

      const startIndex = page * 20;
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          *,
          user:users!posts_user_id_fkey(*),
          likes:post_likes(count),
          comments:comments(count)
        `
        )
        .eq('user_id', profile.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + 19);

      if (error) throw error;

      const newPosts: PostWithUser[] = (data || []).map((post: any) => ({
        ...post,
        likes_count: post.likes[0]?.count || 0,
        comments_count: post.comments[0]?.count || 0,
      }));

      setPosts([...posts, ...newPosts]);
      setHasMore(newPosts.length === 20);
      setPage(page + 1);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <ProfileHeader
        profile={profile}
        postsCount={stats.postsCount}
        followersCount={stats.followersCount}
        followingCount={stats.followingCount}
        isOwnProfile={true}
      />

      <ProfileTabs
        posts={posts}
        packsCount={stats.packsCount}
        loading={loading}
        onRefresh={fetchUserData}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
});
