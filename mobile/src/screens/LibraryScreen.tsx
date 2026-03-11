import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
  Share,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { predictionsApi, samplesApi } from '../api/client';

interface SegmentItem {
  class_name?: string;
  class?: string;
  variety?: string;
  confidence: number;
  measurement?: { length_mm: number; width_mm: number; area_mm2: number; estimated_weight_g?: number };
}

interface MeasurementsSummary {
  average?: { length_mm: number; width_mm: number; area_mm2: number; estimated_weight_g: number };
  total_estimated_weight_g?: number;
  total_pods?: number;
  scale_mm_per_px?: number;
  scale_method?: string;
}

interface PredictionItem {
  analysis_id?: string;
  id?: string;
  variety: string;
  heat_level: string;
  shu: number;
  confidence?: number;
  created_at?: string;
  timestamp?: string;
  image_url?: string;
  thumbnail?: string;
  scan_type?: string;
  total_detected?: number;
  segments?: SegmentItem[];
  measurements?: MeasurementsSummary | null;
  varieties_detected?: Record<string, number>;
}

const heatColors: Record<string, string> = {
  Mild: '#22c55e',
  Medium: '#eab308',
  Hot: '#f97316',
  'Extra Hot': '#ef4444',
};

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['predictionHistory'],
    queryFn: () => predictionsApi.getHistory(1, 50),
  });

  const history: PredictionItem[] = data?.items || [];

  const filteredHistory = history.filter((item) => {
    const variety = item.variety || '';
    const heatLevel = item.heat_level || '';
    const matchesSearch =
      variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
      heatLevel.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !selectedFilter || heatLevel === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getHeatColor = (level: string) => {
    return heatColors[level] || '#6b7280';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filters = ['Mild', 'Medium', 'Hot', 'Extra Hot'];

  const renderItem = ({ item }: { item: PredictionItem }) => {
    const scanLabel =
      item.scan_type === 'flower_segmentation'
        ? '🌸 Flower'
        : item.scan_type === 'chili_segmentation'
        ? '🔍 Segment'
        : null;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('Results', { analysisId: item.analysis_id || item.id })}
      >
        {/* Thumbnail or Placeholder */}
        <View style={styles.itemImage}>
          {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} />
          ) : (
            <Ionicons name="leaf" size={32} color="#9ca3af" />
          )}
        </View>

        {/* Info */}
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemVariety} numberOfLines={1}>{item.variety || 'Unknown'}</Text>
            <View style={[styles.heatBadge, { backgroundColor: getHeatColor(item.heat_level || 'Medium') }]}>
              <Text style={styles.heatBadgeText}>{item.heat_level || 'N/A'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={styles.itemShu}>
              {item.shu ? item.shu.toLocaleString() + ' SHU' : 'SHU unknown'}
            </Text>
            {scanLabel && (
              <View style={styles.scanBadge}>
                <Text style={styles.scanBadgeText}>{scanLabel}</Text>
              </View>
            )}
          </View>
          {/* Measurements summary */}
          {item.measurements?.average && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <Ionicons name="resize" size={12} color="#6b7280" />
              <Text style={{ color: '#6b7280', fontSize: 11 }}>
                Avg {item.measurements.average.length_mm?.toFixed(1)}×{item.measurements.average.width_mm?.toFixed(1)} mm
              </Text>
              {item.measurements.total_estimated_weight_g != null && item.measurements.total_estimated_weight_g > 0 && (
                <Text style={{ color: '#059669', fontSize: 11, fontWeight: '600' }}>
                  ⚖ {item.measurements.total_estimated_weight_g.toFixed(1)}g
                </Text>
              )}
            </View>
          )}

          {/* Varieties detected */}
          {item.varieties_detected && Object.keys(item.varieties_detected).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
              {Object.entries(item.varieties_detected).map(([v, val]) => (
                <View key={v} style={{ backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ color: '#1d4ed8', fontSize: 10 }}>{v} ×{typeof val === 'object' && val !== null ? (val as any).count ?? 0 : val}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Flower segment classes */}
          {item.scan_type === 'flower_segmentation' && item.segments && item.segments.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
              {Object.entries(
                item.segments.reduce<Record<string, number>>((acc, s) => {
                  const cls = s.class_name || s.class || 'flower';
                  acc[cls] = (acc[cls] || 0) + 1;
                  return acc;
                }, {})
              ).map(([cls, cnt]) => (
                <View key={cls} style={{ backgroundColor: '#fce7f3', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ color: '#be185d', fontSize: 10 }}>🌸 {cls} ×{cnt}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={styles.itemDate}>
              {formatDate(item.created_at || item.timestamp || '')}
            </Text>
            {item.total_detected && item.total_detected > 0 ? (
              <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>
                {item.total_detected} detected
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={async (e) => {
              e.stopPropagation?.();
              const resultId = item.analysis_id || item.id;
              if (!resultId) return;
              try {
                await samplesApi.update(resultId, { is_public: true });
                await Share.share({
                  message: `Check out my ChiliScope analysis: https://chiliscope.netlify.app/results/${resultId}`,
                });
              } catch {
                Alert.alert('Share', 'Could not share this analysis.');
              }
            }}
          >
            <Ionicons name="share-social-outline" size={18} color="#6b7280" />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <Text style={styles.headerSubtitle}>
          {isLoading ? 'Loading...' : `${data?.total ?? history.length} analyses`}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search varieties..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === null ? styles.filterButtonActive : styles.filterButtonInactive,
            ]}
            onPress={() => setSelectedFilter(null)}
          >
            <Text
              style={selectedFilter === null ? styles.filterTextActive : styles.filterTextInactive}
            >
              All
            </Text>
          </TouchableOpacity>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter ? styles.filterButtonActive : styles.filterButtonInactive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={
                  selectedFilter === filter ? styles.filterTextActive : styles.filterTextInactive
                }
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredHistory}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.analysis_id || item.id || String(index)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#dc2626']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color="#dc2626" />
                <Text style={styles.emptyText}>Loading history...</Text>
              </>
            ) : (
              <>
                <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No analyses found</Text>
                <Text style={{ color: '#9ca3af', marginTop: 4, fontSize: 13 }}>
                  Analyze a chili pepper to see it here
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    color: '#6b7280',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchInputWrapper: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#1f2937',
  },
  filtersRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  filterButtonActive: {
    backgroundColor: '#dc2626',
  },
  filterButtonInactive: {
    backgroundColor: '#f3f4f6',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  filterTextInactive: {
    color: '#4b5563',
  },
  listContent: {
    padding: 24,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  itemImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  scanBadge: {
    backgroundColor: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  scanBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemVariety: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  heatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  heatBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemShu: {
    color: '#6b7280',
    marginTop: 4,
  },
  itemDate: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  itemChevron: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#6b7280',
    marginTop: 16,
  },
  itemActions: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    gap: 8,
  },
  shareButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
});
