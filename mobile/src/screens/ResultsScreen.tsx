import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { predictionsApi } from '../api/client';

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

interface SegmentMeasurement {
  length_mm?: number;
  width_mm?: number;
  area_mm2?: number;
  estimated_weight_g?: number;
}

interface Segment {
  class_name?: string;
  class?: string;
  variety?: string;
  confidence?: number;
  measurement?: SegmentMeasurement;
}

interface MeasurementsInfo {
  scale_mm_per_px?: number;
  scale_method?: string;
  average?: { length_mm?: number; width_mm?: number; area_mm2?: number; estimated_weight_g?: number };
  total_estimated_weight_g?: number;
  total_pods?: number;
}

interface AnalysisData {
  variety: string;
  confidence: number;
  heat_level: string;
  shu: number;
  maturity: string;
  scan_type?: string;
  total_detected?: number;
  segments?: Segment[];
  measurements?: MeasurementsInfo | null;
  varieties_detected?: Record<string, any>;
}

const heatColors: Record<string, string> = {
  Mild: '#22c55e',
  Medium: '#eab308',
  Hot: '#f97316',
  'Extra Hot': '#ef4444',
};

const heatBgColors: Record<string, string> = {
  Mild: '#f0fdf4',
  Medium: '#fefce8',
  Hot: '#fff7ed',
  'Extra Hot': '#fef2f2',
};

