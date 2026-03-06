import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import { formatRelativeTime, formatNumber } from '@/src/utils/formatters';
import type { PostWithUser } from '@/src/types/database';

interface PostCardSimpleProps {
  post: PostWithUser;
}

export const PostCardSimple: React.FC<PostCardSimpleProps> = ({ post }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(post.is_liked_by_user || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  const tierColors = {
    free: colors.gray[500],
    medium: colors.primary[500],
    premium: '#9333EA',
  };

  const tierColor = tierColors[post.user?.subscription_tier || 'free'];

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to like posts');
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
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setIsLiked(previousState);
      setLikesCount(previousCount);
      Alert.alert('Error', 'Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    Alert.alert('Image', 'Full screen image viewer coming soon!', [
      { text: 'OK' }
    ]);
  };

  const renderContent = () => {
    if (!post.content || post.content.length === 0) return null;

    // Simple link detection and rendering
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = post.content.split(urlRegex);

    return (
      <Text style={styles.content}>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            return (
              <Text
                key={index}
                style={styles.link}
                onPress={() => Linking.openURL(part)}
              >
                {part}
              </Text>
            );
          }
          // Simple hashtag styling
          return part.split(/(#\w+)/g).map((subPart, subIndex) => {
            if (subPart.startsWith('#')) {
              return (
                <Text key={`${index}-${subIndex}`} style={styles.hashtag}>
                  {subPart}
                </Text>
              );
            }
            return <Text key={`${index}-${subIndex}`}>{subPart}</Text>;
          });
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>
              {post.user?.first_name || post.user?.username || 'Unknown'}
            </Text>
            {post.user?.subscription_tier && post.user.subscription_tier !== 'free' && (
              <View style={[styles.badge, { backgroundColor: tierColor }]}>
                <Ionicons name="star" size={10} color="white" />
                <Text style={styles.badgeText}>
                  {post.user.subscription_tier === 'medium' ? 'Supporter' : 'Premium'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{post.user?.username || 'unknown'}</Text>
          <Text style={styles.timestamp}>{formatRelativeTime(post.created_at)}</Text>
        </View>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Images */}
      {(post.images || post.image_urls) && (post.images?.length > 0 || post.image_urls?.length > 0) && (
        <View style={styles.imagesContainer}>
          {((post.images || post.image_urls) || []).slice(0, 4).map((imageUrl, index) => (
            <TouchableOpacity key={index} onPress={() => handleImagePress(imageUrl)}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Videos */}
      {post.video_urls && post.video_urls.length > 0 && (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="play-circle" size={48} color={colors.primary[500]} />
          <Text style={styles.videoText}>Video playback coming soon</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={isLiking}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? colors.like : colors.gray[600]}
          />
          {likesCount > 0 && (
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {formatNumber(likesCount)}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Comments', 'Comments coming soon!')}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.gray[600]} />
          {post.comments_count > 0 && (
            <Text style={styles.actionText}>{formatNumber(post.comments_count)}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Share', 'Share coming soon!')}
        >
          <Ionicons name="share-outline" size={18} color={colors.gray[600]} />
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
    marginBottom: spacing[3],
  },
  userInfo: {
    flex: 1,
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: 'white',
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
    marginBottom: spacing[3],
  },
  image: {
    width: '48%',
    height: 180,
    borderRadius: borderRadius.base,
    backgroundColor: colors.gray[200],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
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
  link: {
    color: colors.primary[500],
    textDecorationLine: 'underline',
  },
  hashtag: {
    color: colors.primary[500],
    fontWeight: typography.weights.semibold,
  },
  videoPlaceholder: {
    height: 200,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  videoText: {
    marginTop: spacing[2],
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
});
