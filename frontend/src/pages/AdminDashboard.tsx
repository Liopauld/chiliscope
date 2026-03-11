import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Shield, BarChart3, Settings, Flame, Search, ChevronDown,
  Activity, Cpu, AlertTriangle, Check, TrendingUp,
  Eye, UserPlus, Download, Ban, ShieldCheck, X, Mail, MapPin, Calendar, BarChart2, Clock, RefreshCcw,
  FileSpreadsheet, FileText
} from 'lucide-react'
import { exportAnalyticsPDF, exportAnalyticsExcel } from '@/lib/exportUtils'
import { chatApi, analyticsApi, usersApi, modelsApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface UserData {
  user_id: string; full_name: string; email: string; user_type: string
  is_active: boolean; created_at: string; updated_at?: string
  location?: { region?: string; province?: string; municipality?: string }
  profile_image?: string
  total_analyses?: number
  deactivation_reason?: string
  deactivation_category?: string
  deactivated_at?: string
  deactivated_by?: string
  is_temporary_ban?: boolean
  ban_duration_days?: number
  reactivation_note?: string
  reactivated_at?: string
}

const DEACTIVATION_REASONS = [
  { value: 'terms_violation', label: 'Violation of Terms of Service', message: 'Your account has been deactivated due to a violation of our Terms of Service. Please contact support if you believe this is an error.' },
  { value: 'spam_abuse', label: 'Spam or Abusive Behavior', message: 'Your account has been deactivated due to spam or abusive behavior detected on the platform.' },
  { value: 'inappropriate_content', label: 'Inappropriate Content', message: 'Your account has been deactivated due to posting inappropriate content that violates our community guidelines.' },
  { value: 'account_security', label: 'Account Security Concern', message: 'Your account has been temporarily deactivated due to security concerns. Please contact support to verify your identity.' },
  { value: 'temporary_suspension', label: 'Temporary Suspension', message: 'Your account has been temporarily suspended. You will regain access after the suspension period ends.' },
  { value: 'inactivity', label: 'Prolonged Inactivity', message: 'Your account has been deactivated due to prolonged inactivity. Contact support to reactivate.' },
  { value: 'other', label: 'Other', message: '' },
]

interface ModelData {
  model_id: string; model_name: string; version: string
  model_type: string; status: string; is_active: boolean
  created_at: string; trained_at?: string
  performance_metrics?: { accuracy?: number; precision?: number }
}

interface ActivityItem {
  text: string; time: string; icon: string
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

function StatCard({ label, value, icon: Icon, trend, color }: { label: string; value: string | number; icon: React.ElementType; trend?: string; color: string }) {
  return (
    <Card className="hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-foreground-muted mb-1">{label}</p>
            <p className="text-2xl font-bold font-display text-foreground">{value}</p>
            {trend && <p className="text-[10px] text-secondary font-medium mt-1 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{trend}</p>}
          </div>
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UserRoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: 'badge-role-admin', researcher: 'badge-role-researcher', student: 'badge-role-student'
  }
  return <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize', styles[role] || 'bg-gray-100 text-gray-700')}>{role}</span>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600',
    suspended: 'bg-red-100 text-red-700', training: 'bg-amber-100 text-amber-700',
    deprecated: 'bg-gray-100 text-gray-500'
  }
  return <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize', styles[status] || 'bg-gray-100 text-gray-600')}>{status}</span>
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(isoDate).toLocaleDateString()
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [dashboardData, setDashboardData] = useState<Record<string, unknown> | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [mlModels, setMlModels] = useState<ModelData[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewUser, setViewUser] = useState<UserData | null>(null)
  const [viewUserLoading, setViewUserLoading] = useState(false)
  const [banUser, setBanUser] = useState<UserData | null>(null)
  const [banCategory, setBanCategory] = useState('')
  const [banMessage, setBanMessage] = useState('')
  const [banTemporary, setBanTemporary] = useState(false)
  const [banDuration, setBanDuration] = useState(7)
  const [banLoading, setBanLoading] = useState(false)
  const [reactivateLoading, setReactivateLoading] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)
      try {
        const [dashData, usersData, modelsData] = await Promise.all([
          analyticsApi.getDashboard().catch(() => null),
          usersApi.list(0, 100).catch(() => []),
          modelsApi.list().catch(() => ({ models: [] })),
        ])
        if (dashData) {
          setDashboardData(dashData)
          setRecentActivity((dashData.recent_activity as ActivityItem[]) ?? [])
        }
        setUsers(Array.isArray(usersData) ? usersData : [])
        setMlModels(Array.isArray(modelsData?.models) ? modelsData.models : modelsData?.models ? [] : [])
      } catch (err) {
        console.error('Failed to fetch admin data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleViewUser = async (user: UserData) => {
    setViewUserLoading(true)
    setViewUser(user)
    try {
      const fullUser = await usersApi.getUser(user.user_id)
      setViewUser(fullUser)
    } catch {
      // Fallback to basic data we already have
    } finally {
      setViewUserLoading(false)
    }
  }

  const handleOpenBanModal = (user: UserData) => {
    setBanUser(user)
    setBanCategory('')
    setBanMessage('')
    setBanTemporary(false)
    setBanDuration(7)
  }

  const handleBanUser = async () => {
    if (!banUser || !banCategory) return
    setBanLoading(true)
    try {
      const selectedReason = DEACTIVATION_REASONS.find(r => r.value === banCategory)
      const message = banMessage || selectedReason?.message || 'Your account has been deactivated.'
      await usersApi.deactivate(banUser.user_id, {
        reason: message,
        reason_category: banCategory,
        is_temporary: banTemporary,
        duration_days: banTemporary ? banDuration : undefined,
      })
      setUsers(prev => prev.map(u => u.user_id === banUser.user_id ? { ...u, is_active: false, deactivation_category: banCategory, deactivation_reason: message } : u))
      setBanUser(null)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deactivate user'
      alert(errorMsg)
    } finally {
      setBanLoading(false)
    }
  }

  const handleReactivateUser = async (userId: string) => {
    setReactivateLoading(userId)
    try {
      await usersApi.reactivate(userId)
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: true, deactivation_reason: undefined, deactivation_category: undefined } : u))
    } catch {
      alert('Failed to reactivate user')
    } finally {
      setReactivateLoading(null)
    }
  }

  const stats = {
    totalUsers: (dashboardData?.total_users as number) ?? users.length,
    totalAnalyses: (dashboardData?.total_samples as number) ?? 0,
    avgAccuracy: (dashboardData?.avg_accuracy as number) ?? 0,
    samplesToday: (dashboardData?.samples_today as number) ?? 0,
    samplesThisWeek: (dashboardData?.samples_this_week as number) ?? 0,
    activeUsers: (dashboardData?.active_users as number) ?? 0,
    modelsDeployed: mlModels.filter((m) => m.is_active).length || 1,
  }

  const usersByType = (dashboardData?.users_by_type as Record<string, number>) ?? {}

  const filteredUsers = users.filter((u) => {
    const matchSearch = userSearch === '' || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
    const matchRole = userRoleFilter === 'all' || u.user_type === userRoleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="bg-sidebar rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium mb-2">
              <Shield className="h-3.5 w-3.5" /> Administration
            </div>
            <h1 className="text-2xl font-bold font-display">Admin Dashboard</h1>
            <p className="text-white/60 text-sm">Manage users, models, and system settings</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-white/60">System Online</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab.id ? 'bg-white text-sidebar shadow-sm' : 'text-foreground-muted hover:text-foreground hover:bg-white/50'
            )}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} trend={stats.activeUsers > 0 ? `${stats.activeUsers} active (30d)` : undefined} color="bg-primary/10 text-primary" />
            <StatCard label="Total Analyses" value={stats.totalAnalyses.toLocaleString()} icon={Activity} trend={stats.samplesToday > 0 ? `${stats.samplesToday} today` : stats.samplesThisWeek > 0 ? `${stats.samplesThisWeek} this week` : undefined} color="bg-secondary/10 text-secondary" />
            <StatCard label="Avg. Accuracy" value={`${stats.avgAccuracy.toFixed(1)}%`} icon={Check} color="bg-amber-100 text-amber-600" />
            <StatCard label="Models Deployed" value={stats.modelsDeployed} icon={Cpu} color="bg-purple-100 text-purple-600" />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Active Users (30d)', value: stats.activeUsers, icon: Users, color: 'text-primary' },
                  { label: 'Analyses Today', value: stats.samplesToday, icon: Activity, color: 'text-secondary' },
                  { label: 'Analyses This Week', value: stats.samplesThisWeek, icon: TrendingUp, color: 'text-amber-500' },
                  { label: 'Total Analyses', value: stats.totalAnalyses, icon: BarChart2, color: 'text-blue-500' },
                  { label: 'Avg Accuracy', value: `${stats.avgAccuracy}%`, icon: Check, color: 'text-emerald-500' },
                  { label: 'Models Deployed', value: stats.modelsDeployed, icon: Cpu, color: 'text-purple-500' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <div className="flex items-center gap-2.5"><s.icon className={cn('h-4 w-4', s.color)} /><span className="text-sm text-foreground">{s.label}</span></div>
                    <span className="text-sm font-bold text-foreground">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display">Recent Activity</CardTitle>
                <CardDescription className="text-xs">Latest user registrations & analyses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentActivity.length > 0 ? recentActivity.slice(0, 8).map((a, i) => {
                  const iconBg = a.icon === '👤' ? 'bg-blue-50' : a.icon === '🌶️' ? 'bg-red-50' : a.icon === '📤' ? 'bg-amber-50' : 'bg-gray-50'
                  return (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface transition-colors">
                      <span className={cn('text-base h-8 w-8 flex items-center justify-center rounded-lg shrink-0', iconBg)}>{a.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground leading-snug">{a.text}</p>
                        <p className="text-[10px] text-foreground-muted mt-0.5">{a.time ? formatTimeAgo(a.time) : 'Unknown time'}</p>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-foreground-muted/40 mx-auto mb-2" />
                    <p className="text-sm text-foreground-muted">No recent activity yet</p>
                    <p className="text-[10px] text-foreground-muted mt-1">Activity will appear here once users start analyzing chilis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                  <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users by name or email..." className="pl-9 h-10" />
                </div>
                <div className="flex gap-2">
                  {['all', 'admin', 'researcher', 'user'].map((r) => (
                    <Button key={r} variant={userRoleFilter === r ? 'default' : 'outline'} size="sm" onClick={() => setUserRoleFilter(r)} className="h-8 text-xs capitalize">{r}</Button>
                  ))}
                </div>
                <Button size="sm" className="h-8 text-xs"><UserPlus className="mr-1.5 h-3 w-3" />Add User</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-sidebar text-white">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-bold">User</th>
                    <th className="px-5 py-3 text-left text-sm font-bold">Role</th>
                    <th className="px-5 py-3 text-left text-sm font-bold">Status</th>
                    <th className="px-5 py-3 text-left text-sm font-bold">Joined</th>
                    <th className="px-5 py-3 text-left text-sm font-bold">Last Active</th>
                    <th className="px-5 py-3 text-left text-sm font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-foreground-muted">Loading users...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-foreground-muted">No users found</td></tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.user_id} className="hover:bg-surface transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                          </div>
                          <div><p className="text-sm font-medium text-foreground">{u.full_name}</p><p className="text-[10px] text-foreground-muted">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><UserRoleBadge role={u.user_type} /></td>
                      <td className="px-5 py-3">
                        <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                        {!u.is_active && u.deactivation_category && (
                          <p className="text-[9px] text-red-500 mt-0.5">{DEACTIVATION_REASONS.find(r => r.value === u.deactivation_category)?.label || u.deactivation_category}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-foreground-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3 text-xs text-foreground-muted">{u.updated_at ? formatTimeAgo(u.updated_at) : '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View details" onClick={() => handleViewUser(u)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {u.is_active ? (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-danger hover:text-danger" title="Ban / Deactivate" onClick={() => handleOpenBanModal(u)}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" title="Reactivate" disabled={reactivateLoading === u.user_id} onClick={() => handleReactivateUser(u.user_id)}>
                              {reactivateLoading === u.user_id ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ========== VIEW USER MODAL ========== */}
          <AnimatePresence>
            {viewUser && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewUser(null)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-red-600 to-orange-500 p-5 rounded-t-2xl text-white relative">
                    <button onClick={() => setViewUser(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"><X className="h-4 w-4" /></button>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40">
                        <span className="text-xl font-bold">{viewUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold font-display">{viewUser.full_name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <UserRoleBadge role={viewUser.user_type} />
                          <StatusBadge status={viewUser.is_active ? 'active' : 'inactive'} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Modal Body */}
                  <div className="p-5 space-y-4">
                    {viewUserLoading && <div className="text-center py-2 text-sm text-foreground-muted">Loading details...</div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface rounded-xl p-3 flex items-start gap-2.5">
                        <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div><p className="text-[10px] text-foreground-muted">Email</p><p className="text-sm font-medium text-foreground break-all">{viewUser.email}</p></div>
                      </div>
                      <div className="bg-surface rounded-xl p-3 flex items-start gap-2.5">
                        <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div><p className="text-[10px] text-foreground-muted">Joined</p><p className="text-sm font-medium text-foreground">{new Date(viewUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p></div>
                      </div>
                      <div className="bg-surface rounded-xl p-3 flex items-start gap-2.5">
                        <BarChart2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div><p className="text-[10px] text-foreground-muted">Total Analyses</p><p className="text-sm font-medium text-foreground">{viewUser.total_analyses ?? '—'}</p></div>
                      </div>
                      <div className="bg-surface rounded-xl p-3 flex items-start gap-2.5">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div><p className="text-[10px] text-foreground-muted">Location</p><p className="text-sm font-medium text-foreground">{viewUser.location ? [viewUser.location.municipality, viewUser.location.province, viewUser.location.region].filter(Boolean).join(', ') || 'Not set' : 'Not set'}</p></div>
                      </div>
                    </div>
                    {viewUser.updated_at && (
                      <div className="bg-surface rounded-xl p-3 flex items-start gap-2.5">
                        <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div><p className="text-[10px] text-foreground-muted">Last Updated</p><p className="text-sm font-medium text-foreground">{formatTimeAgo(viewUser.updated_at)}</p></div>
                      </div>
                    )}
                    {/* Deactivation info */}
                    {!viewUser.is_active && viewUser.deactivation_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-red-700">
                          <Ban className="h-4 w-4" />
                          <span className="text-sm font-bold">Account Deactivated</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-red-600"><span className="font-medium">Category:</span> {DEACTIVATION_REASONS.find(r => r.value === viewUser.deactivation_category)?.label || viewUser.deactivation_category}</p>
                          <p className="text-xs text-red-600"><span className="font-medium">Reason:</span> {viewUser.deactivation_reason}</p>
                          {viewUser.deactivated_at && <p className="text-xs text-red-500"><span className="font-medium">Deactivated on:</span> {new Date(viewUser.deactivated_at).toLocaleString()}</p>}
                          {viewUser.is_temporary_ban && <p className="text-xs text-red-500"><span className="font-medium">Type:</span> Temporary ({viewUser.ban_duration_days} days)</p>}
                        </div>
                      </div>
                    )}
                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      {viewUser.is_active ? (
                        <Button variant="destructive" size="sm" className="flex-1 h-9 text-xs" onClick={() => { setViewUser(null); handleOpenBanModal(viewUser); }}>
                          <Ban className="h-3.5 w-3.5 mr-1.5" /> Ban / Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => { handleReactivateUser(viewUser.user_id); setViewUser(null); }}>
                          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Reactivate User
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setViewUser(null)}>Close</Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========== BAN / DEACTIVATE MODAL ========== */}
          <AnimatePresence>
            {banUser && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setBanUser(null)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-red-700 to-red-500 p-5 rounded-t-2xl text-white relative">
                    <button onClick={() => setBanUser(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"><X className="h-4 w-4" /></button>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center"><Ban className="h-5 w-5" /></div>
                      <div>
                        <h2 className="text-base font-bold font-display">Ban / Deactivate User</h2>
                        <p className="text-white/70 text-xs">{banUser.full_name} ({banUser.email})</p>
                      </div>
                    </div>
                  </div>
                  {/* Modal Body */}
                  <div className="p-5 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">This will prevent the user from logging in and accessing their account. All their data will be preserved.</p>
                    </div>
                    {/* Reason Category */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Reason Category <span className="text-red-500">*</span></Label>
                      <select
                        value={banCategory}
                        onChange={(e) => {
                          setBanCategory(e.target.value)
                          const reason = DEACTIVATION_REASONS.find(r => r.value === e.target.value)
                          if (reason) setBanMessage(reason.message)
                        }}
                        className="w-full h-10 rounded-lg border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">Select a reason...</option>
                        {DEACTIVATION_REASONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Message to user */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Message to User</Label>
                      <textarea
                        value={banMessage}
                        onChange={(e) => setBanMessage(e.target.value)}
                        rows={3}
                        placeholder="A message explaining why their account was deactivated..."
                        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                      <p className="text-[10px] text-foreground-muted">This message will be stored with the deactivation record.</p>
                    </div>
                    {/* Temporary ban toggle */}
                    <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">Temporary Ban</p>
                        <p className="text-[10px] text-foreground-muted">Set a duration for the ban</p>
                      </div>
                      <button onClick={() => setBanTemporary(!banTemporary)} className={cn('w-10 h-6 rounded-full transition-colors relative', banTemporary ? 'bg-red-500' : 'bg-gray-300')}>
                        <span className={cn('w-4 h-4 rounded-full bg-white absolute top-1 transition-all', banTemporary ? 'left-5' : 'left-1')} />
                      </button>
                    </div>
                    {banTemporary && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Duration (days)</Label>
                        <Input type="number" min={1} max={365} value={banDuration} onChange={(e) => setBanDuration(Number(e.target.value))} className="h-10" />
                      </div>
                    )}
                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button variant="destructive" size="sm" className="flex-1 h-10 text-xs font-medium" disabled={!banCategory || banLoading} onClick={handleBanUser}>
                        {banLoading ? <RefreshCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1.5" />}
                        {banTemporary ? `Suspend for ${banDuration} days` : 'Deactivate Account'}
                      </Button>
                      <Button variant="outline" size="sm" className="h-10 text-xs" onClick={() => setBanUser(null)}>Cancel</Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {activeTab === 'models' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {isLoading ? (
            <div className="text-center py-12 text-sm text-foreground-muted">Loading models...</div>
          ) : mlModels.length === 0 ? (
            <div className="grid lg:grid-cols-3 gap-5">
              {/* Classification Model */}
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="h-full hover:-translate-y-0.5 transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Cpu className="h-5 w-5 text-primary" /></div>
                      <StatusBadge status="active" />
                    </div>
                    <h3 className="font-bold font-display text-foreground mb-0.5">Chili Classifier</h3>
                    <p className="text-xs text-foreground-muted mb-4">Roboflow · chili-classification-5ohkl/5</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-foreground-muted">Avg Confidence</span><span className="font-bold text-foreground">{stats.avgAccuracy}%</span></div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${stats.avgAccuracy}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Total Predictions</span><span className="font-medium text-foreground">{stats.totalAnalyses.toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Type</span><span className="font-medium text-foreground">Object Detection / Classification</span></div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Status</span><span className="font-medium text-secondary">Active &amp; Connected</span></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* Segmentation Model */}
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                <Card className="h-full hover:-translate-y-0.5 transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center"><Cpu className="h-5 w-5 text-secondary" /></div>
                      <StatusBadge status="active" />
                    </div>
                    <h3 className="font-bold font-display text-foreground mb-0.5">Chili Segmenter</h3>
                    <p className="text-xs text-foreground-muted mb-4">Roboflow · flower-segmentation-brl0m/5</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-foreground-muted">Model Type</span><span className="font-bold text-foreground">Instance Segmentation</span></div>
                      </div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Purpose</span><span className="font-medium text-foreground">Flower/Pod Detection</span></div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">API</span><span className="font-medium text-foreground">Serverless Hosted</span></div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Status</span><span className="font-medium text-secondary">Active &amp; Connected</span></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              {/* ML Pipeline Models */}
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                <Card className="h-full hover:-translate-y-0.5 transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center"><Cpu className="h-5 w-5 text-amber-600" /></div>
                      <StatusBadge status="active" />
                    </div>
                    <h3 className="font-bold font-display text-foreground mb-0.5">SHU &amp; Maturity Pipeline</h3>
                    <p className="text-xs text-foreground-muted mb-4">Built-in ML Models</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Linear Regression</span><span className="font-medium text-foreground">SHU Prediction</span></div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Random Forest</span><span className="font-medium text-foreground">SHU Estimation</span></div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Decision Tree</span><span className="font-medium text-foreground">Maturity Assessment</span></div>
                      <div className="flex justify-between text-xs"><span className="text-foreground-muted">Status</span><span className="font-medium text-secondary">Integrated</span></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-5">
              {mlModels.map((m, i) => (
                <motion.div key={m.model_id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="h-full hover:-translate-y-0.5 transition-all duration-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Cpu className="h-5 w-5 text-primary" /></div>
                        <StatusBadge status={m.is_active ? 'active' : (m.status || 'inactive')} />
                      </div>
                      <h3 className="font-bold font-display text-foreground mb-0.5">{m.model_name}</h3>
                      <p className="text-xs text-foreground-muted mb-4">v{m.version}</p>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="text-foreground-muted">Accuracy</span><span className="font-bold text-foreground">{m.performance_metrics?.accuracy ? `${(m.performance_metrics.accuracy * 100).toFixed(1)}%` : '—'}</span></div>
                          <div className="h-2 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(m.performance_metrics?.accuracy ?? 0) * 100}%` }} />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs"><span className="text-foreground-muted">Type</span><span className="font-medium text-foreground capitalize">{m.model_type}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-foreground-muted">Last Updated</span><span className="font-medium text-foreground">{m.trained_at ? new Date(m.trained_at).toLocaleDateString() : new Date(m.created_at).toLocaleDateString()}</span></div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">Details</Button>
                        {m.is_active && <Button variant="outline" size="sm" className="h-8 text-xs"><Download className="h-3 w-3" /></Button>}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'analytics' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Export Toolbar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-foreground">Analytics Overview</h2>
              <p className="text-xs text-foreground-muted">Visual breakdown of platform usage and performance</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={pdfLoading}
                onClick={async () => {
                  const exportPayload = {
                    stats,
                    varietyDistribution: (dashboardData?.samples_by_variety as Record<string, number>) ?? {},
                    heatDistribution: (dashboardData?.samples_by_heat_category as Record<string, number>) ?? {},
                    usersByType,
                    recentActivity,
                  }
                  setPdfLoading(true)
                  let insights: { overview: string; variety: string; heat: string; users: string; recommendations: string } | undefined
                  try {
                    insights = await chatApi.interpretAnalytics({
                      stats,
                      varietyDistribution: (dashboardData?.samples_by_variety as Record<string, number>) ?? {},
                      heatDistribution: (dashboardData?.samples_by_heat_category as Record<string, number>) ?? {},
                      usersByType,
                    })
                  } catch {
                    // Generate PDF without AI insights if the request fails
                  } finally {
                    setPdfLoading(false)
                  }
                  exportAnalyticsPDF(exportPayload, insights)
                }}
              >
                {pdfLoading ? (
                  <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />Generating…</>
                ) : (
                  <><FileText className="h-3.5 w-3.5" />Export PDF</>)
                }
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => exportAnalyticsExcel({
                  stats,
                  varietyDistribution: (dashboardData?.samples_by_variety as Record<string, number>) ?? {},
                  heatDistribution: (dashboardData?.samples_by_heat_category as Record<string, number>) ?? {},
                  usersByType,
                  recentActivity,
                })}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Variety Distribution Pie Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Variety Distribution</CardTitle><CardDescription>Breakdown of analyzed chili varieties</CardDescription></CardHeader>
              <CardContent>
                {(() => {
                  const varietyDist = (dashboardData?.samples_by_variety as Record<string, number>) ?? {}
                  const COLORS = ['#dc2626', '#10b981', '#f59e0b', '#6366f1', '#ec4899']
                  const data = Object.entries(varietyDist).map(([name, value]) => ({ name, value }))
                  if (data.length === 0) return <div className="h-56 flex items-center justify-center text-sm text-foreground-muted">No variety data yet — analyze some chilis!</div>
                  return (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [value, 'Analyses']} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base font-display">User Distribution</CardTitle><CardDescription>Breakdown by role and activity</CardDescription></CardHeader>
              <CardContent>
                {(() => {
                  const COLORS_USER = { user: '#dc2626', researcher: '#10b981', admin: '#f59e0b' }
                  const roleLabels: Record<string, string> = { user: 'Users', researcher: 'Researchers', admin: 'Admins' }
                  const data = Object.entries(usersByType).map(([type, count]) => ({ name: roleLabels[type] ?? type, value: count, fill: COLORS_USER[type as keyof typeof COLORS_USER] ?? '#6366f1' }))
                  if (data.length === 0) return <div className="h-56 flex items-center justify-center text-sm text-foreground-muted">No user data available</div>
                  return (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [value, 'Users']} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Heat Level Distribution Bar Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Heat Level Distribution</CardTitle><CardDescription>Number of analyses per heat category</CardDescription></CardHeader>
              <CardContent>
                {(() => {
                  const heatDist = (dashboardData?.samples_by_heat_category as Record<string, number>) ?? {}
                  const HEAT_COLORS: Record<string, string> = { 'Mild': '#22c55e', 'Medium': '#f59e0b', 'Hot': '#f97316', 'Extra Hot': '#dc2626' }
                  const order = ['Mild', 'Medium', 'Hot', 'Extra Hot']
                  const data = order.filter((k) => (heatDist[k] ?? 0) > 0 || Object.keys(heatDist).length > 0).map((name) => ({ name, count: heatDist[name] ?? 0, fill: HEAT_COLORS[name] ?? '#6366f1' }))
                  // Also include any custom categories not in the standard order
                  Object.keys(heatDist).forEach((k) => { if (!order.includes(k)) data.push({ name: k, count: heatDist[k], fill: '#6366f1' }) })
                  if (data.every((d) => d.count === 0)) return <div className="h-56 flex items-center justify-center text-sm text-foreground-muted">No heat level data yet</div>
                  return (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <RechartsTooltip formatter={(value: number) => [value, 'Analyses']} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Confidence Overview */}
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Model Performance</CardTitle><CardDescription>Confidence and accuracy metrics</CardDescription></CardHeader>
              <CardContent>
                {(() => {
                  const acc = stats.avgAccuracy
                  const totalAnalyses = stats.totalAnalyses
                  const today = stats.samplesToday
                  const week = stats.samplesThisWeek
                  const metrics = [
                    { label: 'Average Confidence', value: `${acc}%`, pct: acc, color: acc >= 90 ? 'bg-secondary' : acc >= 75 ? 'bg-amber-500' : 'bg-primary' },
                    { label: 'Total Analyses', value: totalAnalyses.toLocaleString(), pct: Math.min(100, (totalAnalyses / 100) * 100), color: 'bg-primary' },
                    { label: 'Analyses Today', value: today.toString(), pct: Math.min(100, (today / 20) * 100), color: 'bg-secondary' },
                    { label: 'This Week', value: week.toString(), pct: Math.min(100, (week / 50) * 100), color: 'bg-amber-500' },
                  ]
                  return (
                    <div className="space-y-4">
                      {metrics.map((m) => (
                        <div key={m.label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-foreground-secondary">{m.label}</span>
                            <span className="font-bold text-foreground">{m.value}</span>
                          </div>
                          <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all duration-700', m.color)} style={{ width: `${Math.min(100, m.pct)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Top Analyzed Varieties */}
          <Card>
            <CardHeader><CardTitle className="text-base font-display">Top Analyzed Varieties</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {(() => {
                  const varietyDist = (dashboardData?.samples_by_variety as Record<string, number>) ?? {}
                  const totalV = Object.values(varietyDist).reduce((a, b) => a + b, 0)
                  const varieties = [
                    { name: 'Siling Labuyo', key: 'Siling Labuyo' },
                    { name: 'Siling Haba', key: 'Siling Haba' },
                    { name: 'Siling Demonyo', key: 'Siling Demonyo' },
                  ]
                  return varieties.map((v) => {
                    const count = varietyDist[v.key] ?? 0
                    const pct = totalV > 0 ? Math.round((count / totalV) * 100) : 0
                    return (
                      <div key={v.name} className="bg-surface p-4 rounded-lg text-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2"><Flame className="h-5 w-5 text-primary" /></div>
                        <p className="font-bold text-sm text-foreground">{v.name}</p>
                        <p className="text-xl font-bold font-display text-primary mt-1">{count.toLocaleString()}</p>
                        <p className="text-[10px] text-foreground-muted">{pct}% of total</p>
                      </div>
                    )
                  })
                })()}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl">
          <Card>
            <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Settings className="h-4 w-4 text-primary" />General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label className="text-xs">Application Name</Label><Input defaultValue="ChiliScope" className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Support Email</Label><Input defaultValue="support@chiliscope.edu" className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Max Upload Size (MB)</Label><Input type="number" defaultValue="10" className="h-10" /></div>
              <Button size="sm" className="h-8 text-xs">Save Changes</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Security</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                <div><p className="text-sm font-medium text-foreground">Two-Factor Authentication</p><p className="text-[10px] text-foreground-muted">Require 2FA for admin accounts</p></div>
                <Button variant="outline" size="sm" className="h-7 text-xs">Enable</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                <div><p className="text-sm font-medium text-foreground">Session Timeout</p><p className="text-[10px] text-foreground-muted">Auto-logout after inactivity</p></div>
                <Button variant="outline" size="sm" className="h-7 text-xs"><ChevronDown className="h-3 w-3 mr-1" />30 min</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border-danger/30">
            <CardHeader><CardTitle className="text-base font-display flex items-center gap-2 text-danger"><AlertTriangle className="h-4 w-4" />Danger Zone</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div><p className="text-sm font-medium text-foreground">Reset All Statistics</p><p className="text-[10px] text-foreground-muted">This will clear all analytics data</p></div>
                <Button variant="destructive" size="sm" className="h-7 text-xs">Reset</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div><p className="text-sm font-medium text-foreground">Delete All User Data</p><p className="text-[10px] text-foreground-muted">Permanently remove all user accounts and data</p></div>
                <Button variant="destructive" size="sm" className="h-7 text-xs">Delete All</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
