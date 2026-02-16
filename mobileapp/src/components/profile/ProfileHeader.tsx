import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import { Avatar } from '@/src/components/ui/Avatar';
import { TierBadge } from '@/src/components/ui/TierBadge';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/formatters';
import type { Profile } from '@/src/types/database';

interface ProfileHeaderProps {
  profile: Profile;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  postsCount,
  followersCount,
  followingCount,
  isOwnProfile,
  isFollowing = false,
  onFollowToggle,
}) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [following, setFollowing] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    const previousState = following;

    // Optimistic update
    setFollowing(!following);

    try {
      if (following) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profile.id,
          });
      }

      onFollowToggle?.();
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert on error
      setFollowing(previousState);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing coming soon!');
  };

  return (
    <View style={styles.container}>
      {/* Avatar and Basic Info */}
      <View style={styles.topSection}>
        <Avatar
          source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
          size={80}
        />

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>
              {profile.first_name || profile.username}
            </Text>
            <TierBadge tier={profile.subscription_tier} size="md" />
          </View>

          <Text style={styles.username}>@{profile.username}</Text>

          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(postsCount)}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>

        <View style={styles.statDivider} />

        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(followersCount)}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(followingCount)}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {isOwnProfile ? (
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={18} color={colors.text.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.followButton, following && styles.followingButton]}
            onPress={handleFollowToggle}
            disabled={isLoading}
          >
            <Ionicons
              name={following ? 'checkmark-outline' : 'add-outline'}
              size={18}
              color={following ? colors.text.primary : colors.text.inverse}
            />
            <Text
              style={[
                styles.followButtonText,
                following && styles.followingButtonText,
              ]}
            >
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
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
  topSection: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  infoSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  displayName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  username: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  bio: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.5,
    color: colors.text.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.light,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  editButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary[500],
  },
  followingButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  followButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  followingButtonText: {
    color: colors.text.primary,
  },
});
