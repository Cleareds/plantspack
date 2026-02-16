import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PackHeader } from '@/src/components/packs/PackHeader';
import { PostCard } from '@/src/components/posts/PostCard';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { usePack } from '@/src/hooks/usePack';
import { usePackPosts } from '@/src/hooks/usePackPosts';
import { colors, spacing, typography } from '@/src/constants/theme';

type TabType = 'posts' | 'members';

export default function PackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  const {
    pack,
    loading: packLoading,
    isMember,
    isFollowing,
    joinPack,
    leavePack,
    toggleFollow,
    refetch,
  } = usePack(id);

  const {
    posts,
    loading: postsLoading,
    hasMore,
    loadMore,
    refetch: refetchPosts,
  } = usePackPosts(id);

  const handleJoin = async () => {
    try {
      await joinPack();
      Alert.alert('Success', 'You joined the pack!');
    } catch (error) {
      Alert.alert('Error', 'Failed to join pack. Please try again.');
    }
  };

  const handleLeave = async () => {
    try {
      await leavePack();
      Alert.alert('Success', 'You left the pack');
    } catch (error) {
      Alert.alert('Error', 'Failed to leave pack. Please try again.');
    }
  };

  const handleToggleFollow = async () => {
    try {
      await toggleFollow();
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
        onPress={() => setActiveTab('posts')}
      >
        <Ionicons
          name="document-text"
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
        style={[styles.tab, activeTab === 'members' && styles.tabActive]}
        onPress={() => setActiveTab('members')}
      >
        <Ionicons
          name="people"
          size={20}
          color={activeTab === 'members' ? colors.primary[500] : colors.text.secondary}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'members' && styles.tabTextActive,
          ]}
        >
          Members
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPostsTab = () => {
    if (postsLoading && posts.length === 0) {
      return <LoadingSpinner fullScreen />;
    }

    if (posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            Be the first to share something in this pack!
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} onDelete={refetchPosts} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderTabBar}
        ListFooterComponent={() =>
          hasMore && postsLoading ? <LoadingSpinner size="small" /> : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={postsLoading && posts.length > 0}
        onRefresh={refetchPosts}
      />
    );
  };

  const renderMembersTab = () => (
    <View style={styles.container}>
      {renderTabBar()}
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>Members List</Text>
        <Text style={styles.emptyText}>
          Member management coming soon
        </Text>
      </View>
    </View>
  );

  if (packLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!pack) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Pack not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: pack.name,
          headerStyle: { backgroundColor: colors.primary[500] },
          headerTintColor: colors.text.inverse,
        }}
      />
      <View style={styles.container}>
        <PackHeader
          pack={pack}
          isMember={isMember}
          isFollowing={isFollowing}
          onJoin={handleJoin}
          onLeave={handleLeave}
          onToggleFollow={handleToggleFollow}
        />

        {activeTab === 'posts' ? renderPostsTab() : renderMembersTab()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
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
