import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'posts' | 'comments' | 'post_likes' | 'follows';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeCallbacks {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

/**
 * Hook to subscribe to real-time changes in a Supabase table
 */
export function useRealtime(
  tableName: TableName,
  callbacks: RealtimeCallbacks,
  filter?: { column: string; value: string }
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create a unique channel name
    const channelName = filter
      ? `${tableName}-${filter.column}-${filter.value}`
      : `${tableName}-all`;

    // Subscribe to changes
    let query = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              callbacks.onInsert?.(payload.new);
              break;
            case 'UPDATE':
              callbacks.onUpdate?.(payload.new);
              break;
            case 'DELETE':
              callbacks.onDelete?.(payload.old);
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = query;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tableName, filter?.column, filter?.value]);

  return {
    unsubscribe: useCallback(() => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }, []),
  };
}

/**
 * Hook to subscribe to new posts in real-time
 */
export function useNewPosts(onNewPost: (post: any) => void) {
  return useRealtime('posts', {
    onInsert: onNewPost,
  });
}

/**
 * Hook to subscribe to post updates
 */
export function usePostUpdates(
  postId: string,
  onUpdate: (post: any) => void,
  onDelete: () => void
) {
  return useRealtime(
    'posts',
    {
      onUpdate,
      onDelete,
    },
    { column: 'id', value: postId }
  );
}

/**
 * Hook to subscribe to new comments on a post
 */
export function usePostComments(
  postId: string,
  onNewComment: (comment: any) => void
) {
  return useRealtime(
    'comments',
    {
      onInsert: onNewComment,
    },
    { column: 'post_id', value: postId }
  );
}

/**
 * Hook to subscribe to post likes
 */
export function usePostLikes(
  postId: string,
  onLike: (like: any) => void,
  onUnlike: (like: any) => void
) {
  return useRealtime(
    'post_likes',
    {
      onInsert: onLike,
      onDelete: onUnlike,
    },
    { column: 'post_id', value: postId }
  );
}

/**
 * Hook to subscribe to follow changes for a user
 */
export function useFollowChanges(
  userId: string,
  onFollow: (follow: any) => void,
  onUnfollow: (follow: any) => void
) {
  return useRealtime(
    'follows',
    {
      onInsert: onFollow,
      onDelete: onUnfollow,
    },
    { column: 'following_id', value: userId }
  );
}
