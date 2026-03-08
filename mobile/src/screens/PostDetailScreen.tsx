import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { forumApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PostDetailRoute = RouteProp<RootStackParamList, 'PostDetail'>;

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

interface Post {
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
  updated_at?: string;
  is_pinned: boolean;
}

interface Comment {
  comment_id: string;
  post_id: string;
  content: string;
  author: PostAuthor;
  parent_id?: string;
  reactions: ReactionSummary;
  created_at: string;
  replies: Comment[];
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'insightful', emoji: '💡', label: 'Insight' },
  { type: 'hot_take', emoji: '🌶️', label: 'Hot Take' },
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

export default function PostDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PostDetailRoute>();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [showReactions, setShowReactions] = useState(false);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const [postData, commentsData] = await Promise.all([
        forumApi.getPost(route.params.postId),
        forumApi.listComments(route.params.postId),
      ]);
      setPost(postData);
      setComments(commentsData || []);
    } catch (err) {
      console.error('Failed to fetch post', err);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.postId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleReact = async (reactionType: string) => {
    if (!post) return;
    try {
      await forumApi.reactToPost(post.post_id, reactionType);
      setShowReactions(false);
      fetchData();
    } catch (err: any) {
      if (err?.response?.status === 401) {
        Alert.alert('Sign in required', 'You need to be signed in to react.');
      }
    }
  };

  const handleCommentReact = async (commentId: string, reactionType: string) => {
    try {
      await forumApi.reactToComment(commentId, reactionType);
      fetchData();
    } catch (err: any) {
      if (err?.response?.status === 401) {
        Alert.alert('Sign in required', 'You need to be signed in to react.');
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await forumApi.createComment(
        route.params.postId,
        newComment.trim(),
        replyTo?.commentId
      );
      setNewComment('');
      setReplyTo(null);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to post comment';
      Alert.alert('Error', typeof msg === 'string' ? msg : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = () => {
    if (!post) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await forumApi.deletePost(post.post_id);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete post');
          }
        }
      },
    ]);
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await forumApi.deleteComment(commentId);
            fetchData();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete comment');
          }
        }
      },
    ]);
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwn = user?.user_id === comment.author.user_id;
    return (
      <View key={comment.comment_id} style={[styles.commentItem, isReply && styles.replyItem]}>
        <View style={styles.commentHeader}>
          <View style={[styles.commentAvatar, isReply && { width: 28, height: 28, borderRadius: 14 }]}>
            <Text style={[styles.commentAvatarText, isReply && { fontSize: 12 }]}>
              {comment.author.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentHeaderText}>
            <Text style={styles.commentAuthor}>{comment.author.full_name}</Text>
            <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
          </View>
          {isOwn && (
            <TouchableOpacity onPress={() => handleDeleteComment(comment.comment_id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.commentAction}
            onPress={() => handleCommentReact(comment.comment_id, 'like')}
          >
            <Ionicons name="heart-outline" size={14} color="#9ca3af" />
            {comment.reactions.total > 0 && (
              <Text style={styles.commentActionText}>{comment.reactions.total}</Text>
            )}
          </TouchableOpacity>
          {!isReply && (
            <TouchableOpacity
              style={styles.commentAction}
              onPress={() => {
                setReplyTo({ commentId: comment.comment_id, authorName: comment.author.full_name });
              }}
            >
              <Ionicons name="return-down-forward-outline" size={14} color="#9ca3af" />
              <Text style={styles.commentActionText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Replies */}
        {comment.replies?.map(reply => renderComment(reply, true))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Post not found</Text>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[post.category] || '#6b7280';
  const isOwner = user?.user_id === post.author.user_id;
  const isAdmin = user?.user_type === 'admin';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Thread</Text>
        {(isOwner || isAdmin) && (
          <TouchableOpacity onPress={handleDeletePost} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={['#f97316']} />}
      >
        {/* Post Content */}
        <View style={styles.postContainer}>
          <View style={styles.postHeader}>
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {post.author.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{post.author.full_name}</Text>
                  {post.author.user_type === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
              </View>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>
                {post.category}
              </Text>
            </View>
          </View>

          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.content}</Text>

          {/* Images */}
          {post.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
              {post.images.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.postImage} resizeMode="cover" />
              ))}
            </ScrollView>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {post.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reactions Bar */}
          <View style={styles.reactionsBar}>
            <TouchableOpacity
              style={styles.reactButton}
              onPress={() => setShowReactions(!showReactions)}
            >
              <Ionicons name="happy-outline" size={20} color="#6b7280" />
              <Text style={styles.reactButtonText}>React</Text>
            </TouchableOpacity>
            {post.reactions.total > 0 && (
              <View style={styles.reactionCounts}>
                {post.reactions.like > 0 && <Text style={styles.reactionEmoji}>👍 {post.reactions.like}</Text>}
                {post.reactions.love > 0 && <Text style={styles.reactionEmoji}>❤️ {post.reactions.love}</Text>}
                {post.reactions.fire > 0 && <Text style={styles.reactionEmoji}>🔥 {post.reactions.fire}</Text>}
                {post.reactions.insightful > 0 && <Text style={styles.reactionEmoji}>💡 {post.reactions.insightful}</Text>}
                {post.reactions.hot_take > 0 && <Text style={styles.reactionEmoji}>🌶️ {post.reactions.hot_take}</Text>}
              </View>
            )}
          </View>

          {showReactions && (
            <View style={styles.reactionPicker}>
              {REACTIONS.map(r => (
                <TouchableOpacity
                  key={r.type}
                  style={styles.reactionPickerItem}
                  onPress={() => handleReact(r.type)}
                >
                  <Text style={styles.reactionPickerEmoji}>{r.emoji}</Text>
                  <Text style={styles.reactionPickerLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({post.comment_count})
          </Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first to reply!</Text>
          ) : (
            comments.map(c => renderComment(c))
          )}
        </View>

        {/* Spacer for input */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.inputContainer}>
        {replyTo && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText}>
              Replying to <Text style={{ fontWeight: '600' }}>{replyTo.authorName}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : 'Write a comment...'}
            placeholderTextColor="#9ca3af"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  deleteBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  adminBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3b82f6',
  },
  postTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  postContent: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  imagesRow: {
    marginBottom: 12,
  },
  postImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#6b7280',
  },
  reactionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  reactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reactButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  reactionCounts: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionEmoji: {
    fontSize: 13,
    color: '#4b5563',
  },
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 10,
    marginTop: 10,
  },
  reactionPickerItem: {
    alignItems: 'center',
    gap: 2,
  },
  reactionPickerEmoji: {
    fontSize: 24,
  },
  reactionPickerLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  commentsSection: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  noComments: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  replyItem: {
    marginLeft: 32,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    fontWeight: 'bold',
    color: '#6b7280',
    fontSize: 14,
  },
  commentHeaderText: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  commentTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  commentContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 40,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 40,
    marginTop: 6,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  replyBannerText: {
    fontSize: 13,
    color: '#92400e',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
});
