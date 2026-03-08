import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationItem {
  notification_id: string;
  type: string;
  message: string;
  post_id?: string;
  comment_id?: string;
  from_user: { user_id: string; full_name: string; user_type: string };
  is_read: boolean;
  created_at: string;
}

const NOTIF_ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  post_reaction: { name: 'heart', color: '#ef4444', bg: '#fef2f2' },
  post_comment: { name: 'chatbubble', color: '#3b82f6', bg: '#eff6ff' },
  comment_reaction: { name: 'heart', color: '#ec4899', bg: '#fdf2f8' },
  comment_reply: { name: 'return-down-forward', color: '#8b5cf6', bg: '#f5f3ff' },
  mention: { name: 'at', color: '#f97316', bg: '#fff7ed' },
  new_post: { name: 'document-text', color: '#22c55e', bg: '#f0fdf4' },
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

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchNotifications = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const data = await notificationsApi.list(pageNum, 20);
      const items = data.items || [];
      setTotal(data.total || 0);
      setHasMore(items.length === 20);

      if (pageNum === 1) {
        setNotifications(items);
      } else {
        setNotifications(prev => [...prev, ...items]);
      }
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(1);
    }, [fetchNotifications])
  );

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // Mark as read
    if (!item.is_read) {
      try {
        await notificationsApi.markRead(item.notification_id);
        setNotifications(prev =>
          prev.map(n => n.notification_id === item.notification_id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        // ignore
      }
    }

    // Navigate to relevant post
    if (item.post_id) {
      navigation.navigate('PostDetail', { postId: item.post_id });
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchNotifications(page + 1);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const iconInfo = NOTIF_ICON_MAP[item.type] || NOTIF_ICON_MAP.new_post;
    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIcon, { backgroundColor: iconInfo.bg }]}>
          <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifMessage, !item.is_read && styles.notifMessageUnread]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {total > 0 && (
            <Text style={styles.headerCount}>{total} total</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={20} color="#f97316" />
          </TouchableOpacity>
        )}
      </View>

      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>
            You'll see notifications here when someone interacts with your posts or comments in the forum.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.notification_id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(1, true)} colors={['#f97316']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
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
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  markAllBtn: {
    padding: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 14,
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
    paddingVertical: 8,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  notifItemUnread: {
    backgroundColor: '#fffbeb',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  notifMessageUnread: {
    color: '#1f2937',
    fontWeight: '600',
  },
  notifTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f97316',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 72,
  },
});
