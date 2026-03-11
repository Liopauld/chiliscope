import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: usersApi.getMyStats,
  });

  const isResearcher = user?.user_type === 'researcher' || user?.user_type === 'admin';
  const isAdmin = user?.user_type === 'admin';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'person-outline' as const,
      label: 'Edit Profile',
      onPress: () => Alert.alert('Edit Profile', 'Profile editing is managed through your account settings.'),
    },
    {
      icon: 'book-outline' as const,
      label: 'Encyclopedia',
      onPress: () => navigation.navigate('Encyclopedia'),
    },
    {
      icon: 'restaurant-outline' as const,
      label: 'Culinary Guide',
      onPress: () => navigation.navigate('Culinary'),
    },
    {
      icon: 'trending-up-outline' as const,
      label: 'Price Monitor',
      onPress: () => navigation.navigate('PriceMonitor'),
    },
    {
      icon: 'leaf-outline' as const,
      label: 'Growth Guide',
      onPress: () => navigation.navigate('Growth'),
    },
    {
      icon: 'map-outline' as const,
      label: 'Chili Map',
      onPress: () => navigation.navigate('ChiliMap'),
    },
    {
      icon: 'library-outline' as const,
      label: 'Studies & References',
      onPress: () => navigation.navigate('Studies'),
    },
    ...(isResearcher ? [{
      icon: 'bar-chart-outline' as const,
      label: 'Analytics',
      badge: 'Researcher',
      onPress: () => navigation.navigate('Analytics'),
    }] : []),
    ...(isAdmin ? [{
      icon: 'shield-outline' as const,
      label: 'Admin Panel',
      badge: 'Admin',
      onPress: () => navigation.navigate('Admin'),
    }] : []),
    {
      icon: 'notifications-outline' as const,
      label: 'Notifications',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Help & Support',
      onPress: () => navigation.navigate('About'),
    },
    {
      icon: 'information-circle-outline' as const,
      label: 'About',
      onPress: () => navigation.navigate('About'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBorder}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>
            {user?.full_name || 'User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.userTypeBadge}>
            <Text style={styles.userTypeText}>
              {user?.user_type?.toUpperCase() || 'USER'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardLeft]}>
          {statsLoading ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <Text style={styles.statValue}>{userStats?.total_samples ?? 0}</Text>
          )}
          <Text style={styles.statLabel}>Analyses</Text>
        </View>
        <View style={[styles.statCard, styles.statCardRight]}>
          {statsLoading ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <Text style={styles.statValue}>
              {userStats?.average_confidence ? `${userStats.average_confidence.toFixed(0)}%` : '--'}
            </Text>
          )}
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon} size={20} color="#6b7280" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {'badge' in item && item.badge && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>ChiliScope v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#dc2626',
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarBorder: {
    backgroundColor: '#ffffff',
    borderRadius: 50,
    padding: 4,
  },
  avatarInner: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 48,
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#dc2626',
    fontSize: 36,
    fontWeight: 'bold',
  },
  userName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  userTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  userTypeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: -24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardLeft: {
    marginRight: 8,
  },
  statCardRight: {
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  menuSection: {
    marginHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuIconContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 8,
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    color: '#1f2937',
    fontSize: 16,
  },
  menuBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  logoutSection: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  versionText: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
