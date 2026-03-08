import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnalyticsData {
  total_samples: number;
  total_predictions: number;
  avg_accuracy: number;
  total_users?: number;
  active_users?: number;
  samples_today?: number;
  samples_this_week?: number;
  users_by_type?: Record<string, number>;
  variety_distribution: Record<string, number>;
  heat_distribution: Record<string, number>;
  recent_predictions: Array<{
    id: string;
    variety: string;
    heat_level: string;
    shu: number;
    timestamp: string;
  }>;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

const heatColors: Record<string, string> = {
  Mild: '#22c55e',
  Medium: '#eab308',
  Hot: '#f97316',
  'Extra Hot': '#ef4444',
};

const varietyColors: Record<string, string> = {
  'Siling Haba': '#3b82f6',
  'Siling Labuyo': '#f97316',
  'Super Labuyo': '#ef4444',
};

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const { data, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analytics', timeRange],
    queryFn: analyticsApi.getDashboard,
  });

  // Check access - researchers and admins only
  const hasAccess = user?.user_type === 'admin' || user?.user_type === 'researcher';

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <View style={styles.accessDenied}>
          <Ionicons name="bar-chart" size={64} color="#d1d5db" />
          <Text style={styles.accessDeniedTitle}>Researcher Access Required</Text>
          <Text style={styles.accessDeniedText}>
            Analytics are available to researchers and admins only.
          </Text>
          <Text style={styles.accessDeniedSubtext}>
            Current role: {user?.user_type || 'unknown'}
          </Text>
        </View>
      </View>
    );
  }

  // Default/mock data
  const analyticsData = data;

  const totalVariety = analyticsData?.variety_distribution 
    ? Object.values(analyticsData.variety_distribution).reduce((a, b) => a + b, 0) 
    : 0;
  const totalHeat = analyticsData?.heat_distribution
    ? Object.values(analyticsData.heat_distribution).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Research Insights</Text>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.timeRangeChip, timeRange === range && styles.timeRangeChipActive]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
              {range === 'all' ? 'All Time' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#8b5cf6']} />}
      >
        {isLoading && !analyticsData ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading analytics...</Text>
          </View>
        ) : !analyticsData ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="bar-chart-outline" size={48} color="#9ca3af" />
            <Text style={{ color: '#6b7280', marginTop: 12 }}>No analytics data available</Text>
          </View>
        ) : (
        <>
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
            <Ionicons name="images" size={24} color="#3b82f6" />
            <Text style={styles.metricValue}>{analyticsData.total_samples ?? 0}</Text>
            <Text style={styles.metricLabel}>Total Samples</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#22c55e' }]}>
            <Ionicons name="analytics" size={24} color="#22c55e" />
            <Text style={styles.metricValue}>{analyticsData.total_predictions ?? 0}</Text>
            <Text style={styles.metricLabel}>Predictions</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#f97316' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#f97316" />
            <Text style={styles.metricValue}>{analyticsData.avg_accuracy ? analyticsData.avg_accuracy.toFixed(1) + '%' : '--'}</Text>
            <Text style={styles.metricLabel}>Accuracy</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
            <Ionicons name="people" size={24} color="#8b5cf6" />
            <Text style={styles.metricValue}>{analyticsData.total_users ?? 0}</Text>
            <Text style={styles.metricLabel}>Users</Text>
          </View>
        </View>

        {/* Variety Distribution */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Variety Distribution</Text>
          <View style={styles.barChartContainer}>
            {analyticsData.variety_distribution && Object.keys(analyticsData.variety_distribution).length > 0 ? (
              Object.entries(analyticsData.variety_distribution).map(([variety, count]) => {
                const percentage = totalVariety > 0 ? (count / totalVariety) * 100 : 0;
                return (
                  <View key={variety} style={styles.barItem}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel}>{variety}</Text>
                      <Text style={styles.barValue}>{count} ({percentage.toFixed(0)}%)</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${percentage}%`, backgroundColor: varietyColors[variety] || '#6b7280' },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 16 }}>No variety data yet</Text>
            )}
          </View>
        </View>

        {/* Heat Distribution */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Heat Level Distribution</Text>
          <View style={styles.heatGrid}>
            {analyticsData.heat_distribution && Object.keys(analyticsData.heat_distribution).length > 0 ? (
              Object.entries(analyticsData.heat_distribution).map(([level, count]) => {
                const percentage = totalHeat > 0 ? (count / totalHeat) * 100 : 0;
                return (
                  <View key={level} style={styles.heatItem}>
                    <View style={[styles.heatDot, { backgroundColor: heatColors[level] }]} />
                    <View style={styles.heatInfo}>
                      <Text style={styles.heatLabel}>{level}</Text>
                      <Text style={styles.heatValue}>{percentage.toFixed(0)}%</Text>
                    </View>
                    <Text style={styles.heatCount}>{count}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 16 }}>No heat data yet</Text>
            )}
          </View>
        </View>

        {/* Model Performance */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Model Performance</Text>
          <View style={styles.modelGrid}>
            <View style={styles.modelItem}>
              <View style={[styles.modelIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="git-network" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.modelName}>Roboflow Classifier</Text>
              <Text style={styles.modelAccuracy}>{analyticsData.avg_accuracy ? analyticsData.avg_accuracy.toFixed(1) + '%' : '--'}</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        {analyticsData.recent_predictions && analyticsData.recent_predictions.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Recent Predictions</Text>
            {analyticsData.recent_predictions.map((pred: any, index: number) => (
              <View key={pred.id || index} style={styles.insightItem}>
                <Ionicons name="leaf" size={20} color="#22c55e" />
                <Text style={styles.insightText}>
                  {pred.variety} — {pred.heat_level} ({pred.shu?.toLocaleString() || '?'} SHU)
                </Text>
              </View>
            ))}
          </View>
        )}
        </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#8b5cf6',
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
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  accessDeniedSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  timeRangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  timeRangeChipActive: {
    backgroundColor: '#8b5cf6',
  },
  timeRangeText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: (SCREEN_WIDTH - 44) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  barChartContainer: {
    gap: 12,
  },
  barItem: {
    marginBottom: 4,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  barValue: {
    fontSize: 13,
    color: '#6b7280',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  heatGrid: {
    gap: 12,
  },
  heatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  heatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  heatInfo: {
    flex: 1,
  },
  heatLabel: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  heatValue: {
    fontSize: 12,
    color: '#9ca3af',
  },
  heatCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  modelGrid: {
    gap: 12,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modelIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modelName: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  modelAccuracy: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
});
