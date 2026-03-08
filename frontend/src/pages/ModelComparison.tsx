import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Cell,
} from 'recharts'
import {
  Brain, GitBranch, TreePine, Beaker,
  ChevronDown, ChevronUp, Flame, TrendingUp, Layers,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mlApi } from '@/lib/api'
import { formatNumber } from '@/lib/utils'

/* ─── Types ─── */
interface ModelMetric {
  test_r2: number; test_mae: number; test_rmse: number
  cv_r2_mean: number; cv_r2_std: number
  cv_r2_scores?: number[]
  variety_metrics?: Record<string, { mae: number; rmse: number; r2: number }>
}

interface ComparisonData {
  shu_models: { linear_regression: ModelMetric; random_forest: ModelMetric }
  maturity_model: { decision_tree: ModelMetric & { tree_depth: number; n_leaves: number } }
  best_shu_model: string
  summary: { lr_vs_rf_r2_improvement: number; lr_vs_rf_mae_reduction: number }
}

interface DTRules {
  harvest_rules: Array<{ conditions: string[]; predicted_maturity: number; stage: string; n_samples: number }>
  feature_importances: Record<string, number>
  tree_depth: number; n_leaves: number
}

/* ─── Static reference: LR coefficients from metadata ─── */
const LR_COEFFICIENTS: Record<string, number> = {
  variety_code: 134884.81, pod_length_mm: 16754.61, pod_width_mm: 7527.85,
  pod_weight_g: 10472.78, color_r: -957.72, color_g: 2961.64,
  color_b: 1407.60, hue: 4966.92, saturation: -1815.18,
  value_hsv: 294.46, maturity_score: 9736.74, flower_stress_score: 7051.93,
}

const RF_IMPORTANCES: Record<string, number> = {
  variety_code: 0.5132, pod_length_mm: 0.1697, pod_width_mm: 0.0594,
  pod_weight_g: 0.0790, color_r: 0.0453, color_g: 0.0544,
  color_b: 0.0243, hue: 0.0254, saturation: 0.0050,
  value_hsv: 0.0103, maturity_score: 0.0064, flower_stress_score: 0.0075,
}

