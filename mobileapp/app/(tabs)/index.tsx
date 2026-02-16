import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native';
import { useAuthStore } from '@/src/store/authStore';
import { usePostStore } from '@/src/store/postStore';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import { PostCard } from '@/src/components/posts/PostCard';
import { CreatePostModal } from '@/src/components/posts/CreatePostModal';
import { colors, spacing } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function FeedScreen() {
  const { user } = useAuthStore();
  const {
    posts,
    loading,
    hasMore,
    newPostsCount,
    searchTerm,
    fetchPosts,
    loadMore,
    loadNewPosts,
    subscribeToNewPosts,
    feedType,
    setFeedType,
    sortBy,
    setSortBy,
    setSearchTerm,
  } = usePostStore();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  useEffect(() => {
    fetchPosts(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates
    const unsubscribe = subscribeToNewPosts(user.id);

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleRefresh = useCallback(() => {
    fetchPosts(true);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.gray[400]}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts..."
          placeholderTextColor={colors.gray[400]}
          value={localSearchTerm}
          onChangeText={setLocalSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {localSearchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => setLocalSearchTerm('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Feed Type Selector */}
      <View style={styles.feedTypeSelector}>
        <TouchableOpacity
          style={[styles.feedTypeButton, feedType === 'public' && styles.feedTypeButtonActive]}
          onPress={() => setFeedType('public')}
        >
          <Text
            style={[styles.feedTypeText, feedType === 'public' && styles.feedTypeTextActive]}
          >
            Public
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedTypeButton, feedType === 'friends' && styles.feedTypeButtonActive]}
          onPress={() => setFeedType('friends')}
        >
          <Text
            style={[styles.feedTypeText, feedType === 'friends' && styles.feedTypeTextActive]}
          >
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort Selector */}
      <View style={styles.sortSelector}>
        <Ionicons name="funnel-outline" size={16} color={colors.gray[600]} />
        <Text style={styles.sortLabel}>Sort:</Text>
        <TouchableOpacity onPress={() => setSortBy('relevancy')}>
          <Text style={[styles.sortOption, sortBy === 'relevancy' && styles.sortOptionActive]}>
            Relevancy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortBy('recent')}>
          <Text style={[styles.sortOption, sortBy === 'recent' && styles.sortOptionActive]}>
            Recent
          </Text>
        </TouchableOpacity>
      </View>

      {/* New Posts Banner */}
      {newPostsCount > 0 && (
        <TouchableOpacity style={styles.newPostsBanner} onPress={loadNewPosts}>
          <Ionicons name="arrow-up-circle" size={20} color={colors.primary[500]} />
          <Text style={styles.newPostsText}>
            {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return <LoadingSpinner size="small" />;
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="leaf-outline" size={64} color={colors.gray[300]} />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptyText}>
          {feedType === 'friends'
            ? 'Follow some users to see their posts here'
            : 'Be the first to share something!'}
        </Text>
      </View>
    );
  };

  if (loading && posts.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={loading && posts.length > 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />

      {/* Floating Action Button */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.text.inverse} />
        </TouchableOpacity>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[2],
    fontSize: 14,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing[1],
  },
  feedTypeSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  feedTypeButton: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  feedTypeButtonActive: {
    backgroundColor: colors.primary[500],
  },
  feedTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  feedTypeTextActive: {
    color: colors.text.inverse,
  },
  sortSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  sortLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  sortOption: {
    fontSize: 14,
    color: colors.text.secondary,
    paddingHorizontal: spacing[2],
  },
  sortOptionActive: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  newPostsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    paddingVertical: spacing[2],
    marginTop: spacing[3],
    marginHorizontal: spacing[4],
    borderRadius: 8,
    gap: spacing[2],
  },
  newPostsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
