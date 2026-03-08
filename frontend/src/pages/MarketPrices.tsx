import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  BarChart3,
  Calendar,
  RefreshCw,
  Database,
  Info,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { pricesApi } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores/authStore'
import PricePrediction from '@/components/PricePrediction'

type ChiliKey = 'siling_labuyo' | 'siling_haba' | 'siling_demonyo'

interface TrendPoint {
  date: string
  price: number
  low: number
  high: number
}

interface VarietyOverview {
  current_price: number
  current_low: number
  current_high: number
  avg_price: number
  min_price: number
  max_price: number
  price_change_pct: number
  data_points: number
  date_range?: { start: string; end: string }
  trend: TrendPoint[]
}

type MarketData = Record<ChiliKey, VarietyOverview>

const VARIETY_META: Record<ChiliKey, { label: string; color: string; gradient: string; emoji: string; tagline: string }> = {
  siling_labuyo: {
    label: 'Siling Labuyo',
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-500',
    emoji: '🌶️',
    tagline: 'Hot • Bird\'s Eye Chili',
  },
  siling_haba: {
    label: 'Siling Haba',
    color: '#22c55e',
    gradient: 'from-green-500 to-emerald-500',
    emoji: '🫑',
    tagline: 'Mild • Finger Chili',
  },
  siling_demonyo: {
    label: 'Siling Demonyo',
    color: '#ef4444',
    gradient: 'from-red-500 to-rose-600',
    emoji: '🔥',
    tagline: 'Extra Hot • Demon Chili',
  },
}