const DT_IMPORTANCES: Record<string, number> = {
  variety_code: 0.0012, color_r: 0.9484, color_g: 0.0127,
  color_b: 0.0023, hue: 0.0240, saturation: 0.0021,
  value_hsv: 0.0046, days_to_maturity: 0.0047,
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#14b8a6']

export default function ModelComparison() {
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [dtRules, setDtRules] = useState<DTRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRules, setExpandedRules] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'shu' | 'maturity' | 'capsaicin'>('overview')

  useEffect(() => {
    Promise.all([
      mlApi.getModelComparison().catch(() => null),
      mlApi.getDecisionTreeRules().catch(() => null),
    ]).then(([comp, rules]) => {
      setComparison(comp)
      setDtRules(rules)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-secondary">Loading model data…</p>
        </div>
      </div>
    )
  }

  const lr = comparison?.shu_models.linear_regression
  const rf = comparison?.shu_models.random_forest
  const dt = comparison?.maturity_model.decision_tree

  /* Chart data */
  const metricsComparison = [
    { metric: 'R² Score', LR: lr ? +(lr.test_r2 * 100).toFixed(1) : 0, RF: rf ? +(rf.test_r2 * 100).toFixed(1) : 0, DT: dt ? +(dt.test_r2 * 100).toFixed(1) : 0 },
    { metric: 'CV R² Mean', LR: lr ? +(lr.cv_r2_mean * 100).toFixed(1) : 0, RF: rf ? +(rf.cv_r2_mean * 100).toFixed(1) : 0, DT: dt ? +(dt.cv_r2_mean * 100).toFixed(1) : 0 },
  ]

  const rfImportanceData = Object.entries(RF_IMPORTANCES)
    .sort((a, b) => b[1] - a[1])
    .map(([feat, imp]) => ({ feature: feat.replace(/_/g, ' '), importance: +(imp * 100).toFixed(1) }))

  const dtImportanceData = Object.entries(DT_IMPORTANCES)
    .sort((a, b) => b[1] - a[1])
    .map(([feat, imp]) => ({ feature: feat.replace(/_/g, ' '), importance: +(imp * 100).toFixed(1) }))

  const lrCoeffData = Object.entries(LR_COEFFICIENTS)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8)
    .map(([feat, coeff]) => ({ feature: feat.replace(/_/g, ' '), coefficient: Math.round(coeff) }))

  const varietyMAEData = ['Siling Haba', 'Siling Labuyo', 'Siling Demonyo'].map((v) => ({
    variety: v.replace('Siling ', ''),
    LR: lr?.variety_metrics?.[v]?.mae ? Math.round(lr.variety_metrics[v].mae) : 0,
    RF: rf?.variety_metrics?.[v]?.mae ? Math.round(rf.variety_metrics[v].mae) : 0,
  }))

  /* Capsaicin reference */
  const capsaicinRef = [
    { variety: 'Siling Haba', shu_low: 500, shu_high: 15000, capsaicin_low: 0.03, capsaicin_high: 0.94, heat: 'Mild' },
    { variety: 'Siling Labuyo', shu_low: 80000, shu_high: 100000, capsaicin_low: 5.0, capsaicin_high: 6.25, heat: 'Hot' },
    { variety: 'Siling Demonyo', shu_low: 100000, shu_high: 225000, capsaicin_low: 6.25, capsaicin_high: 14.06, heat: 'Extra Hot' },
  ]

  const radarData = [
    { subject: 'R² Score', LR: (lr?.test_r2 || 0) * 100, RF: (rf?.test_r2 || 0) * 100, fullMark: 100 },
    { subject: 'CV Stability', LR: Math.max(0, 100 - (lr?.cv_r2_std || 0) * 1000), RF: Math.max(0, 100 - (rf?.cv_r2_std || 0) * 1000), fullMark: 100 },
    { subject: 'Accuracy', LR: lr ? Math.max(0, 100 - lr.test_mae / 1500) : 0, RF: rf ? Math.max(0, 100 - rf.test_mae / 1500) : 0, fullMark: 100 },
    { subject: 'Interpretability', LR: 90, RF: 60, fullMark: 100 },
    { subject: 'Haba Perf', LR: lr?.variety_metrics?.['Siling Haba']?.mae ? Math.max(0, 100 - lr.variety_metrics['Siling Haba'].mae / 200) : 0, RF: rf?.variety_metrics?.['Siling Haba']?.mae ? Math.max(0, 100 - rf.variety_metrics['Siling Haba'].mae / 200) : 0, fullMark: 100 },
    { subject: 'Labuyo Perf', LR: lr?.variety_metrics?.['Siling Labuyo']?.mae ? Math.max(0, 100 - lr.variety_metrics['Siling Labuyo'].mae / 1000) : 0, RF: rf?.variety_metrics?.['Siling Labuyo']?.mae ? Math.max(0, 100 - rf.variety_metrics['Siling Labuyo'].mae / 1000) : 0, fullMark: 100 },
  ]

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Layers },
    { id: 'shu' as const, label: 'SHU Models', icon: Flame },
    { id: 'maturity' as const, label: 'Maturity', icon: TreePine },
    { id: 'capsaicin' as const, label: 'Capsaicin', icon: Beaker },
  ]

  return (
    <div className="page-container max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-indigo-100">
            <Brain className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Model Comparison</h1>
            <p className="text-sm text-foreground-secondary">
              Performance analysis of ML models for SHU prediction and maturity classification
            </p>
          </div>
        </div>
      </motion.div>

      {/* Synthetic data disclaimer (C1)
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 mb-1">Synthetic Training Data Notice</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              All models were trained on <span className="font-medium">synthetically generated data</span> (600 samples
              from <code className="bg-amber-100 px-1 rounded">dataset_generator.py</code>) rather than laboratory-measured
              specimens. While the models demonstrate high R² scores (0.97+), per-variety accuracy—particularly
              for Siling Haba (MAPE 37–73%)—indicates limited generalization. These predictions are
              <span className="font-medium"> estimates for research demonstration</span>, not validated
              HPLC capsaicin measurements.
            </p>
          </div>
        </div>
      </motion.div> */}

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="gap-1.5"
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Summary cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20">
              <CardContent className="pt-5 text-center">
                <p className="text-[10px] text-foreground-muted mb-1">Linear Regression</p>
                <p className="text-3xl font-bold text-blue-600">{lr ? (lr.test_r2 * 100).toFixed(1) : '—'}%</p>
                <p className="text-xs text-foreground-muted mt-1">R² · MAE {lr ? formatNumber(Math.round(lr.test_mae)) : '—'} SHU</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-gradient-to-br from-green-50/40 via-white to-emerald-50/20">
              <CardContent className="pt-5 text-center">
                <p className="text-[10px] text-foreground-muted mb-1">Random Forest ★</p>
                <p className="text-3xl font-bold text-green-600">{rf ? (rf.test_r2 * 100).toFixed(1) : '—'}%</p>
                <p className="text-xs text-foreground-muted mt-1">R² · MAE {rf ? formatNumber(Math.round(rf.test_mae)) : '—'} SHU</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-yellow-50/20">
              <CardContent className="pt-5 text-center">
                <p className="text-[10px] text-foreground-muted mb-1">Decision Tree (Maturity)</p>
                <p className="text-3xl font-bold text-amber-600">{dt ? (dt.test_r2 * 100).toFixed(1) : '—'}%</p>
                <p className="text-xs text-foreground-muted mt-1">R² · MAE {dt ? dt.test_mae.toFixed(3) : '—'}</p>
              </CardContent>
            </Card>
          </div>

          {/* R² comparison bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" /> Model Performance Comparison
              </CardTitle>
              <CardDescription className="text-xs">R² scores (%) across all three models</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metricsComparison} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="LR" name="Linear Regression" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="RF" name="Random Forest" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="DT" name="Decision Tree" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SHU Model Radar</CardTitle>
              <CardDescription className="text-xs">LR vs RF across multiple dimensions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Linear Regression" dataKey="LR" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Radar name="Random Forest" dataKey="RF" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══════════ SHU MODELS TAB ═══════════ */}
      {activeTab === 'shu' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Per-variety MAE */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">MAE by Variety (SHU)</CardTitle>
              <CardDescription className="text-xs">Lower is better — prediction error per chili variety</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={varietyMAEData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="variety" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatNumber(v) + ' SHU'} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="LR" name="Linear Regression" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="RF" name="Random Forest" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* RF Feature Importances */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-green-600" /> Random Forest — Feature Importances
              </CardTitle>
              <CardDescription className="text-xs">Which morphometric features contribute most to SHU prediction</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={rfImportanceData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={95} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="importance" name="Importance %" radius={[0, 4, 4, 0]}>
                    {rfImportanceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* LR Coefficients */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" /> Linear Regression — Top Coefficients
              </CardTitle>
              <CardDescription className="text-xs">
                Magnitude of each feature's weight in the linear equation (intercept = 137,587)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={lrCoeffData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={95} />
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="coefficient" name="Coefficient" radius={[0, 4, 4, 0]}>
                    {lrCoeffData.map((d, i) => (
                      <Cell key={i} fill={d.coefficient >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cross-validation */}
          {lr?.cv_r2_scores && rf?.cv_r2_scores && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">5-Fold Cross-Validation R² Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 mb-2">Linear Regression</p>
                    <div className="space-y-1">
                      {lr.cv_r2_scores.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-foreground-muted w-10">Fold {i + 1}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-blue-500 rounded-full h-2" style={{ width: `${s * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-mono w-12 text-right">{(s * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-foreground-muted mt-1">Mean: {(lr.cv_r2_mean * 100).toFixed(1)}% ± {(lr.cv_r2_std * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-600 mb-2">Random Forest</p>
                    <div className="space-y-1">
                      {rf.cv_r2_scores.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-foreground-muted w-10">Fold {i + 1}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-green-500 rounded-full h-2" style={{ width: `${s * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-mono w-12 text-right">{(s * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-foreground-muted mt-1">Mean: {(rf.cv_r2_mean * 100).toFixed(1)}% ± {(rf.cv_r2_std * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ═══════════ MATURITY TAB ═══════════ */}
      {activeTab === 'maturity' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* DT overview */}
          <div className="grid sm:grid-cols-4 gap-4">
            <Card className="border-amber-200">
              <CardContent className="pt-5 text-center">
                <p className="text-[10px] text-foreground-muted mb-1">Tree Depth</p>
                <p className="text-2xl font-bold text-amber-600">{dt?.tree_depth || dtRules?.tree_depth || 8}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardContent className="pt-5 text-center">
                <p className="text-[10px] text-foreground-muted mb-1">Leaf Nodes</p>
                <p className="text-2xl font-bold text-amber-600">{dt?.n_leaves || dtRules?.n_leaves || 62}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardContent className="pt-5 text-center">
                <p className="text-[10px] text-foreground-muted mb-1">Test R²</p>
                <p className="text-2xl font-bold text-amber-600">{dt ? (dt.test_r2 * 100).toFixed(1) : '87.8'}%</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardContent className="pt-5 text-center">
                <p className="text-[10px] text-foreground-muted mb-1">Test MAE</p>
                <p className="text-2xl font-bold text-amber-600">{dt?.test_mae.toFixed(3) || '0.084'}</p>
              </CardContent>
            </Card>
          </div>

          {/* DT Feature Importances */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TreePine className="h-4 w-4 text-amber-600" /> Decision Tree — Feature Importances
              </CardTitle>
              <CardDescription className="text-xs">
                color_r dominates at 94.8% — red channel is the primary maturity signal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dtImportanceData} layout="vertical" margin={{ left: 110 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 10 }} width={105} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="importance" name="Importance %" radius={[0, 4, 4, 0]}>
                    {dtImportanceData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#ef4444' : COLORS[(i + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Harvest Readiness Rules */}
          {dtRules?.harvest_rules && dtRules.harvest_rules.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TreePine className="h-4 w-4 text-green-600" /> Decision Tree Harvest Rules
                </CardTitle>
                <CardDescription className="text-xs">
                  Extracted rules from the trained DT — paths leading to harvest readiness stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(expandedRules ? dtRules.harvest_rules : dtRules.harvest_rules.slice(0, 5)).map((rule, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-gradient-to-r from-gray-50/50 to-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rule.stage === 'Overripe' ? 'bg-red-100 text-red-700'
                          : rule.stage === 'Mature/Ready' ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {rule.stage}
                        </span>
                        <span className="text-[10px] text-foreground-muted">
                          Maturity: {(rule.predicted_maturity * 100).toFixed(0)}% · {rule.n_samples} samples
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {rule.conditions.map((c, j) => (
                          <span key={j} className="text-[9px] font-mono px-1.5 py-0.5 bg-gray-100 rounded border text-foreground-muted">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {dtRules.harvest_rules.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setExpandedRules(!expandedRules)}>
                    {expandedRules ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                    {expandedRules ? 'Show less' : `Show all ${dtRules.harvest_rules.length} rules`}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ═══════════ CAPSAICIN TAB ═══════════ */}
      {activeTab === 'capsaicin' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Conversion formula */}
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50/30 via-white to-red-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="h-4 w-4 text-orange-600" /> SHU → Capsaicin Conversion
              </CardTitle>
              <CardDescription className="text-xs">
                Todd et al. (1977) relationship: 1 SHU ≈ 0.0625 µg/g pure capsaicin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white/70 rounded-xl p-4 border border-orange-100 text-center mb-4">
                <p className="text-xs text-foreground-muted mb-2">Conversion Formula</p>
                <p className="font-mono text-sm font-bold text-orange-700">
                  Capsaicin (mg/g) = SHU × 0.0625 ÷ 1000
                </p>
                <p className="text-[10px] text-foreground-muted mt-2">
                  Total capsaicinoids ≈ capsaicin × 1.5 (includes dihydrocapsaicin ~50% ratio)
                </p>
              </div>

              {/* Reference table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-orange-200">
                      <th className="text-left py-2 px-3 font-semibold">Variety</th>
                      <th className="text-center py-2 px-3 font-semibold">SHU Range</th>
                      <th className="text-center py-2 px-3 font-semibold">Heat</th>
                      <th className="text-center py-2 px-3 font-semibold">Capsaicin (mg/g)</th>
                      <th className="text-center py-2 px-3 font-semibold">Total Capsaicinoids</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capsaicinRef.map((row) => (
                      <tr key={row.variety} className="border-b border-gray-100 hover:bg-orange-50/30">
                        <td className="py-2.5 px-3 font-medium">{row.variety}</td>
                        <td className="py-2.5 px-3 text-center">{formatNumber(row.shu_low)}–{formatNumber(row.shu_high)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            row.heat === 'Mild' ? 'bg-green-100 text-green-700'
                            : row.heat === 'Hot' ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                          }`}>{row.heat}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{row.capsaicin_low}–{row.capsaicin_high}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{(row.capsaicin_low * 1.5).toFixed(2)}–{(row.capsaicin_high * 1.5).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-foreground-muted italic text-center mt-3">
                Note: These are estimated conversions from ML-predicted SHU values, not laboratory HPLC measurements.
                Actual capsaicinoid levels vary with growing conditions, maturity, and post-harvest handling.
              </p>
            </CardContent>
          </Card>

          {/* Morphology → Pungency correlation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-red-600" /> Morphology → Pungency Correlation
              </CardTitle>
              <CardDescription className="text-xs">
                How physical measurements correlate with Scoville rating — based on trained model weights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { feat: 'Variety (genetic)', impact: 'Primary driver (51.3% RF importance)', direction: 'up' as const, detail: 'Labuyo > Haba genetically' },
                  { feat: 'Pod Length', impact: '17.0% RF importance', direction: 'up' as const, detail: 'Longer pods → higher SHU (within variety)' },
                  { feat: 'Pod Weight', impact: '7.9% RF importance', direction: 'up' as const, detail: 'Heavier pods correlate with more capsaicin' },
                  { feat: 'Flower Stress', impact: 'Multiplier 1.0–1.3×', direction: 'up' as const, detail: 'Stress triggers capsaicin defense response' },
                  { feat: 'Maturity', impact: '0.6% RF importance', direction: 'up' as const, detail: 'Ripe > Green for capsaicin concentration' },
                  { feat: 'Color (Red)', impact: '-958 SHU/unit in LR', direction: 'down' as const, detail: 'Confounded with maturity in linear model' },
                ].map((item) => (
                  <div key={item.feat} className="flex items-start gap-3 p-3 rounded-lg border bg-white/70">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${item.direction === 'up' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <TrendingUp className={`h-3.5 w-3.5 ${item.direction === 'up' ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">{item.feat}</p>
                      <p className="text-[10px] text-foreground-muted">{item.impact}</p>
                      <p className="text-[10px] text-foreground-muted italic mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
