import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '@/src/components/posts/PostCard';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { colors, spacing, typography } from '@/src/constants/theme';
import type { PostWithUser } from '@/src/types/database';

interface ProfileTabsProps {
  posts: PostWithUser[];
  packsCount: number;
  loading: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  posts,
  packsCount,
  loading,
  onRefresh,
  onLoadMore,
  hasMore = false,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'packs'>('posts');

  const renderHeader = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
        onPress={() => setActiveTab('posts')}
      >
        <Ionicons
          name="grid"
          size={20}
          color={activeTab === 'posts' ? colors.primary[500] : colors.text.secondary}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'posts' && styles.tabTextActive,
          ]}
        >
          Posts
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'packs' && styles.tabActive]}
        onPress={() => setActiveTab('packs')}
      >
        <Ionicons
          name="albums"
          size={20}
          color={activeTab === 'packs' ? colors.primary[500] : colors.text.secondary}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'packs' && styles.tabTextActive,
          ]}
        >
          Packs ({packsCount})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPostsTab = () => {
    if (loading && posts.length === 0) {
      return <LoadingSpinner fullScreen />;
    }

    if (posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            Posts will appear here when they're shared
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} onDelete={onRefresh} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() =>
          hasMore && loading ? <LoadingSpinner size="small" /> : null
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        refreshing={loading && posts.length > 0}
        onRefresh={onRefresh}
      />
    );
  };

  const renderPacksTab = () => (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.emptyContainer}>
        <Ionicons name="albums-outline" size={64} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>Packs Coming Soon</Text>
        <Text style={styles.emptyText}>
          User's packs will be displayed here
        </Text>
      </View>
    </View>
  );

  return activeTab === 'posts' ? renderPostsTab() : renderPacksTab();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary[500],
    fontWeight: typography.weights.semibold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
