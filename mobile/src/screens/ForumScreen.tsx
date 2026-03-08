import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, StyleSheet, TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { forumApi } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PostAuthor {
  user_id: string;
  full_name: string;
  user_type: string;
}

interface ReactionSummary {
  like: number;
  love: number;
  fire: number;
  insightful: number;
  hot_take: number;
  total: number;
}

interface ForumPost {
  post_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  images: string[];
  author: PostAuthor;
  reactions: ReactionSummary;
  comment_count: number;
  created_at: string;
  is_pinned: boolean;
}

const CATEGORIES = [
  { key: '', label: 'All', icon: 'apps' as const },
  { key: 'general', label: 'General', icon: 'chatbubbles' as const },
  { key: 'identification', label: 'ID Help', icon: 'search' as const },
  { key: 'cultivation', label: 'Growing', icon: 'leaf' as const },
  { key: 'recipes', label: 'Recipes', icon: 'restaurant' as const },
  { key: 'research', label: 'Research', icon: 'flask' as const },
  { key: 'marketplace', label: 'Market', icon: 'cart' as const },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: '#6b7280',
  research: '#8b5cf6',
  identification: '#3b82f6',
  cultivation: '#22c55e',
  recipes: '#f97316',
  marketplace: '#ec4899',
  announcements: '#ef4444',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const secs = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function ForumScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  const fetchPosts = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const data = await forumApi.listPosts(
        pageNum, 20,
        selectedCategory || undefined,
        searchQuery || undefined
      );
      const items = data.items || [];
      setHasMore(items.length === 20);

      if (pageNum === 1) {
        setPosts(items);
      } else {
        setPosts(prev => [...prev, ...items]);
      }
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1);
    }, [fetchPosts])
  );

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchPosts(page + 1);
    }
  };

  const renderPost = ({ item }: { item: ForumPost }) => {
    const catColor = CATEGORY_COLORS[item.category] || '#6b7280';
    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => navigation.navigate('PostDetail', { postId: item.post_id })}
        activeOpacity={0.7}
      >
        {item.is_pinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={12} color="#f97316" />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}

        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.author.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{item.author.full_name}</Text>
              <Text style={styles.postTime}>{timeAgo(item.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '15' }]}>
            <Text style={[styles.categoryText, { color: catColor }]}>
              {item.category}
            </Text>
          </View>
        </View>

        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>

        {item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.postFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="heart-outline" size={16} color="#9ca3af" />
            <Text style={styles.footerText}>{item.reactions.total}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="chatbubble-outline" size={16} color="#9ca3af" />
            <Text style={styles.footerText}>{item.comment_count}</Text>
          </View>
          {item.images.length > 0 && (
            <View style={styles.footerItem}>
              <Ionicons name="image-outline" size={16} color="#9ca3af" />
              <Text style={styles.footerText}>{item.images.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community Forum</Text>
          <TouchableOpacity onPress={() => setSearchVisible(!searchVisible)} style={styles.searchToggle}>
            <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {searchVisible && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => fetchPosts(1)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); fetchPosts(1); }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Category Filter */}
        <FlatList
          horizontal
          data={CATEGORIES}
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => {
                setSelectedCategory(cat.key);
                setTimeout(() => fetchPosts(1), 100);
              }}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={selectedCategory === cat.key ? '#ffffff' : '#6b7280'}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Posts List */}
      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Posts Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to start a discussion! Tap the + button to create a post.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.post_id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts(1, true)} colors={['#f97316']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB: Create Post */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchToggle: {
    padding: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#f97316',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  pinnedText: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  postTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  postContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#6b7280',
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
