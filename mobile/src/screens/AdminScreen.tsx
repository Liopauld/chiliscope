import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { usersApi, analyticsApi } from '../api/client';

interface UserData {
  user_id: string;
  email: string;
  full_name: string;
  user_type: 'user' | 'researcher' | 'admin';
  is_active: boolean;
  created_at?: string;
}

interface DashboardStats {
  total_users: number;
  active_users: number;
  total_samples: number;
  users_by_type: Record<string, number>;
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'stats'>('users');

  // Check if user is admin
  const isAdmin = user?.user_type === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    }
  };

  const fetchStats = async () => {
    try {
      const data = await analyticsApi.getDashboard();
      setStats({
        total_users: data.total_users || 0,
        active_users: data.active_users || 0,
        total_samples: data.total_samples || 0,
        users_by_type: data.users_by_type || {},
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to load statistics. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Deactivate User' : 'Activate User',
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (currentStatus) {
                await usersApi.deactivate(userId, 'Deactivated by admin', 'admin_action');
              } else {
                await usersApi.reactivate(userId, 'Reactivated by admin');
              }
              setUsers(users.map(u => 
                u.user_id === userId ? { ...u, is_active: !currentStatus } : u
              ));
              Alert.alert('Success', `User ${currentStatus ? 'deactivated' : 'reactivated'} successfully.`);
            } catch (error: any) {
              const message = error?.response?.data?.detail || 'Failed to update user status';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Non-admin view
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color="#d1d5db" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You need admin privileges to access this section.
          </Text>
          <Text style={styles.accessDeniedSubtext}>
            Current role: {user?.user_type || 'unknown'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSubtitle}>Manage users & system</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons 
            name="people" 
            size={20} 
            color={activeTab === 'users' ? '#dc2626' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons 
            name="stats-chart" 
            size={20} 
            color={activeTab === 'stats' ? '#dc2626' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            Statistics
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.loadingText}>Loading admin data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />
          }
        >
          {activeTab === 'users' ? (
            <>
              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* User List */}
              {filteredUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : (
              filteredUsers.map((u) => (
                <View key={u.user_id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <View style={[styles.avatar, !u.is_active && styles.avatarInactive]}>
                      <Text style={styles.avatarText}>
                        {u.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{u.full_name}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                      <View style={styles.badges}>
                        <View style={[styles.roleBadge, getRoleBadgeStyle(u.user_type)]}>
                          <Text style={styles.roleBadgeText}>{u.user_type}</Text>
                        </View>
                        <View style={[styles.statusBadge, u.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                          <Text style={[styles.statusText, u.is_active ? styles.activeText : styles.inactiveText]}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => toggleUserStatus(u.user_id, u.is_active)}
                    >
                      <Ionicons 
                        name={u.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'} 
                        size={20} 
                        color={u.is_active ? '#ef4444' : '#22c55e'} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
              )}
            </>
          ) : (
            /* Statistics Tab */
            <View style={styles.statsContainer}>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="people"
                  label="Total Users"
                  value={stats?.total_users || 0}
                  color="#3b82f6"
                />
                <StatCard
                  icon="person-circle"
                  label="Active Users"
                  value={stats?.active_users || 0}
                  color="#22c55e"
                />
                <StatCard
                  icon="scan"
                  label="Total Analyses"
                  value={stats?.total_samples || 0}
                  color="#f97316"
                />
                <StatCard
                  icon="flask"
                  label="Researchers"
                  value={stats?.users_by_type?.researcher || 0}
                  color="#8b5cf6"
                />
                <StatCard
                  icon="shield"
                  label="Admins"
                  value={stats?.users_by_type?.admin || 0}
                  color="#dc2626"
                />
              </View>

              {/* System Health */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>System Health</Text>
                <View style={styles.healthItem}>
                  <View style={styles.healthDot} />
                  <Text style={styles.healthLabel}>API Server</Text>
                  <Text style={styles.healthStatus}>Operational</Text>
                </View>
                <View style={styles.healthItem}>
                  <View style={styles.healthDot} />
                  <Text style={styles.healthLabel}>Database</Text>
                  <Text style={styles.healthStatus}>Connected</Text>
                </View>
                <View style={styles.healthItem}>
                  <View style={styles.healthDot} />
                  <Text style={styles.healthLabel}>ML Models</Text>
                  <Text style={styles.healthStatus}>Loaded</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

// Helper component for stat cards
function StatCard({ icon, label, value, color }: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  value: number; 
  color: string 
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Helper function for role badge colors
function getRoleBadgeStyle(role: string) {
  switch (role) {
    case 'admin':
      return { backgroundColor: '#fef2f2' };
    case 'researcher':
      return { backgroundColor: '#f3e8ff' };
    default:
      return { backgroundColor: '#f0fdf4' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#dc2626',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#dc2626',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  userCountText: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    paddingVertical: 48,
  },
  emptyText: {
    color: '#6b7280',
    marginTop: 16,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: {
    backgroundColor: '#9ca3af',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeText: {
    color: '#16a34a',
  },
  inactiveText: {
    color: '#dc2626',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  statsContainer: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  healthDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginRight: 10,
  },
  healthLabel: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  healthStatus: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 100,
  },
});
