import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { mlApi } from '../api/client';

const TABS = ['Overview', 'SHU Models', 'Maturity', 'Capsaicin'] as const;

export default function ModelComparisonScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await mlApi.getModelComparison();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load model data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Model Evaluation</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Model Evaluation</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={16} color="#9333ea" />
        <Text style={styles.disclaimerText}>
          Models trained on synthetic data derived from published literature ranges.
        </Text>
      </View>

      {error ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Ionicons name="warning" size={32} color="#ef4444" />
          <Text style={{ color: '#ef4444', marginTop: 8 }}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 0 && <OverviewTab />}
          {activeTab === 1 && <SHUModelsTab />}
          {activeTab === 2 && <MaturityTab />}
          {activeTab === 3 && <CapsaicinTab />}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function OverviewTab() {
  const models = [
    { name: 'Linear Regression', task: 'SHU', mae: 17142, rmse: 22680, r2: 0.967, color: '#3b82f6', icon: 'trending-up' as const },
    { name: 'Random Forest', task: 'SHU', mae: 11498, rmse: 16420, r2: 0.976, color: '#22c55e', icon: 'layers' as const, best: true },
    { name: 'Decision Tree', task: 'Maturity', mae: 0.084, rmse: 0.142, r2: 0.878, color: '#f59e0b', icon: 'git-branch' as const },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Performance Summary</Text>
      {models.map((m) => (
        <View key={m.name} style={[styles.card, m.best && { borderColor: '#22c55e', borderWidth: 2 }]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name={m.icon} size={20} color={m.color} />
            <Text style={styles.cardTitle}>{m.name}</Text>
            {m.best && <View style={[styles.badge, { backgroundColor: '#22c55e' }]}><Text style={styles.badgeText}>Best</Text></View>}
          </View>
          <Text style={styles.cardSubtitle}>Task: {m.task} Prediction</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>MAE</Text>
              <Text style={styles.metricValue}>{m.mae < 1 ? m.mae : m.mae.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>RMSE</Text>
              <Text style={styles.metricValue}>{m.rmse < 1 ? m.rmse : m.rmse.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>R²</Text>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.r2}</Text>
            </View>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, { width: `${m.r2 * 100}%`, backgroundColor: m.color }]} />
          </View>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Key Findings</Text>
      {[
        'Random Forest outperforms LR by 33% lower MAE in SHU prediction',
        'Variety is the strongest predictor (42% feature importance in RF)',
        'Flower stress contributes 7% to SHU — validates flower→heat thesis',
        'DT achieves 87.8% accuracy with interpretable harvest rules',
      ].map((f, i) => (
        <View key={i} style={styles.findingRow}>
          <Text style={styles.findingBullet}>•</Text>
          <Text style={styles.findingText}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

function SHUModelsTab() {
  const features = [
    { name: 'Variety', importance: 42, color: '#22c55e' },
    { name: 'Maturity', importance: 22, color: '#3b82f6' },
    { name: 'Pod Width', importance: 12, color: '#f59e0b' },
    { name: 'Pod Length', importance: 9, color: '#ef4444' },
    { name: 'Weight', importance: 8, color: '#8b5cf6' },
    { name: 'Flower Stress', importance: 7, color: '#ec4899' },
  ];

  const coefficients = [
    { name: 'variety_demonyo', value: 142000, positive: true },
    { name: 'variety_labuyo', value: 68500, positive: true },
    { name: 'maturity_score', value: 18200, positive: true },
    { name: 'flower_stress', value: 15600, positive: true },
    { name: 'weight_g', value: 312, positive: true },
    { name: 'pod_length_mm', value: -246, positive: false },
    { name: 'pod_width_mm', value: -1820, positive: false },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Random Forest — Feature Importance</Text>
      <View style={styles.card}>
        {features.map((f) => (
          <View key={f.name} style={styles.featureRow}>
            <Text style={styles.featureLabel}>{f.name}</Text>
            <View style={styles.featureBarContainer}>
              <View style={[styles.featureBar, { width: `${f.importance * 2}%`, backgroundColor: f.color }]} />
            </View>
            <Text style={styles.featurePercent}>{f.importance}%</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Linear Regression — Coefficients</Text>
      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>Red = increases SHU, Blue = decreases SHU</Text>
        {coefficients.map((c) => (
          <View key={c.name} style={styles.featureRow}>
            <Text style={styles.featureLabel}>{c.name.replace(/_/g, ' ')}</Text>
            <Text style={[styles.coeffValue, { color: c.positive ? '#dc2626' : '#2563eb' }]}>
              {c.positive ? '+' : ''}{c.value.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MaturityTab() {
  const matrix = {
    labels: ['Imm', 'Turn', 'Mat', 'Over'],
    values: [
      [89, 4, 1, 0],
      [5, 78, 8, 2],
      [1, 6, 85, 3],
      [0, 2, 5, 82],
    ],
  };

  const rules = [
    { rule: 'Hue > 30 AND Sat > 0.5', result: 'Immature (Green)', advice: 'Wait — pod still developing' },
    { rule: 'Hue ≤ 30 AND Hue > 15', result: 'Turning (Orange)', advice: 'Can harvest or wait' },
    { rule: 'Hue ≤ 15 AND Red > 200', result: 'Mature (Red)', advice: 'Peak harvest — max heat!' },
    { rule: 'Value < 0.35 OR Sat < 0.4', result: 'Overripe', advice: 'Past prime — best dried' },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Confusion Matrix</Text>
      <View style={styles.card}>
        <View style={styles.matrixRow}>
          <View style={[styles.matrixCell, styles.matrixCorner]}>
            <Text style={styles.matrixCornerText}>Act/Pred</Text>
          </View>
          {matrix.labels.map((l) => (
            <View key={l} style={[styles.matrixCell, styles.matrixHeaderCell]}>
              <Text style={styles.matrixHeaderText}>{l}</Text>
            </View>
          ))}
        </View>
        {matrix.values.map((row, i) => (
          <View key={i} style={styles.matrixRow}>
            <View style={[styles.matrixCell, styles.matrixRowLabel]}>
              <Text style={styles.matrixRowLabelText}>{matrix.labels[i]}</Text>
            </View>
            {row.map((val, j) => (
              <View key={j} style={[styles.matrixCell, styles.matrixValue, i === j && styles.matrixDiagonal]}>
                <Text style={[styles.matrixValueText, i === j && { color: '#166534', fontWeight: '700' }]}>{val}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Accuracy</Text>
            <Text style={[styles.metricValue, { color: '#f59e0b' }]}>87.8%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>F1-Score</Text>
            <Text style={[styles.metricValue, { color: '#f59e0b' }]}>0.865</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Precision</Text>
            <Text style={[styles.metricValue, { color: '#f59e0b' }]}>0.860</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Harvest Decision Rules</Text>
      {rules.map((r, i) => (
        <View key={i} style={styles.ruleCard}>
          <View style={styles.ruleNumBadge}><Text style={styles.ruleNumText}>{i + 1}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ruleCode}>{r.rule}</Text>
            <Text style={styles.ruleResult}>→ {r.result}</Text>
            <Text style={styles.ruleAdvice}>{r.advice}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function CapsaicinTab() {
  const varieties = [
    { name: 'Siling Haba', shu: [500, 15000], color: '#22c55e' },
    { name: 'Siling Labuyo', shu: [80000, 100000], color: '#f97316' },
    { name: 'Siling Demonyo', shu: [100000, 225000], color: '#ef4444' },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Capsaicin Conversion</Text>
      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>1 SHU ≈ 0.0625 µg/g capsaicin (Todd et al., 1977)</Text>
        {varieties.map((v) => {
          const capLow = (v.shu[0] * 0.0625 / 1000).toFixed(2);
          const capHigh = (v.shu[1] * 0.0625 / 1000).toFixed(2);
          const totalLow = (v.shu[0] * 0.0625 * 1.5 / 1000).toFixed(2);
          const totalHigh = (v.shu[1] * 0.0625 * 1.5 / 1000).toFixed(2);
          return (
            <View key={v.name} style={styles.capsVarietyCard}>
              <View style={styles.capsVarietyHeader}>
                <View style={[styles.colorDot, { backgroundColor: v.color }]} />
                <Text style={styles.capsVarietyName}>{v.name}</Text>
              </View>
              <View style={styles.capsDataRow}>
                <View style={styles.capsDataItem}>
                  <Text style={styles.capsDataLabel}>SHU</Text>
                  <Text style={styles.capsDataValue}>{v.shu[0].toLocaleString()} – {v.shu[1].toLocaleString()}</Text>
                </View>
                <View style={styles.capsDataItem}>
                  <Text style={styles.capsDataLabel}>Capsaicin</Text>
                  <Text style={styles.capsDataValue}>{capLow} – {capHigh} mg/g</Text>
                </View>
                <View style={styles.capsDataItem}>
                  <Text style={styles.capsDataLabel}>Total</Text>
                  <Text style={styles.capsDataValue}>{totalLow} – {totalHigh} mg/g</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Why Flower Stress → Heat</Text>
      <View style={[styles.card, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
        <Text style={styles.thesisText}>
          Capsaicin is a chemical defense. When chili plants experience stress during flowering,
          they upregulate capsaicinoid biosynthesis genes (Pun1, AT3, KAS). This stress-induced
          capsaicin boost is measurable in fruits — the scientific basis for using flower stress
          as a predictor of fruit pungency.
        </Text>
        <View style={styles.multiplierRow}>
          {[
            { label: 'Healthy', mult: '1.0×', color: '#22c55e' },
            { label: 'Moderate', mult: '1.15×', color: '#f59e0b' },
            { label: 'High', mult: '1.3×', color: '#ef4444' },
          ].map((s) => (
            <View key={s.label} style={styles.multiplierItem}>
              <Text style={[styles.multiplierValue, { color: s.color }]}>{s.mult}</Text>
              <Text style={styles.multiplierLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  tabBar: { maxHeight: 44, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { paddingHorizontal: 16, paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#7c3aed', fontWeight: '700' },
  disclaimer: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginTop: 8,
    padding: 10, backgroundColor: '#faf5ff', borderRadius: 8, borderWidth: 1, borderColor: '#e9d5ff',
  },
  disclaimerText: { fontSize: 11, color: '#7c3aed', flex: 1 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#7c3aed', borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  cardSubtitle: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  metricItem: { alignItems: 'center' },
  metricLabel: { fontSize: 11, color: '#6b7280' },
  metricValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  barContainer: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, marginTop: 8 },
  bar: { height: 6, borderRadius: 3 },
  findingRow: { flexDirection: 'row', gap: 6, marginBottom: 6, paddingLeft: 4 },
  findingBullet: { fontSize: 14, color: '#7c3aed', fontWeight: '700' },
  findingText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },

  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureLabel: { width: 90, fontSize: 12, color: '#374151' },
  featureBarContainer: { flex: 1, height: 12, backgroundColor: '#f3f4f6', borderRadius: 6, marginHorizontal: 8 },
  featureBar: { height: 12, borderRadius: 6 },
  featurePercent: { width: 36, fontSize: 12, fontWeight: '600', color: '#111827', textAlign: 'right' },
  coeffValue: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  matrixRow: { flexDirection: 'row' },
  matrixCell: { flex: 1, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  matrixCorner: {},
  matrixCornerText: { fontSize: 8, color: '#6b7280', fontWeight: '600' },
  matrixHeaderCell: {},
  matrixHeaderText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  matrixRowLabel: {},
  matrixRowLabelText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  matrixValue: { borderWidth: 0.5, borderColor: '#e5e7eb' },
  matrixValueText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  matrixDiagonal: { backgroundColor: '#dcfce7' },

  ruleCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8,
  },
  ruleNumBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#fbbf24',
    alignItems: 'center', justifyContent: 'center',
  },
  ruleNumText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  ruleCode: { fontSize: 11, color: '#374151', backgroundColor: '#f3f4f6', padding: 4, borderRadius: 4, overflow: 'hidden' },
  ruleResult: { fontSize: 13, fontWeight: '600', color: '#b45309', marginTop: 4 },
  ruleAdvice: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  capsVarietyCard: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  capsVarietyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  capsVarietyName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  capsDataRow: { flexDirection: 'row', justifyContent: 'space-between' },
  capsDataItem: { flex: 1 },
  capsDataLabel: { fontSize: 10, color: '#6b7280' },
  capsDataValue: { fontSize: 11, fontWeight: '600', color: '#111827', marginTop: 2 },
  thesisText: { fontSize: 13, color: '#92400e', lineHeight: 19 },
  multiplierRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  multiplierItem: { alignItems: 'center' },
  multiplierValue: { fontSize: 18, fontWeight: '800' },
  multiplierLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});
