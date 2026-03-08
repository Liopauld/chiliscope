import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { pricesApi } from '../api/client';

// ── Types matching the web frontend ──
type ChiliKey = 'siling_labuyo' | 'siling_haba' | 'siling_demonyo';

interface TrendPoint {
  date: string;
  price: number;
  low: number;
  high: number;
}

interface VarietyOverview {
  current_price: number;
  current_low: number;
  current_high: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_change_pct: number;
  data_points: number;
  date_range?: { start: string; end: string };
  trend: TrendPoint[];
}

type MarketData = Record<ChiliKey, VarietyOverview>;

interface PredictionPoint {
  date: string;
  predicted_price: number;
  day_offset: number;
}

interface PredictionResult {
  chili_type: string;
  predictions: PredictionPoint[];
  recent_prices: { date: string; price: number }[];
  summary: {
    avg_predicted: number;
    min_predicted: number;
    max_predicted: number;
    trend: string;
    trend_pct: number;
  };
  model_info: {
    type: string;
    r2_score: number;
    mae: number;
    trained_at: string;
  };
}

// ── Variety metadata (same as web) ──
const VARIETY_META: Record<ChiliKey, { label: string; color: string; emoji: string; tagline: string }> = {
  siling_labuyo: {
    label: 'Siling Labuyo',
    color: '#f97316',
    emoji: '🌶️',
    tagline: 'Hot • Bird\'s Eye Chili',
  },
  siling_haba: {
    label: 'Siling Haba',
    color: '#22c55e',
    emoji: '🫑',
    tagline: 'Mild • Finger Chili',
  },
  siling_demonyo: {
    label: 'Siling Demonyo',
    color: '#ef4444',
    emoji: '🔥',
    tagline: 'Extra Hot • Demon Chili',
  },
};

const VARIETY_ORDER: ChiliKey[] = ['siling_labuyo', 'siling_haba', 'siling_demonyo'];

type ForecastPeriod = 'day' | 'week' | 'month';
const PERIOD_CONFIG: Record<ForecastPeriod, { label: string; days: number; desc: string }> = {
  day: { label: 'Next Day', days: 1, desc: 'Tomorrow' },
  week: { label: 'Next Week', days: 7, desc: '7-day' },
  month: { label: 'Next Month', days: 30, desc: '30-day' },
};

