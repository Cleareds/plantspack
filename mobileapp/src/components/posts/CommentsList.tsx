import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import { formatRelativeTime } from '@/src/utils/formatters';
import type { CommentWithUser } from '@/src/types/database';

interface CommentsListProps {
  postId: string;
}

export const CommentsList: React.FC<CommentsListProps> = ({ postId }) => {
  const { user, profile } = useAuthStore();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();

    // Subscribe to new comments
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          handleNewComment(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          user:users!comments_user_id_fkey(*)
        `
        )
        .eq('post_id', postId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data as CommentWithUser[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleNewComment = async (newComment: any) => {
    // Fetch the user data for the new comment
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', newComment.user_id)
      .single();

    if (userData) {
      const commentWithUser: CommentWithUser = {
        ...newComment,
        user: userData,
      };

      setComments((prev) => [...prev, commentWithUser]);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: commentText.trim(),
      });

      if (error) throw error;

      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('comments')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', commentId);

            if (error) throw error;

            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  const renderComment = ({ item }: { item: CommentWithUser }) => {
    const isOwnComment = user?.id === item.user_id;

    return (
      <View style={styles.commentItem}>
        <Avatar
          source={item.user.avatar_url ? { uri: item.user.avatar_url } : undefined}
          size={32}
        />

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.commentUserInfo}>
              <Text style={styles.commentUserName}>
                {item.user.first_name || item.user.username}
              </Text>
              <Text style={styles.commentUsername}>@{item.user.username}</Text>
              <Text style={styles.commentTime}>{formatRelativeTime(item.created_at)}</Text>
            </View>

            {isOwnComment && (
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.gray[300]} />
        <Text style={styles.emptyText}>No comments yet</Text>
        <Text style={styles.emptySubtext}>Be the first to comment!</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={comments.length === 0 ? styles.emptyList : styles.list}
        keyboardShouldPersistTaps="handled"
      />

      {/* Input Bar */}
      {user && (
        <View style={styles.inputContainer}>
          <Avatar
            source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined}
            size={32}
          />

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Write a comment..."
              placeholderTextColor={colors.text.tertiary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              editable={!isSubmitting}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!commentText.trim() || isSubmitting}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  !commentText.trim() || isSubmitting ? colors.gray[400] : colors.primary[500]
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    paddingVertical: spacing[3],
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  commentUserName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  commentUsername: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  commentTime: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  commentText: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.5,
    color: colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
    gap: spacing[3],
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    maxHeight: 100,
    paddingVertical: spacing[1],
  },
  sendButton: {
    paddingLeft: spacing[2],
    paddingBottom: spacing[1],
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
