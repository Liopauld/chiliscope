import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Search,
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Check,
  ArrowRight,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { notificationsApi } from '@/lib/api'

interface Notification {
  notification_id: string
  type: string
  message: string
  post_id?: string
  from_user: { user_id: string; full_name: string; user_type: string }
  is_read: boolean
  created_at: string
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload & Analyze',
  '/library': 'Analysis Library',
  '/encyclopedia': 'Chili Encyclopedia',
  '/culinary': 'Culinary Guide',
  '/studies': 'Studies & References',
  '/admin': 'Admin Panel',
  '/settings': 'Settings',
  '/forum': 'Community Forum',
  '/chili-map': 'Chili Map',
  '/growth': 'Growth & Development',
}

interface HeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuthStore()
  const [showSearch, setShowSearch] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const pageTitle = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/results') ? 'Analysis Results' : 'ChiliScope')

  const roleBadgeClass = {
    admin: 'badge-role-admin',
    researcher: 'badge-role-researcher',
    user: 'badge-role-user',
  }[user?.role || 'user']

  // Fetch notification count every 30s
  useEffect(() => {
    if (!isAuthenticated) return
    const fetchCount = async () => {
      try {
        const data = await notificationsApi.getUnreadCount()
        setUnreadCount(data.unread_count || 0)
      } catch { /* silent */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!showNotifications || !isAuthenticated) return
    const fetch = async () => {
      try {
        const data = await notificationsApi.list(1, 15)
        setNotifications(data.items || [])
        setUnreadCount(data.unread_count || 0)
      } catch { /* silent */ }
    }
    fetch()
  }, [showNotifications, isAuthenticated])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* silent */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  const handleNotifClick = (notif: Notification) => {
    handleMarkRead(notif.notification_id)
    if (notif.post_id) {
      navigate(`/forum?post=${notif.post_id}`)
    } else {
      navigate('/forum')
    }
    setShowNotifications(false)
  }

  const notifTimeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 60) return 'now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-14 bg-white border-b border-border',
        'flex items-center justify-between px-4 lg:px-6',
        'transition-all duration-200'
      )}
    >
      {/* Left: Mobile menu + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground font-display">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Search + Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <div className={cn(
            'flex items-center transition-all duration-200',
            showSearch ? 'w-64' : 'w-9'
          )}>
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-surface text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  transition-all duration-200"
                autoFocus
                onBlur={() => {
                  setTimeout(() => {
                    if (!searchQuery) setShowSearch(false)
                  }, 150)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setSearchQuery(''); setShowSearch(false) }
                }}
              />
            )}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={cn(
                'p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors',
                showSearch && 'absolute left-0 top-0 bottom-0 flex items-center pl-2.5'
              )}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          {/* Search dropdown */}
          {showSearch && searchQuery.length > 0 && (() => {
            const matches = Object.entries(pageTitles).filter(([, title]) =>
              title.toLowerCase().includes(searchQuery.toLowerCase())
            )
            return matches.length > 0 ? (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-elevated border border-border py-1 z-50 animate-scale-in origin-top">
                {matches.map(([path, title]) => (
                  <button
                    key={path}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { navigate(path); setSearchQuery(''); setShowSearch(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
                  >
                    {title}
                  </button>
                ))}
              </div>
            ) : null
          })()}
        </div>

        {/* Guest: Sign In / Register */}
        {!isAuthenticated && (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-foreground-secondary hover:text-foreground gap-1.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-sm">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Join</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Authenticated: Notifications */}
        {isAuthenticated && (
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-chili rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-elevated border border-border animate-scale-in origin-top-right z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="h-8 w-8 text-foreground-muted mx-auto mb-2" />
                    <p className="text-xs text-foreground-muted">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <button
                      key={notif.notification_id}
                      onClick={() => handleNotifClick(notif)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-surface transition-colors flex gap-3 border-b border-border/50 last:border-0',
                        !notif.is_read && 'bg-orange-50/50'
                      )}
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {notif.from_user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
                          {notif.type === 'post_reaction' ? '👍' : notif.type === 'comment_reaction' ? '❤️' : notif.type === 'post_comment' ? '💬' : notif.type === 'comment_reply' ? '↩️' : notif.type === 'new_post' ? '📝' : '🔔'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs leading-relaxed', notif.is_read ? 'text-foreground-secondary' : 'text-foreground font-medium')}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-foreground-muted mt-0.5">{notifTimeAgo(notif.created_at)}</p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border">
                  <button
                    onClick={() => { navigate('/forum'); setShowNotifications(false) }}
                    className="text-xs text-primary hover:underline font-medium w-full text-center"
                  >
                    View all in Forum →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* User dropdown — authenticated only */}
        {isAuthenticated && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-surface transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-foreground leading-tight">
                {user?.name || 'User'}
              </span>
              <span className={cn('badge-role', roleBadgeClass)}>
                {user?.role || 'user'}
              </span>
            </div>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 text-foreground-muted transition-transform duration-200',
              showDropdown && 'rotate-180'
            )} />
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-elevated border border-border py-1 animate-scale-in origin-top-right z-50">
              <button
                onClick={() => { navigate('/settings'); setShowDropdown(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => { navigate('/settings'); setShowDropdown(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </header>
  )
}
