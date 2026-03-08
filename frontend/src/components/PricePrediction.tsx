import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Calendar,
  AlertTriangle,
  Lock,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { pricesApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/use-toast'

type ChiliKey = 'siling_labuyo' | 'siling_haba'

interface PredictionPoint {
  date: string
  predicted_price: number
  day_offset: number
}

interface PredictionSummary {
  avg_predicted: number
  min_predicted: number
  max_predicted: number
  trend: string
  trend_pct: number
}

interface ModelInfo {
  type: string
  r2_score: number
  mae: number
  trained_at: string
}

interface PredictionResult {
  chili_type: string
  predictions: PredictionPoint[]
  recent_prices: { date: string; price: number }[]
  summary: PredictionSummary
  model_info: ModelInfo
}

type ForecastPeriod = 'day' | 'week' | 'month'

const PERIOD_CONFIG: Record<ForecastPeriod, { label: string; days: number; icon: string; desc: string }> = {
  day: { label: 'Next Day', days: 1, icon: '📅', desc: 'Tomorrow\'s price' },
  week: { label: 'Next Week', days: 7, icon: '📆', desc: '7-day forecast' },
  month: { label: 'Next Month', days: 30, icon: '🗓️', desc: '30-day forecast' },
}

const CHILI_META: Record<ChiliKey, { label: string; color: string; emoji: string }> = {
  siling_labuyo: { label: 'Siling Labuyo', color: '#f97316', emoji: '🌶️' },
  siling_haba: { label: 'Siling Haba', color: '#22c55e', emoji: '🫑' },
}

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function PricePrediction() {
  const [selectedChili, setSelectedChili] = useState<ChiliKey>('siling_labuyo')
  const [selectedPeriod, setSelectedPeriod] = useState<ForecastPeriod>('week')
  const [predictions, setPredictions] = useState<Record<string, PredictionResult | null>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isAuthenticated } = useAuthStore()
  const { toast } = useToast()

  const cacheKey = `${selectedChili}_${selectedPeriod}`
  const result = predictions[cacheKey] || null

  const fetchPrediction = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    setError(null)
    try {
      const data = await pricesApi.predict(selectedChili, PERIOD_CONFIG[selectedPeriod].days)
      setPredictions((prev) => ({ ...prev, [cacheKey]: data }))
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      if (e.response?.status === 401) {
        setError('unverified')
      } else {
        setError(e.response?.data?.detail || 'Failed to fetch predictions')
        toast({ variant: 'destructive', title: 'Prediction failed', description: 'Could not load price forecast.' })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && !predictions[cacheKey]) {
      fetchPrediction()
    }
  }, [selectedChili, selectedPeriod, isAuthenticated])

  // Build combined chart data (recent + predicted)
  const chartData = (() => {
    if (!result) return []
    const recent = result.recent_prices.map((p) => ({
      date: p.date,
      actual: p.price,
      predicted: null as number | null,
    }))
    const predicted = result.predictions.map((p) => ({
      date: p.date,
      actual: null as number | null,
      predicted: p.predicted_price,
    }))
    // Connect the bridge: last actual price = first predicted connector
    if (recent.length > 0 && predicted.length > 0) {
      predicted[0] = { ...predicted[0], actual: recent[recent.length - 1].actual }
    }
    return [...recent, ...predicted]
  })()

  const meta = CHILI_META[selectedChili]
  const todayPrice = result?.recent_prices?.[result.recent_prices.length - 1]?.price
  const tomorrowPrice = result?.predictions?.[0]?.predicted_price

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border rounded-2xl p-8 text-center space-y-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold">Price Predictions</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          AI-powered price forecasting is available for verified accounts only.
          Sign in and verify your email to access next-day, weekly, and monthly price predictions.
        </p>
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Sign In <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              AI Price Prediction
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wide">
                ML Model
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Random Forest model • R² = {result?.model_info?.r2_score?.toFixed(4) || '0.9823'} accuracy
            </p>
          </div>
        </div>
        <button
          onClick={fetchPrediction}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Chili Type + Period Selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Chili Selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(Object.entries(CHILI_META) as [ChiliKey, typeof CHILI_META[ChiliKey]][]).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setSelectedChili(key)}
              className={`px-3 py-2 text-xs rounded-md transition-all font-medium flex items-center gap-1.5 ${
                selectedChili === key
                  ? 'bg-white shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(Object.entries(PERIOD_CONFIG) as [ForecastPeriod, typeof PERIOD_CONFIG[ForecastPeriod]][]).map(
            ([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedPeriod(key)}
                className={`px-3 py-2 text-xs rounded-md transition-all font-medium flex items-center gap-1.5 ${
                  selectedPeriod === key
                    ? 'bg-white shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{config.icon}</span> {config.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Error state: unverified */}
      {error === 'unverified' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 text-sm">Email Verification Required</h4>
            <p className="text-xs text-amber-700 mt-1">
              Please verify your email address to access AI price predictions.
              Check your inbox for a verification email, or{' '}
              <a href="/verify-email" className="underline font-medium">
                resend the verification email
              </a>.
            </p>
          </div>
        </div>
      )}

      {/* Error state: generic */}
      {error && error !== 'unverified' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800 text-sm">Prediction Error</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <Sparkles className="w-8 h-8 text-violet-500 mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground mt-3">Generating price forecast…</p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && !loading && !error && (
          <motion.div
            key={cacheKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Summary Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Next Day Prediction */}
              <div className="bg-white border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Next Day
                </p>
                <p className="text-xl font-bold mt-1" style={{ color: meta.color }}>
                  {tomorrowPrice ? formatPeso(tomorrowPrice) : '—'}
                </p>
                {todayPrice && tomorrowPrice && (
                  <div className="flex items-center gap-1 mt-1">
                    {tomorrowPrice > todayPrice ? (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    ) : tomorrowPrice < todayPrice ? (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    ) : (
                      <Minus className="w-3 h-3 text-gray-400" />
                    )}
                    <span
                      className={`text-[11px] font-medium ${
                        tomorrowPrice > todayPrice ? 'text-red-500' : tomorrowPrice < todayPrice ? 'text-green-500' : 'text-gray-500'
                      }`}
                    >
                      {((tomorrowPrice - todayPrice) / todayPrice * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Average */}
              <div className="bg-white border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Avg ({PERIOD_CONFIG[selectedPeriod].label})
                </p>
                <p className="text-xl font-bold mt-1">
                  {formatPeso(result.summary.avg_predicted)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Forecasted average</p>
              </div>

              {/* Range */}
              <div className="bg-white border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Price Range
                </p>
                <p className="text-sm font-bold mt-1">
                  {formatPeso(result.summary.min_predicted)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  to {formatPeso(result.summary.max_predicted)}
                </p>
              </div>

              {/* Trend */}
              <div className="bg-white border rounded-xl p-4">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Trend
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {result.summary.trend === 'increasing' ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : result.summary.trend === 'decreasing' ? (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      result.summary.trend === 'increasing'
                        ? 'text-red-500'
                        : result.summary.trend === 'decreasing'
                          ? 'text-green-500'
                          : 'text-gray-500'
                    }`}
                  >
                    {result.summary.trend_pct > 0 ? '+' : ''}
                    {result.summary.trend_pct}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                  {result.summary.trend}
                </p>
              </div>
            </div>

            {/* Forecast Chart */}
            <div className="bg-white border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500" />
                  {meta.emoji} {meta.label} — {PERIOD_CONFIG[selectedPeriod].desc}
                </h3>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 rounded" style={{ backgroundColor: meta.color }} /> Actual
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 rounded bg-violet-500" style={{ borderBottom: '2px dashed #8b5cf6' }} /> Predicted
                  </span>
                </div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={meta.color} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={meta.color} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPredicted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₱${v}`}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={55}
                    />
                    <Tooltip
                      formatter={(val: number, name: string) => [
                        formatPeso(val),
                        name === 'actual' ? 'Actual Price' : 'Predicted Price',
                      ]}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString('en-PH', {
                          weekday: 'short',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
                    />
                    {/* Vertical line separating actual from predicted */}
                    {result.recent_prices.length > 0 && (
                      <ReferenceLine
                        x={result.recent_prices[result.recent_prices.length - 1].date}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{ value: 'Today', position: 'top', fontSize: 10, fill: '#64748b' }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke={meta.color}
                      fill="url(#gradActual)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      stroke="#8b5cf6"
                      fill="url(#gradPredicted)"
                      strokeWidth={2.5}
                      strokeDasharray="6 3"
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Forecast Table */}
            <div className="bg-white border rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                Daily Forecast Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-right py-2 px-3 font-medium">Predicted Price</th>
                      <th className="text-right py-2 px-3 font-medium">Day</th>
                      <th className="text-right py-2 px-3 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.predictions.map((p, i) => {
                      const prev = i > 0 ? result.predictions[i - 1].predicted_price : todayPrice || p.predicted_price
                      const change = prev ? ((p.predicted_price - prev) / prev) * 100 : 0
                      return (
                        <tr
                          key={p.date}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="py-2 px-3 text-xs">
                            {new Date(p.date).toLocaleDateString('en-PH', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs font-semibold">
                            {formatPeso(p.predicted_price)}
                          </td>
                          <td className="py-2 px-3 text-right text-xs text-muted-foreground">
                            +{p.day_offset}d
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                                change > 0
                                  ? 'bg-red-50 text-red-600'
                                  : change < 0
                                    ? 'bg-green-50 text-green-600'
                                    : 'bg-gray-50 text-gray-500'
                              }`}
                            >
                              {change > 0 ? '+' : ''}
                              {change.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model Info Footer */}
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 text-violet-500 mt-0.5" />
                <div className="text-xs text-violet-700">
                  <p className="font-medium">Model: {result.model_info.type}</p>
                  <p className="mt-0.5">
                    R² Score: {result.model_info.r2_score.toFixed(4)} • MAE: ₱
                    {result.model_info.mae.toFixed(2)} • Trained:{' '}
                    {new Date(result.model_info.trained_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-violet-500 font-medium px-2 py-1 rounded-full bg-violet-100">
                ±₱{result.model_info.mae.toFixed(0)} avg error
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
