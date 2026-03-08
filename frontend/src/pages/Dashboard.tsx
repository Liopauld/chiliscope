import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Flame, 
  TrendingUp, 
  Image as ImageIcon, 
  Zap,
  ArrowRight,
  Cpu,
  BarChart3,
  Camera,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { analyticsApi } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface DashboardData {
  total_samples: number
  total_predictions: number
  avg_accuracy: number
  variety_distribution: Record<string, number>
  heat_distribution: Record<string, number>
  recent_predictions: Array<{
    id: string
    variety: string
    heat_level: string
    shu: number
    timestamp: string
  }>
}

function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return count
}

const varietyData = [
  { name: 'Siling Haba', heatRange: '0 – 15,000 SHU', level: 'Mild–Medium', borderColor: 'border-green-400', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  { name: 'Siling Labuyo', heatRange: '15,000 – 50,000 SHU', level: 'Hot', borderColor: 'border-orange-400', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
  { name: 'Siling Demonyo', heatRange: '50,000+ SHU', level: 'Extra Hot', borderColor: 'border-red-500', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: analyticsApi.getDashboard,
  })

  const defaults: DashboardData = {
    total_samples: 0,
    total_predictions: 0,
    avg_accuracy: 95.0,
    variety_distribution: { 'Siling Haba': 33, 'Siling Labuyo': 34, 'Siling Demonyo': 33 },
    heat_distribution: { 'Mild': 25, 'Medium': 35, 'Hot': 28, 'Extra Hot': 12 },
    recent_predictions: [],
  }

  const d: DashboardData = {
    total_samples: data?.total_samples ?? defaults.total_samples,
    total_predictions: data?.total_predictions ?? defaults.total_predictions,
    avg_accuracy: data?.avg_accuracy ?? defaults.avg_accuracy,
    variety_distribution: data?.variety_distribution ?? defaults.variety_distribution,
    heat_distribution: data?.heat_distribution ?? defaults.heat_distribution,
    recent_predictions: data?.recent_predictions ?? defaults.recent_predictions,
  }

  const analysesCount = useCounter(d.total_samples)
  const accuracyCount = useCounter(d.avg_accuracy * 10) / 10
  const varietiesCount = useCounter(3)
  const predictionsCount = useCounter(d.total_predictions)

  const stats = [
    { label: 'Total Analyses', value: formatNumber(analysesCount), icon: ImageIcon, color: 'bg-primary-100 text-primary-700' },
    { label: 'Accuracy', value: `${accuracyCount.toFixed(1)}%`, icon: TrendingUp, color: 'bg-secondary-100 text-secondary-700' },
    { label: 'Varieties', value: varietiesCount, icon: Flame, color: 'bg-red-100 text-red-600' },
    { label: 'Predictions', value: formatNumber(predictionsCount), icon: Zap, color: 'bg-amber-100 text-amber-700' },
  ]

  const heatGradient = (level: string) => {
    const m: Record<string, string> = { Mild: 'heat-gradient-mild', Medium: 'heat-gradient-medium', Hot: 'heat-gradient-hot', 'Extra Hot': 'heat-gradient-extra-hot' }
    return m[level] || 'bg-foreground-muted'
  }

  return (
    <div className="page-container space-y-6">
      {/* Welcome Banner */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-xl bg-sidebar p-6 sm:p-8"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-0 right-24 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'Researcher'}
            </h1>
            <p className="text-white/60 mt-1 text-sm sm:text-base">
              Ready to analyze chili heat levels? Upload a sample to get started.
            </p>
          </div>
          <Button
            onClick={() => navigate('/upload')}
            className="bg-white text-sidebar hover:bg-white/90 font-semibold shadow-button shrink-0"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </div>
      </motion.section>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-3 bg-stone-100 rounded w-16 mb-2" />
                    <div className="h-6 bg-stone-100 rounded w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="h-5 bg-stone-100 rounded w-28" />
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-stone-100 rounded-xl" />
                      <div className="flex-1">
                        <div className="h-4 bg-stone-100 rounded w-24 mb-1.5" />
                        <div className="h-3 bg-stone-50 rounded w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-5 bg-stone-100 rounded w-32" />
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-stone-100 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-stone-100 rounded w-20 mb-1" />
                      <div className="h-3 bg-stone-50 rounded w-28" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
      <>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-4 sm:p-5 flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-foreground-muted font-medium">{s.label}</p>
                  <p className="text-xl sm:text-2xl font-bold font-display text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Quick Actions + Varieties */}
      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <h2 className="page-subtitle mb-3">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Quick Analysis', desc: 'Upload a single image for instant heat prediction', emoji: '🌶️', path: '/upload' },
              { title: 'View Library', desc: 'Browse and compare your past analyses', emoji: '📈', path: '/library' },
              { title: 'Encyclopedia', desc: 'Learn about Philippine chili varieties', emoji: '📚', path: '/encyclopedia' },
              { title: 'Culinary Guide', desc: 'Discover recipes by heat level', emoji: '👨‍🍳', path: '/culinary' },
            ].map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.06 }}>
                <Card className="cursor-pointer group hover:-translate-y-0.5 transition-all duration-200" onClick={() => navigate(item.path)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-foreground-muted line-clamp-1">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-foreground-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="page-subtitle mb-3">Supported Varieties</h2>
          <div className="space-y-3">
            {varietyData.map((v, i) => (
              <motion.div key={v.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                <Card className={`border-l-4 ${v.borderColor}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${v.iconBg}`}>
                      <Flame className={`h-4 w-4 ${v.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{v.name}</p>
                      <p className="text-xs text-foreground-muted">{v.level} · {v.heatRange}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Analytics Charts */}
      <section>
        <h2 className="page-subtitle mb-4">Analytics Overview</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Variety Distribution Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }}>
            <Card className="h-full">
              <CardContent className="p-5">
                <h3 className="font-semibold font-display text-foreground mb-4 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  Variety Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(d.variety_distribution).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name.replace('Siling ', '')} ${value}%`}
                        labelLine={false}
                      >
                        {Object.keys(d.variety_distribution).map((_, idx) => (
                          <Cell key={idx} fill={['#22c55e', '#f97316', '#ef4444'][idx % 3]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {Object.entries(d.variety_distribution).map(([name], idx) => (
                    <div key={name} className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#22c55e', '#f97316', '#ef4444'][idx % 3] }} />
                      {name.replace('Siling ', '')}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Heat Distribution Bar Chart */}
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
            <Card className="h-full">
              <CardContent className="p-5">
                <h3 className="font-semibold font-display text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  Heat Level Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(d.heat_distribution).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-foreground-muted)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--color-foreground-muted)" unit="%" />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {Object.keys(d.heat_distribution).map((level, idx) => {
                          const colors: Record<string, string> = { Mild: '#22c55e', Medium: '#eab308', Hot: '#f97316', 'Extra Hot': '#ef4444' }
                          return <Cell key={idx} fill={colors[level] || '#6b7280'} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="page-subtitle mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Camera, title: 'Upload Image', desc: 'Capture or upload a clear image of your chili flower or pod', color: 'bg-primary-100 text-primary-700' },
            { icon: Cpu, title: 'AI Analysis', desc: 'Our ML model detects variety and morphological features', color: 'bg-secondary-100 text-secondary-700' },
            { icon: BarChart3, title: 'Get Results', desc: 'Receive heat level prediction, SHU range, and tips', color: 'bg-amber-100 text-amber-700' },
          ].map((step, i) => (
            <motion.div key={step.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} viewport={{ once: true }}>
              <Card className="h-full text-center hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-6 flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-4`}>
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold font-display text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-foreground-secondary">{step.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Predictions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="page-subtitle">Recent Predictions</h2>
          {d.recent_predictions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => navigate('/library')}>
              View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {d.recent_predictions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-surface mb-4">
                <ImageIcon className="h-10 w-10 text-foreground-muted" />
              </div>
              <h3 className="font-semibold font-display text-foreground mb-1">No predictions yet</h3>
              <p className="text-sm text-foreground-muted mb-5">Start analyzing chili peppers to see your predictions here</p>
              <Button onClick={() => navigate('/upload')}>
                <Camera className="mr-2 h-4 w-4" />
                Analyze Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {d.recent_predictions.slice(0, 6).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} viewport={{ once: true }}>
                <Card className="cursor-pointer hover:-translate-y-0.5 transition-all duration-200" onClick={() => navigate(`/results/${p.id}`)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${heatGradient(p.heat_level)} shadow-sm`}>
                      <Flame className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{p.variety}</p>
                      <p className="text-sm text-foreground-secondary">{formatNumber(p.shu)} SHU</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${heatGradient(p.heat_level)}`}>
                      {p.heat_level}
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      </>
      )}
    </div>
  )
}
