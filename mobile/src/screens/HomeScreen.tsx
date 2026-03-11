import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: analyticsApi.getDashboard,
  });

  const getHeatColor = (level: string) => {
    const colors: Record<string, string> = {
      Mild: '#22c55e',
      Medium: '#eab308',
      Hot: '#f97316',
      'Extra Hot': '#ef4444',
    };
    return colors[level] || '#6b7280';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user?.full_name || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Quick Action */}
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Capture' as never)}
        >
          <View style={styles.quickActionContent}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="camera" size={24} color="#f97316" />
            </View>
            <View>
              <Text style={styles.quickActionTitle}>
                Analyze Chili
              </Text>
              <Text style={styles.quickActionSubtitle}>
                Take a photo to predict heat level
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Your Statistics
        </Text>
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator size="small" color="#dc2626" />
          </View>
        ) : (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="images-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>
              {data?.total_samples ?? 0}
            </Text>
            <Text style={styles.statLabel}>Total Samples</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="analytics-outline" size={20} color="#f97316" />
            </View>
            <Text style={styles.statValue}>
              {data?.total_predictions ?? 0}
            </Text>
            <Text style={styles.statLabel}>Predictions</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
            </View>
            <Text style={styles.statValue}>
              {data?.avg_accuracy ? data.avg_accuracy.toFixed(0) + '%' : '--'}
            </Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>
        )}
      </View>

      {/* Heat Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Heat Distribution
        </Text>
        <View style={styles.distributionCard}>
          {data?.heat_distribution && Object.keys(data.heat_distribution).length > 0 ? (
            (Object.entries(data.heat_distribution) as [string, number][]).map(([level, count]) => {
              const total = (Object.values(data.heat_distribution) as number[]).reduce(
                (a: number, b: number) => a + b,
                0
              );
              const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <View key={level} style={styles.distributionItem}>
                <View style={styles.distributionHeader}>
                  <View style={styles.distributionLabelRow}>
                    <View style={[styles.heatDot, { backgroundColor: getHeatColor(level) }]} />
                    <Text style={styles.distributionLabel}>{level}</Text>
                  </View>
                  <Text style={styles.distributionValue}>
                    {count} ({percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${percentage}%`, backgroundColor: getHeatColor(level) }
                    ]}
                  />
                </View>
              </View>
            );
          })
          ) : (
            <Text style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 16 }}>
              {isLoading ? 'Loading...' : 'No heat data available yet'}
            </Text>
          )}
        </View>
      </View>

      {/* Philippine Varieties Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Philippine Varieties
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { name: 'Siling Haba', heat: 'Mild-Medium', shu: '500-15,000' },
            { name: 'Siling Labuyo', heat: 'Hot', shu: '15,000-100,000' },
            { name: 'Super Labuyo', heat: 'Extra Hot', shu: '50,000-150,000' },
          ].map((variety) => (
            <View
              key={variety.name}
              style={styles.varietyCard}
            >
              <Text style={styles.varietyName}>
                {variety.name}
              </Text>
              <View style={styles.varietyHeatRow}>
                <Ionicons name="flame" size={16} color="#f97316" />
                <Text style={styles.varietyHeat}>{variety.heat}</Text>
              </View>
              <Text style={styles.varietyShu}>
                {variety.shu} SHU
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Explore Section */}
      <View style={styles.sectionLast}>
        <Text style={styles.sectionTitle}>
          Explore
        </Text>
        <View style={styles.exploreGrid}>
          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('Encyclopedia')}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="book" size={24} color="#22c55e" />
            </View>
            <Text style={styles.exploreTitle}>Encyclopedia</Text>
            <Text style={styles.exploreSubtitle}>Learn about chili varieties</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('Culinary')}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="restaurant" size={24} color="#f97316" />
            </View>
            <Text style={styles.exploreTitle}>Culinary</Text>
            <Text style={styles.exploreSubtitle}>Filipino chili recipes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('PriceMonitor')}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="trending-up" size={24} color="#dc2626" />
            </View>
            <Text style={styles.exploreTitle}>Market Prices</Text>
            <Text style={styles.exploreSubtitle}>Prices & AI forecast</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('Chat')}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#dc2626" />
            </View>
            <Text style={styles.exploreTitle}>ChiliBot</Text>
            <Text style={styles.exploreSubtitle}>AI chili assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('Forum')}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="people" size={24} color="#f97316" />
            </View>
            <Text style={styles.exploreTitle}>Forum</Text>
            <Text style={styles.exploreSubtitle}>Community discussions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('Growth' as never)}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="leaf" size={24} color="#16a34a" />
            </View>
            <Text style={styles.exploreTitle}>Growth Guide</Text>
            <Text style={styles.exploreSubtitle}>Growing stages & care</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('ChiliMap' as never)}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="map" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.exploreTitle}>Chili Map</Text>
            <Text style={styles.exploreSubtitle}>Philippine hotspots</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('Studies' as never)}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="library" size={24} color="#dc2626" />
            </View>
            <Text style={styles.exploreTitle}>Studies</Text>
            <Text style={styles.exploreSubtitle}>Research & references</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreCard}
            onPress={() => navigation.navigate('ModelComparison' as never)}
          >
            <View style={[styles.exploreIcon, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="analytics" size={24} color="#7c3aed" />
            </View>
            <Text style={styles.exploreTitle}>ML Models</Text>
            <Text style={styles.exploreSubtitle}>LR vs RF vs DT metrics</Text>
          </TouchableOpacity>

          {user?.user_type === 'admin' && (
            <TouchableOpacity
              style={[styles.exploreCard, styles.exploreCardFull]}
              onPress={() => navigation.navigate('Admin')}
            >
              <View style={[styles.exploreIcon, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="shield" size={24} color="#8b5cf6" />
              </View>
              <View style={styles.adminCardText}>
                <Text style={styles.exploreTitle}>Admin Panel</Text>
                <Text style={styles.exploreSubtitle}>Manage users & system</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  userName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  notificationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 9999,
    padding: 12,
  },
  quickAction: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  quickActionTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
    fontSize: 18,
  },
  quickActionSubtitle: {
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionLast: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  statIconContainer: {
    borderRadius: 12,
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  distributionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  distributionItem: {
    marginBottom: 12,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distributionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  distributionLabel: {
    color: '#4b5563',
  },
  distributionValue: {
    color: '#6b7280',
  },
  progressBar: {
    backgroundColor: '#f3f4f6',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  varietyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    width: 192,
  },
  varietyName: {
    color: '#1f2937',
    fontWeight: 'bold',
    fontSize: 18,
  },
  varietyHeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  varietyHeat: {
    color: '#6b7280',
    marginLeft: 4,
  },
  varietyShu: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exploreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  exploreCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  exploreTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
    fontSize: 16,
  },
  exploreSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  adminCardText: {
    marginLeft: 16,
    flex: 1,
  },
});
