import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { TierBadge } from '@/src/components/ui/TierBadge';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/constants/theme';
import { formatRelativeTime, formatNumber } from '@/src/utils/formatters';
import type { PostWithUser } from '@/src/types/database';

interface PostCardProps {
  post: PostWithUser;
  onDelete?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onDelete }) => {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [isLiked, setIsLiked] = useState(post.is_liked_by_user || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const isOwnPost = user?.id === post.user_id;

  // Debug logging
  console.log('PostCard render:', {
    id: post.id,
    hasContent: !!post.content,
    contentLength: post.content?.length,
    content: post.content?.substring(0, 50),
    user: post.user?.username
  });

  const handleLike = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    const previousState = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id,
          });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(previousState);
      setLikesCount(previousCount);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    router.push(`/post/${post.id}`);
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    Alert.alert('Share', 'Share functionality coming soon!');
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('posts')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', post.id);

              onDelete?.();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUserPress = () => {
    router.push(`/profile/${post.user.username}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleUserPress}
        activeOpacity={0.7}
      >
        <Avatar
          source={post.user.avatar_url ? { uri: post.user.avatar_url } : undefined}
          size={44}
        />

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>
              {post.user.first_name || post.user.username}
            </Text>
            <TierBadge tier={post.user.subscription_tier} size="sm" />
          </View>
          <Text style={styles.username}>@{post.user.username}</Text>
          <Text style={styles.timestamp}>
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>

        {isOwnPost && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity onPress={handleComment} activeOpacity={0.95}>
        <Text style={styles.content}>{post.content}</Text>

        {/* Images */}
        {(post.images || post.image_urls) && (
          <View style={styles.imagesContainer}>
            {(post.images || post.image_urls || []).slice(0, 4).map((imageUrl, index) => (
              <Image
                key={index}
                source={{ uri: imageUrl }}
                style={[
                  styles.image,
                  (post.images || post.image_urls || []).length === 1 && styles.singleImage,
                ]}
                resizeMode="cover"
              />
            ))}
            {(post.images || post.image_urls || []).length > 4 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>
                  +{(post.images || post.image_urls || []).length - 4}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
          disabled={isLiking}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isLiked ? colors.like : colors.gray[600]}
          />
          {likesCount > 0 && (
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {formatNumber(likesCount)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.gray[600]} />
          {post.comments_count > 0 && (
            <Text style={styles.actionText}>{formatNumber(post.comments_count)}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={colors.gray[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  userName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  username: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  timestamp: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  deleteButton: {
    padding: spacing[2],
  },
  content: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.5,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  image: {
    width: '48%',
    height: 180,
    borderRadius: borderRadius.base,
    backgroundColor: colors.gray[200],
  },
  singleImage: {
    width: '100%',
    height: 240,
  },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.inverse,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    paddingTop: spacing[2],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  actionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  actionTextActive: {
    color: colors.like,
  },
});