export default function ResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute<ResultsScreenRouteProp>();
  const analysisId = route.params?.analysisId;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalysisData | null>(null);

  useEffect(() => {
    if (analysisId) {
      predictionsApi.getHistoryDetail(analysisId)
        .then((data: AnalysisData) => setResult(data))
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [analysisId]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading analysis...</Text>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 16 }}>Analysis not found</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heatColor = heatColors[result.heat_level] || '#6b7280';
  const heatBgColor = heatBgColors[result.heat_level] || '#f9fafb';
  const isFlower = result.scan_type === 'flower_segmentation';
  const isSegmentation = result.scan_type === 'chili_segmentation' || isFlower;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analysis Result</Text>
          <TouchableOpacity>
            <Ionicons name="share-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Main Result Card */}
        <View style={[styles.mainCard, { backgroundColor: heatBgColor }]}>
          <View style={styles.cardContent}>
            <View style={[styles.heatBadge, { backgroundColor: heatColor }]}>
              <Ionicons name="flame" size={20} color="white" />
              <Text style={styles.heatBadgeText}>{result.heat_level}</Text>
            </View>
            <Text style={styles.varietyText}>{result.variety}</Text>
            <Text style={styles.confidenceText}>
              {(result.confidence * 100).toFixed(0)}% confidence
            </Text>
            <View style={styles.shuContainer}>
              <Text style={styles.shuValue}>{result.shu.toLocaleString()}</Text>
              <Text style={styles.shuLabel}>Scoville Heat Units</Text>
            </View>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={[styles.iconBg, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="leaf" size={20} color="#22c55e" />
                  </View>
                  <Text style={styles.detailLabel}>Maturity</Text>
                </View>
                <Text style={styles.detailValue}>{result.maturity}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={[styles.iconBg, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="resize" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.detailLabel}>Avg Length</Text>
                </View>
                <Text style={styles.detailValue}>
                  {result.measurements?.average?.length_mm?.toFixed(1) ?? '—'} mm
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={[styles.iconBg, { backgroundColor: '#f3e8ff' }]}>
                    <Ionicons name="expand" size={20} color="#a855f7" />
                  </View>
                  <Text style={styles.detailLabel}>Avg Width</Text>
                </View>
                <Text style={styles.detailValue}>
                  {result.measurements?.average?.width_mm?.toFixed(1) ?? '—'} mm
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View style={[styles.iconBg, { backgroundColor: '#ffedd5' }]}>
                    <Ionicons name="thermometer" size={20} color="#f97316" />
                  </View>
                  <Text style={styles.detailLabel}>Category</Text>
                </View>
                <Text style={styles.detailValue}>{result.heat_level}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Per-Pod / Per-Petal Segmentation Table ── */}
        {isSegmentation && result.segments && result.segments.length > 0 && (
          <View style={styles.segmentSection}>
            <Text style={styles.sectionTitle}>
              {isFlower ? `🌸 Flower Segments (${result.segments.length})` : `🌶️ Pod Details (${result.segments.length} detected)`}
            </Text>
            <View style={styles.segmentTableCard}>
              {/* Table header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>{isFlower ? 'Part' : 'Variety'}</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Conf.</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Length</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Width</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Weight</Text>
              </View>

              {/* Table rows */}
              {result.segments.map((seg, idx) => {
                const m = seg.measurement;
                const label = isFlower
                  ? (seg.class_name || seg.class || 'region').replace(/_/g, ' ')
                  : (seg.variety || seg.class_name || seg.class || 'unknown');
                return (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#f9fafb' }]}>
                    <Text style={[styles.tableCell, styles.tableCellBold, { flex: 0.8 }]}>
                      {isFlower ? `P${idx + 1}` : `#${idx + 1}`}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>{label}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{((seg.confidence || 0) * 100).toFixed(0)}%</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{m?.length_mm?.toFixed(1) ?? '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{m?.width_mm?.toFixed(1) ?? '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{m?.estimated_weight_g?.toFixed(2) ?? '—'}</Text>
                  </View>
                );
              })}

              {/* Totals row */}
              {result.measurements?.average && (
                <View style={styles.tableTotalsRow}>
                  <Text style={[styles.tableTotalCell, { flex: 0.8 }]}>Σ</Text>
                  <Text style={[styles.tableTotalCell, { flex: 1.5 }]}>Avg / Total</Text>
                  <Text style={[styles.tableTotalCell, { flex: 1 }]}>{result.segments.length}</Text>
                  <Text style={[styles.tableTotalCell, styles.tableTotalHighlight, { flex: 1 }]}>
                    {result.measurements.average.length_mm?.toFixed(1)}
                  </Text>
                  <Text style={[styles.tableTotalCell, styles.tableTotalHighlight, { flex: 1 }]}>
                    {result.measurements.average.width_mm?.toFixed(1)}
                  </Text>
                  <Text style={[styles.tableTotalCell, styles.tableTotalHighlight, { flex: 1 }]}>
                    {result.measurements.total_estimated_weight_g != null
                      ? `${result.measurements.total_estimated_weight_g.toFixed(1)}g`
                      : result.measurements.average.estimated_weight_g?.toFixed(2) ?? '—'}
                  </Text>
                </View>
              )}

              {/* Scale info */}
              {result.measurements?.scale_mm_per_px != null && (
                <Text style={styles.scaleNote}>
                  Scale: {result.measurements.scale_mm_per_px.toFixed(3)} mm/px ({result.measurements.scale_method || 'estimated'})
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Varieties Detected */}
        {result.scan_type === 'chili_segmentation' && result.varieties_detected && Object.keys(result.varieties_detected).length > 0 && (
          <View style={styles.segmentSection}>
            <Text style={styles.sectionTitle}>Varieties Detected</Text>
            {Object.entries(result.varieties_detected).map(([name, val]) => {
              const info = typeof val === 'object' && val !== null ? val : { count: val };
              return (
                <View key={name} style={styles.varietyBreakdownCard}>
                  <Text style={styles.varietyBreakdownName}>{name}</Text>
                  <View style={styles.varietyBreakdownGrid}>
                    <Text style={styles.varietyStat}>Count: <Text style={styles.varietyStatValue}>{info.count ?? '—'}</Text></Text>
                    {info.avg_length_mm != null && <Text style={styles.varietyStat}>Avg Length: <Text style={styles.varietyStatValue}>{info.avg_length_mm.toFixed(1)} mm</Text></Text>}
                    {info.avg_width_mm != null && <Text style={styles.varietyStat}>Avg Width: <Text style={styles.varietyStatValue}>{info.avg_width_mm.toFixed(1)} mm</Text></Text>}
                    {info.avg_weight_g != null && <Text style={styles.varietyStat}>Avg Weight: <Text style={styles.varietyStatValue}>{info.avg_weight_g.toFixed(1)} g</Text></Text>}
                    {info.total_weight_g != null && <Text style={styles.varietyStat}>Total: <Text style={styles.varietyStatValue}>{info.total_weight_g.toFixed(1)} g</Text></Text>}
                    {info.heat_category != null && <Text style={styles.varietyStat}>Heat: <Text style={styles.varietyStatValue}>{info.heat_category}</Text></Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>Recommended Uses</Text>
          <View style={styles.recommendationsCard}>
            {(result.heat_level === 'Mild'
              ? ['Fresh salads and garnishes', 'Stuffed peppers', 'Mild sauces and dips']
              : result.heat_level === 'Medium'
              ? ['Adobo and sinigang', 'Stir-fry dishes', 'Marinades']
              : result.heat_level === 'Hot'
              ? ['Hot sauces (sawsawan)', 'Labuyo oil infusion', 'Bicol Express']
              : ['Extreme hot sauces', 'Small amounts for flavoring', 'Specialty products']
            ).map((use) => (
              <View key={use} style={styles.recommendationItem}>
                <View style={[styles.recommendationIcon, { backgroundColor: heatBgColor }]}>
                  <Ionicons name="restaurant" size={16} color={heatColor} />
                </View>
                <Text style={styles.recommendationText}>{use}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Safety Warning */}
        <View style={styles.warningSection}>
          <View style={styles.warningCard}>
            <View style={styles.warningIcon}>
              <Ionicons name="warning" size={20} color="#ef4444" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Safety Warning</Text>
              <Text style={styles.warningText}>
                {(result.heat_level === 'Mild' || result.heat_level === 'Medium')
                  ? 'Safe for direct handling. Wash hands after cutting.'
                  : 'This chili is hot. Wear gloves when handling and avoid touching your face or eyes.'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Library' as never)}
          >
            <Text style={styles.primaryButtonText}>View Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scrollView: {
    flex: 1,
  },
  mainCard: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 24,
    padding: 24,
  },
  cardContent: {
    alignItems: 'center',
  },
  heatBadge: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heatBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  varietyText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  confidenceText: {
    color: '#6b7280',
    marginTop: 4,
  },
  shuContainer: {
    marginTop: 24,
  },
  shuValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  shuLabel: {
    color: '#6b7280',
    textAlign: 'center',
  },
  detailsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    padding: 8,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    borderRadius: 12,
    padding: 8,
  },
  detailLabel: {
    color: '#6b7280',
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  recommendationsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
  },
  recommendationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recommendationIcon: {
    backgroundColor: '#ffedd5',
    borderRadius: 999,
    padding: 8,
    marginRight: 12,
  },
  recommendationText: {
    color: '#374151',
  },
  warningSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  warningCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    padding: 8,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: '#b91c1c',
    fontWeight: 'bold',
  },
  warningText: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 4,
  },
  bottomActions: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 24,
    paddingBottom: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  segmentSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  segmentTableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    fontSize: 12,
    color: '#374151',
  },
  tableCellBold: {
    fontWeight: '700',
    color: '#1f2937',
  },
  tableTotalsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    marginTop: 4,
  },
  tableTotalCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  tableTotalHighlight: {
    color: '#dc2626',
  },
  scaleNote: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 8,
  },
  varietyBreakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  varietyBreakdownName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  varietyBreakdownGrid: {
    gap: 2,
  },
  varietyStat: {
    fontSize: 12,
    color: '#6b7280',
  },
  varietyStatValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
});
