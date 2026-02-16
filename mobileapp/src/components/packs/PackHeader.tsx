import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/ui/Avatar';
import { TierBadge } from '@/src/components/ui/TierBadge';
import { colors, spacing, typography, borderRadius } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/formatters';
import type { Pack } from '@/src/types/database';

interface PackHeaderProps {
  pack: Pack & { members_count?: number; posts_count?: number };
  isMember: boolean;
  isFollowing: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onToggleFollow: () => void;
  loading?: boolean;
}

export const PackHeader: React.FC<PackHeaderProps> = ({
  pack,
  isMember,
  isFollowing,
  onJoin,
  onLeave,
  onToggleFollow,
  loading,
}) => {
  const handleJoinPress = () => {
    if (isMember) {
      Alert.alert(
        'Leave Pack',
        'Are you sure you want to leave this pack?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: onLeave },
        ]
      );
    } else {
      onJoin();
    }
  };

  return (
    <View style={styles.container}>
      {/* Banner */}
      {pack.banner_url ? (
        <Image
          source={{ uri: pack.banner_url }}
          style={styles.banner}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.banner, styles.placeholderBanner]}>
          <Ionicons name="albums" size={60} color={colors.gray[300]} />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Pack Name */}
        <Text style={styles.name}>{pack.title}</Text>

        {/* Creator Info */}
        <View style={styles.creatorRow}>
          <Avatar
            source={pack.creator?.avatar_url ? { uri: pack.creator.avatar_url } : undefined}
            size={32}
          />
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorLabel}>Created by</Text>
            <View style={styles.creatorName}>
              <Text style={styles.creatorUsername}>
                {pack.creator?.first_name || pack.creator?.username}
              </Text>
              {pack.creator?.subscription_tier && (
                <TierBadge tier={pack.creator.subscription_tier} size="sm" />
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{pack.description || 'No description'}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(pack.members_count || 0)}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(pack.posts_count || 0)}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.joinButton, isMember && styles.joinedButton]}
            onPress={handleJoinPress}
            disabled={loading}
          >
            <Ionicons
              name={isMember ? 'checkmark-outline' : 'add-outline'}
              size={20}
              color={isMember ? colors.text.primary : colors.text.inverse}
            />
            <Text
              style={[
                styles.joinButtonText,
                isMember && styles.joinedButtonText,
              ]}
            >
              {isMember ? 'Joined' : 'Join Pack'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.followButton}
            onPress={onToggleFollow}
            disabled={loading}
          >
            <Ionicons
              name={isFollowing ? 'notifications' : 'notifications-outline'}
              size={20}
              color={colors.primary[500]}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  banner: {
    width: '100%',
    height: 180,
    backgroundColor: colors.gray[200],
  },
  placeholderBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
  },
  content: {
    padding: spacing[4],
  },
  name: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  creatorInfo: {
    flex: 1,
  },
  creatorLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  },
  creatorName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  creatorUsername: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.5,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.base,
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
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.base,
    backgroundColor: colors.primary[500],
  },
  joinedButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  joinButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  joinedButtonText: {
    color: colors.text.primary,
  },
  followButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});