const VARIETY_ORDER: ChiliKey[] = ['siling_labuyo', 'siling_haba', 'siling_demonyo']

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function MarketPrices() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [selectedVariety, setSelectedVariety] = useState<ChiliKey>('siling_labuyo')
  const [chartMode, setChartMode] = useState<'line' | 'area'>('area')
  const { toast } = useToast()
  const { canAccessAdminFeatures } = useAuthStore()

  const fetchData = async () => {
    setLoading(true)
    try {
      const overview = await pricesApi.getMarketOverview()
      setData(overview)
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Failed to load market data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await pricesApi.seed()
      toast({ title: 'Price data seeded!', description: res.message })
      await fetchData()
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Failed to seed data' })
    } finally {
      setSeeding(false)
    }
  }

  const activeData = data?.[selectedVariety]
  const meta = VARIETY_META[selectedVariety]

  // Merged chart data for comparison overlay
  const comparisonData = useMemo(() => {
    if (!data) return []
    // Use labuyo dates as the base (most complete)
    const dateMap = new Map<string, Record<string, number>>()
    for (const key of VARIETY_ORDER) {
      for (const pt of data[key]?.trend || []) {
        const existing = dateMap.get(pt.date) || {}
        existing[key] = pt.price
        dateMap.set(pt.date, existing)
      }
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, prices]) => ({ date, ...prices }))
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading market data…</p>
        </div>
      </div>
    )
  }

  const hasData = data && Object.values(data).some((v) => v.data_points > 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Source Serif 4', serif" }}>
            Market Prices
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Philippine chili pepper price tracking • Metro Manila markets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {canAccessAdminFeatures() && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Seeding…' : 'Seed Data'}
            </button>
          )}
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border rounded-2xl p-12 text-center space-y-4"
        >
          <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto" />
          <h2 className="text-lg font-semibold">No Price Data Yet</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Price data hasn't been loaded yet.
            {canAccessAdminFeatures()
              ? ' Click "Seed Data" to load real market data — Siling Labuyo (Jan 2024 – Dec 2025), Siling Haba (Sep 2025 – Feb 2026), and estimated Siling Demonyo prices.'
              : ' Ask an admin to seed the price database.'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* ============ PRICE SUMMARY CARDS ============ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VARIETY_ORDER.map((key, i) => {
              const v = data![key]
              const m = VARIETY_META[key]
              const isSelected = key === selectedVariety
              // For chili prices, a decrease is actually good for consumers
              const changeBg =
                v.price_change_pct > 5
                  ? 'bg-red-50 text-red-700'
                  : v.price_change_pct < -5
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-50 text-gray-600'

              return (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setSelectedVariety(key)}
                  className={`relative bg-white border-2 rounded-2xl p-5 text-left transition-all hover:shadow-md ${
                    isSelected ? 'border-primary shadow-md ring-2 ring-primary/10' : 'border-transparent'
                  }`}
                >
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-sm">{m.label}</h3>
                        <span className="text-[11px] text-muted-foreground">{m.tagline}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${changeBg}`}>
                      {v.price_change_pct > 0 ? '+' : ''}
                      {v.price_change_pct}%
                    </span>
                  </div>

                  {/* Current price */}
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{formatPeso(v.current_price)}</span>
                    <span className="text-xs text-muted-foreground mb-1">/kg (avg)</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Low {formatPeso(v.current_low)} — High {formatPeso(v.current_high)}
                  </div>

                  {/* Mini sparkline */}
                  {v.trend.length > 2 && (
                    <div className="mt-3 h-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={v.trend.slice(-20)}>
                          <defs>
                            <linearGradient id={`mini-${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke={m.color}
                            fill={`url(#mini-${key})`}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>Avg: {formatPeso(v.avg_price)}</span>
                    <span>•</span>
                    <span>{v.data_points} records</span>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* ============ AI PRICE PREDICTION (Forecast First) ============ */}
          <PricePrediction />

          {/* ============ MAIN CHART ============ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <span>{meta.emoji}</span>
                  {meta.label} — Price Trend
                </h2>
                {activeData?.date_range && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {activeData.date_range.start} to {activeData.date_range.end}
                    {selectedVariety !== 'siling_demonyo' ? (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-medium">
                        Real Data
                      </span>
                    ) : (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-medium">
                        Estimated
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setChartMode('area')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    chartMode === 'area' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartMode('line')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    chartMode === 'line' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Line
                </button>
              </div>
            </div>

            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'area' ? (
                  <AreaChart data={activeData?.trend || []}>
                    <defs>
                      <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={meta.color} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={meta.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
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
                        name === 'price' ? 'Avg' : name === 'high' ? 'High' : 'Low',
                      ]}
                      labelFormatter={(label) => {
                        const d = new Date(label)
                        return d.toLocaleDateString('en-PH', {
                          weekday: 'short',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
                    />
                    <Area type="monotone" dataKey="high" stroke={meta.color} fill="url(#gradHigh)" strokeWidth={1} strokeDasharray="4 2" name="high" dot={false} />
                    <Area type="monotone" dataKey="price" stroke={meta.color} fill="none" strokeWidth={2.5} name="price" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="low" stroke={meta.color} fill="none" strokeWidth={1} strokeDasharray="4 2" name="low" dot={false} strokeOpacity={0.5} />
                    <Legend
                      formatter={(value) => (value === 'price' ? 'Average' : value === 'high' ? 'High' : 'Low')}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={activeData?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `₱${v}`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip
                      formatter={(val: number, name: string) => [
                        formatPeso(val),
                        name === 'price' ? 'Avg' : name === 'high' ? 'High' : 'Low',
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
                    />
                    <Line type="monotone" dataKey="high" stroke={meta.color} strokeWidth={1} strokeDasharray="4 2" dot={false} name="high" opacity={0.5} />
                    <Line type="monotone" dataKey="price" stroke={meta.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="price" />
                    <Line type="monotone" dataKey="low" stroke={meta.color} strokeWidth={1} strokeDasharray="4 2" dot={false} name="low" opacity={0.5} />
                    <Legend
                      formatter={(value) => (value === 'price' ? 'Average' : value === 'high' ? 'High' : 'Low')}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ============ STATS + COMPARISON ============ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Stats Panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border rounded-2xl p-5 lg:col-span-1"
            >
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                {meta.label} — Summary
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Latest Avg Price', value: formatPeso(activeData?.current_price || 0), highlight: true },
                  { label: 'Latest Low', value: formatPeso(activeData?.current_low || 0) },
                  { label: 'Latest High', value: formatPeso(activeData?.current_high || 0) },
                  { label: 'Period Average', value: formatPeso(activeData?.avg_price || 0) },
                  { label: 'Period Low', value: formatPeso(activeData?.min_price || 0) },
                  { label: 'Period High', value: formatPeso(activeData?.max_price || 0) },
                  { label: 'Price Change', value: `${(activeData?.price_change_pct || 0) > 0 ? '+' : ''}${activeData?.price_change_pct || 0}%` },
                  { label: 'Data Points', value: String(activeData?.data_points || 0) },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={`text-sm font-medium ${row.highlight ? 'text-foreground' : ''}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedVariety === 'siling_demonyo' ? (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg flex gap-2 text-xs text-amber-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Siling Demonyo prices are <strong>estimated</strong> based on Siling Labuyo trends
                    (×1.45 multiplier). Real market data for this variety is not yet available.
                  </span>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex gap-2 text-xs text-emerald-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {selectedVariety === 'siling_labuyo'
                      ? <>This data is from <strong>real market monitoring</strong> (Jan 2024 – Dec 2025, Metro Manila). Siling Labuyo is highly seasonal — prices can spike above ₱1,000/kg during supply shortages.</>
                      : <>This data is from <strong>real market monitoring</strong> (Sep 2025 – Feb 2026, Metro Manila). Siling Haba prevailing prices from official market reports.</>}
                  </span>
                </div>
              )}
            </motion.div>

            {/* All Varieties Comparison Chart */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white border rounded-2xl p-5 lg:col-span-2"
            >
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                All Varieties — Price Comparison
              </h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `₱${v}`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip
                      formatter={(val: number, name: string) => [
                        formatPeso(val),
                        VARIETY_META[name as ChiliKey]?.label || name,
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
                    />
                    {VARIETY_ORDER.map((key) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={VARIETY_META[key].color}
                        strokeWidth={2}
                        dot={false}
                        name={key}
                        activeDot={{ r: 3 }}
                      />
                    ))}
                    <Legend
                      formatter={(value) => VARIETY_META[value as ChiliKey]?.label || value}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* ============ DATA TABLE ============ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white border rounded-2xl p-5"
          >
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {meta.label} — Daily Price History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-right py-2 px-3 font-medium">Low (₱/kg)</th>
                    <th className="text-right py-2 px-3 font-medium">Avg (₱/kg)</th>
                    <th className="text-right py-2 px-3 font-medium">High (₱/kg)</th>
                    <th className="text-right py-2 px-3 font-medium">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeData?.trend || [])
                    .slice()
                    .reverse()
                    .slice(0, 50)
                    .map((row, i) => {
                      const spread = row.high - row.low
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 px-3 text-xs">
                            {new Date(row.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs">{formatPeso(row.low)}</td>
                          <td className="py-2 px-3 text-right font-mono text-xs font-semibold">{formatPeso(row.price)}</td>
                          <td className="py-2 px-3 text-right font-mono text-xs">{formatPeso(row.high)}</td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                                spread > 400 ? 'bg-red-50 text-red-600' : spread > 200 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                              }`}
                            >
                              ₱{spread}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
