import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  BookMarked,
  ChefHat,
  History,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Flame,
  X,
  TrendingDown,
  MessageSquare,
  MapPin,
  Sprout,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
  section: string
  roles?: UserRole[]
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  // Core (auth required)
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', section: 'CORE', requiresAuth: true },
  { label: 'Upload & Analyze', icon: Upload, to: '/upload', section: 'CORE', requiresAuth: true },
  { label: 'Library', icon: History, to: '/library', section: 'CORE', requiresAuth: true },
  // Community (public)
  { label: 'Forum', icon: MessageSquare, to: '/forum', section: 'COMMUNITY' },
  // Knowledge (public)
  { label: 'Encyclopedia', icon: BookOpen, to: '/encyclopedia', section: 'KNOWLEDGE' },
  { label: 'Culinary Guide', icon: ChefHat, to: '/culinary', section: 'KNOWLEDGE' },
  { label: 'Market Prices', icon: TrendingDown, to: '/market', section: 'KNOWLEDGE' },
  { label: 'Chili Map', icon: MapPin, to: '/chili-map', section: 'KNOWLEDGE' },
  { label: 'Growth Guide', icon: Sprout, to: '/growth', section: 'KNOWLEDGE' },
  // Research
  { label: 'Studies', icon: BookMarked, to: '/studies', section: 'RESEARCH', roles: ['researcher', 'admin'], requiresAuth: true },
  { label: 'Model Comparison', icon: Brain, to: '/model-comparison', section: 'RESEARCH', roles: ['admin'], requiresAuth: true },
  // Admin
  { label: 'Admin Panel', icon: Shield, to: '/admin', section: 'ADMIN', roles: ['admin'], requiresAuth: true },
  // Settings
  { label: 'Settings', icon: Settings, to: '/settings', section: 'SETTINGS', requiresAuth: true },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { user, isAuthenticated } = useAuthStore()
  const userRole = user?.role || 'user'

  const filteredItems = navItems.filter(
    (item) => {
      // Hide auth-required items from guests
      if (item.requiresAuth && !isAuthenticated) return false
      // Hide role-restricted items
      if (item.roles && !item.roles.includes(userRole)) return false
      return true
    }
  )

  const sections = [...new Set(filteredItems.map((i) => i.section))]

  const sidebarContent = (
    <TooltipPrimitive.Provider delayDuration={0}>
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo / Brand */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-white/10 shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg bg-chili flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight whitespace-nowrap">
            ChiliScope
          </span>
        )}
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="ml-auto text-white/60 hover:text-white lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-4 px-2 space-y-1">
        {sections.map((section, idx) => {
          const sectionItems = filteredItems.filter((i) => i.section === section)
          return (
            <div key={section} className={cn(idx > 0 && 'mt-5')}>
              {!collapsed && (
                <div className="sidebar-section-label mb-2">{section}</div>
              )}
              {collapsed && idx > 0 && (
                <div className="mx-3 border-t border-white/10 mb-2" />
              )}
              {sectionItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.to ||
                  (item.to !== '/dashboard' && location.pathname.startsWith(item.to))

                const link = (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onMobileClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                      'text-white/70 transition-all duration-200',
                      'hover:text-white hover:bg-sidebar-hover',
                      isActive && 'text-white bg-white/10 border-l-[3px] border-sidebar-active',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-sidebar-active')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )

                if (collapsed) {
                  return (
                    <TooltipPrimitive.Root key={item.to}>
                      <TooltipPrimitive.Trigger asChild>
                        {link}
                      </TooltipPrimitive.Trigger>
                      <TooltipPrimitive.Portal>
                        <TooltipPrimitive.Content
                          side="right"
                          sideOffset={8}
                          className="bg-sidebar text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg z-50 animate-fade-in"
                        >
                          {item.label}
                        </TooltipPrimitive.Content>
                      </TooltipPrimitive.Portal>
                    </TooltipPrimitive.Root>
                  )
                }

                return link
              })}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:flex items-center justify-center h-12 border-t border-white/10 shrink-0">
        <button
          onClick={onToggle}
          className="text-white/50 hover:text-white transition-colors p-1.5 rounded-md hover:bg-sidebar-hover"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
    </TooltipPrimitive.Provider>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:block fixed top-0 left-0 h-screen z-40',
          'transition-all duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile slide-out */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen w-64 z-50 lg:hidden',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