const formatPeso = (v: number) => `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function PriceMonitorScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVariety, setSelectedVariety] = useState<ChiliKey>('siling_labuyo');
  const [forecastChili, setForecastChili] = useState<ChiliKey>('siling_labuyo');
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>('week');

  const isAdmin = user?.user_type === 'admin';

  // ── Market overview (matches web) ──
  const {
    data: marketData,
    isLoading: loadingMarket,
    refetch: refetchMarket,
  } = useQuery<MarketData>({
    queryKey: ['market-overview'],
    queryFn: pricesApi.getMarketOverview,
  });

  // ── Price forecast ──
  const {
    data: forecast,
    isLoading: loadingForecast,
    refetch: refetchForecast,
  } = useQuery<PredictionResult>({
    queryKey: ['price-forecast', forecastChili, forecastPeriod],
    queryFn: () => pricesApi.predict(forecastChili, PERIOD_CONFIG[forecastPeriod].days),
  });

  // ── Seed mutation (admin) ──
  const seedMutation = useMutation({
    mutationFn: pricesApi.seed,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['market-overview'] });
      Alert.alert('Success', data.message || 'Price data seeded!');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to seed price data');
    },
  });

  const activeData = marketData?.[selectedVariety];
  const meta = VARIETY_META[selectedVariety];
  const hasData = marketData && Object.values(marketData).some((v) => v.data_points > 0);
  const isLoading = loadingMarket;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Market Prices</Text>
            <Text style={styles.headerSubtitle}>Philippine chili pepper price tracking</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={styles.seedButton}
              onPress={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              )}
              <Text style={styles.seedButtonText}>
                {seedMutation.isPending ? 'Seeding…' : 'Seed'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              refetchMarket();
              refetchForecast();
            }}
            colors={['#dc2626']}
          />
        }
      >
        {!hasData && !isLoading ? (
          /* ── Empty state ── */
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Price Data Yet</Text>
            <Text style={styles.emptyText}>
              {isAdmin
                ? 'Tap "Seed" above to load real market data from Excel files.'
                : 'Ask an admin to seed the price database.'}
            </Text>
          </View>
        ) : (
          <>
            {/* ═══ PRICE SUMMARY CARDS ═══ */}
            <View style={styles.section}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
                {VARIETY_ORDER.map((key) => {
                  const v = marketData?.[key];
                  const m = VARIETY_META[key];
                  const isSelected = key === selectedVariety;
                  const changePct = v?.price_change_pct ?? 0;
                  const changeColor = changePct > 5 ? '#ef4444' : changePct < -5 ? '#22c55e' : '#6b7280';
                  const changeBg = changePct > 5 ? '#fef2f2' : changePct < -5 ? '#f0fdf4' : '#f3f4f6';

                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.summaryCard,
                        isSelected && { borderColor: m.color, borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedVariety(key)}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardEmoji}>{m.emoji}</Text>
                        <View style={[styles.changeBadge, { backgroundColor: changeBg }]}>
                          <Text style={[styles.changeBadgeText, { color: changeColor }]}>
                            {changePct > 0 ? '+' : ''}{changePct}%
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardLabel}>{m.label}</Text>
                      <Text style={[styles.cardTagline, { color: '#9ca3af' }]}>{m.tagline}</Text>
                      <Text style={[styles.cardPrice, { color: m.color }]}>
                        {v ? formatPeso(v.current_price) : '—'}
                      </Text>
                      <Text style={styles.cardRange}>
                        Low {v ? formatPeso(v.current_low) : '—'} — High {v ? formatPeso(v.current_high) : '—'}
                      </Text>
                      <Text style={styles.cardRecords}>
                        {v?.data_points ?? 0} records
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ═══ AI PRICE FORECAST (matches web PricePrediction) ═══ */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="analytics-outline" size={20} color="#dc2626" />
                <Text style={styles.sectionTitle}>AI Price Forecast</Text>
              </View>

              {/* Chili selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {(['siling_labuyo', 'siling_haba'] as ChiliKey[]).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.chip,
                      forecastChili === key && { backgroundColor: VARIETY_META[key].color },
                    ]}
                    onPress={() => setForecastChili(key)}
                  >
                    <Text style={[styles.chipText, forecastChili === key && { color: '#fff' }]}>
                      {VARIETY_META[key].emoji} {VARIETY_META[key].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Period selector */}
              <View style={styles.periodRow}>
                {(Object.entries(PERIOD_CONFIG) as [ForecastPeriod, typeof PERIOD_CONFIG['day']][]).map(([key, cfg]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.periodChip,
                      forecastPeriod === key && styles.periodChipActive,
                    ]}
                    onPress={() => setForecastPeriod(key)}
                  >
                    <Text style={[styles.periodChipText, forecastPeriod === key && styles.periodChipTextActive]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Forecast results */}
              {loadingForecast ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#dc2626" />
                  <Text style={styles.loadingText}>Generating forecast…</Text>
                </View>
              ) : forecast ? (
                <View style={styles.forecastCard}>
                  {/* Summary */}
                  <View style={styles.forecastSummaryRow}>
                    <View style={styles.forecastStat}>
                      <Ionicons
                        name={
                          forecast.summary.trend === 'up'
                            ? 'trending-up'
                            : forecast.summary.trend === 'down'
                            ? 'trending-down'
                            : 'remove-outline'
                        }
                        size={28}
                        color={
                          forecast.summary.trend === 'up' ? '#ef4444' : forecast.summary.trend === 'down' ? '#22c55e' : '#6b7280'
                        }
                      />
                      <Text style={styles.forecastTrendLabel}>
                        {forecast.summary.trend === 'up' ? 'Rising' : forecast.summary.trend === 'down' ? 'Falling' : 'Stable'}
                      </Text>
                      <Text
                        style={[
                          styles.forecastTrendPct,
                          {
                            color:
                              forecast.summary.trend === 'up' ? '#ef4444' : forecast.summary.trend === 'down' ? '#22c55e' : '#6b7280',
                          },
                        ]}
                      >
                        {forecast.summary.trend_pct > 0 ? '+' : ''}
                        {forecast.summary.trend_pct.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.forecastStat}>
                      <Text style={styles.forecastStatLabel}>Avg</Text>
                      <Text style={styles.forecastStatValue}>{formatPeso(forecast.summary.avg_predicted)}</Text>
                    </View>
                    <View style={styles.forecastStat}>
                      <Text style={styles.forecastStatLabel}>Low</Text>
                      <Text style={[styles.forecastStatValue, { color: '#22c55e' }]}>{formatPeso(forecast.summary.min_predicted)}</Text>
                    </View>
                    <View style={styles.forecastStat}>
                      <Text style={styles.forecastStatLabel}>High</Text>
                      <Text style={[styles.forecastStatValue, { color: '#ef4444' }]}>{formatPeso(forecast.summary.max_predicted)}</Text>
                    </View>
                  </View>

                  {/* Prediction table */}
                  {forecast.predictions.length > 0 && (
                    <View style={styles.predictionTable}>
                      <View style={styles.predictionHeader}>
                        <Text style={styles.predictionHeaderText}>Date</Text>
                        <Text style={[styles.predictionHeaderText, { textAlign: 'right' }]}>Predicted</Text>
                      </View>
                      {forecast.predictions.slice(0, 10).map((pt, i) => (
                        <View key={i} style={styles.predictionRow}>
                          <Text style={styles.predictionDate}>
                            {new Date(pt.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                          </Text>
                          <Text style={styles.predictionPrice}>{formatPeso(pt.predicted_price)}/kg</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Model info badge */}
                  <View style={styles.modelBadge}>
                    <Ionicons name="hardware-chip-outline" size={14} color="#6b7280" />
                    <Text style={styles.modelBadgeText}>
                      {forecast.model_info.type} • R² {forecast.model_info.r2_score.toFixed(3)} • MAE ₱{forecast.model_info.mae.toFixed(0)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.loadingBox}>
                  <Text style={styles.loadingText}>Select a variety & period above</Text>
                </View>
              )}
            </View>

            {/* ═══ SELECTED VARIETY STATS ═══ */}
            {activeData && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{meta.emoji} {meta.label} — Summary</Text>
                </View>
                <View style={styles.statsCard}>
                  {[
                    { label: 'Latest Avg Price', value: formatPeso(activeData.current_price), bold: true },
                    { label: 'Latest Low', value: formatPeso(activeData.current_low) },
                    { label: 'Latest High', value: formatPeso(activeData.current_high) },
                    { label: 'Period Average', value: formatPeso(activeData.avg_price) },
                    { label: 'Period Low', value: formatPeso(activeData.min_price) },
                    { label: 'Period High', value: formatPeso(activeData.max_price) },
                    { label: 'Price Change', value: `${activeData.price_change_pct > 0 ? '+' : ''}${activeData.price_change_pct}%` },
                    { label: 'Data Points', value: String(activeData.data_points) },
                  ].map((row) => (
                    <View key={row.label} style={styles.statsRow}>
                      <Text style={styles.statsLabel}>{row.label}</Text>
                      <Text style={[styles.statsValue, row.bold && { fontWeight: '700', color: '#1f2937' }]}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Info note */}
                <View style={[styles.infoBox, { backgroundColor: selectedVariety === 'siling_demonyo' ? '#fffbeb' : '#ecfdf5' }]}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color={selectedVariety === 'siling_demonyo' ? '#d97706' : '#059669'}
                  />
                  <Text style={[styles.infoText, { color: selectedVariety === 'siling_demonyo' ? '#92400e' : '#065f46' }]}>
                    {selectedVariety === 'siling_demonyo'
                      ? 'Siling Demonyo prices are estimated based on Siling Labuyo trends (×1.45 multiplier).'
                      : selectedVariety === 'siling_labuyo'
                      ? 'Real market data (Jan 2024 – Dec 2025, Metro Manila). Prices can spike above ₱1,000/kg during supply shortages.'
                      : 'Real market data (Sep 2025 – Feb 2026, Metro Manila). Official prevailing prices.'}
                  </Text>
                </View>
              </View>
            )}

            {/* ═══ DAILY PRICE HISTORY ═══ */}
            {activeData && activeData.trend.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={18} color="#dc2626" />
                  <Text style={styles.sectionTitle}>{meta.label} — Price History</Text>
                </View>
                <View style={styles.historyCard}>
                  {/* Table header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Low</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Avg</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>High</Text>
                  </View>
                  {activeData.trend
                    .slice()
                    .reverse()
                    .slice(0, 30)
                    .map((row, i) => (
                      <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 2 }]}>
                          {new Date(row.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatPeso(row.low)}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{formatPeso(row.price)}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatPeso(row.high)}</Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#dc2626',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 2, fontSize: 13 },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seedButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scrollView: { flex: 1 },

  /* Empty state */
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginTop: 16 },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },

  /* Sections */
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },

  /* Summary cards */
  cardsRow: { gap: 12, paddingVertical: 4 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: 180,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardEmoji: { fontSize: 24 },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  changeBadgeText: { fontSize: 11, fontWeight: '600' },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  cardTagline: { fontSize: 11, marginTop: 2 },
  cardPrice: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  cardRange: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  cardRecords: { fontSize: 10, color: '#9ca3af', marginTop: 4 },

  /* Chip selectors */
  chipRow: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  periodChipActive: { backgroundColor: '#dc2626' },
  periodChipText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  periodChipTextActive: { color: '#fff' },

  /* Forecast card */
  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { color: '#6b7280', fontSize: 13 },
  forecastCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  forecastSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  forecastStat: { alignItems: 'center', flex: 1 },
  forecastTrendLabel: { fontSize: 12, fontWeight: '600', color: '#4b5563', marginTop: 4 },
  forecastTrendPct: { fontSize: 16, fontWeight: 'bold' },
  forecastStatLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  forecastStatValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  predictionTable: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 },
  predictionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  predictionHeaderText: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  predictionDate: { fontSize: 13, color: '#4b5563' },
  predictionPrice: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  modelBadgeText: { fontSize: 11, color: '#6b7280' },

  /* Stats card */
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  statsLabel: { fontSize: 13, color: '#6b7280' },
  statsValue: { fontSize: 14, fontWeight: '500', color: '#4b5563' },

  /* Info box */
  infoBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  /* History table */
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  tableCell: { fontSize: 12, color: '#4b5563' },
});
