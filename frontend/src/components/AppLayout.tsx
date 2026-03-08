import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatBot from './ChatBot'
import { Toaster } from '@/components/ui/toaster'

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div
        className={cn(
          'transition-all duration-200 ease-in-out min-h-screen flex flex-col',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        {/* Header */}
        <Header
          onMenuClick={() => setMobileOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Content */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="footer-bg text-white/70 text-xs py-4 px-6 flex items-center justify-between">
          <span>© {new Date().getFullYear()} ChiliScope — Chili Classification Platform</span>
          <span className="text-white/40">v1.0.0</span>
        </footer>
      </div>

      <Toaster />
      <ChatBot />
    </div>
  )
}
