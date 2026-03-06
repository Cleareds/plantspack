import React, { useEffect, useCallback, useState, useRef } from 'react';
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
import { PostCardSimple } from '@/src/components/posts/PostCardSimple';
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
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    console.log('Feed screen mounted, fetching posts...');
    fetchPosts(true);
  }, []);

  useEffect(() => {
    console.log('Posts updated:', {
      count: posts.length,
      loading,
      hasMore,
      firstPost: posts[0] ? {
        id: posts[0].id,
        content: posts[0].content?.substring(0, 30),
        hasUser: !!posts[0].user,
        username: posts[0].user?.username,
      } : null
    });
  }, [posts, loading]);

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

  // Debounce search input WITHOUT triggering re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm.length >= 3 || localSearchTerm.length === 0) {
        if (localSearchTerm !== searchTerm) {
          setSearchTerm(localSearchTerm);
        }
      }
    }, 800); // Longer delay to reduce re-renders
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
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
  ), [localSearchTerm, feedType, sortBy, newPostsCount, loadNewPosts, setSortBy, setFeedType]);

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

  // Only show full-screen loader on initial load, not during search
  if (loading && posts.length === 0 && !searchTerm) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar - Outside FlatList to prevent keyboard closing */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.gray[400]}
          style={styles.searchIcon}
        />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search posts..."
          placeholderTextColor={colors.gray[400]}
          value={localSearchTerm}
          onChangeText={setLocalSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          blurOnSubmit={false}
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

      <FlatList
        data={posts}
        renderItem={({ item }) => {
          console.log('Rendering PostCard for post:', item.id, 'content:', item.content?.substring(0, 20));
          return <PostCardSimple post={item} />;
        }}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={loading && posts.length > 0 && !searchTerm}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyList : { flexGrow: 1 }}
        style={{ flex: 1 }}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  clearButton: {
    padding: spacing[2],
    marginLeft: spacing[2],
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
