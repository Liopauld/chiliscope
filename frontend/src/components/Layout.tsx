import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { 
  Home, 
  Upload, 
  Library, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  BookOpen,
  ChefHat,
  Shield
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

// Base navigation items available to all users
const baseNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Upload, label: 'Analyze', path: '/upload' },
  { icon: Library, label: 'Samples', path: '/library' },
  { icon: BookOpen, label: 'Encyclopedia', path: '/encyclopedia' },
  { icon: ChefHat, label: 'Culinary', path: '/culinary' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

// Admin-only navigation items
const adminNavItems = [
  { icon: Shield, label: 'Admin', path: '/admin' },
]

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, logout, canAccessAdminFeatures } = useAuthStore()
  const navigate = useNavigate()

  // Build navigation items based on user role
  const navItems = useMemo(() => {
    const items = [...baseNavItems]
    if (canAccessAdminFeatures()) {
      items.push(...adminNavItems)
    }
    return items
  }, [canAccessAdminFeatures])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 h-20 bg-gradient-to-r from-brand-red-dark to-orange-600 shadow-lg">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                <img 
                  src="/images/chiliscope.png" 
                  alt="ChiliScan" 
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold text-white">ChiliScan</h1>
                <p className="text-xs text-white/70">AI-Powered Chili Analysis</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-2 rounded-lg text-base font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* User Menu */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white max-w-24 truncate">
                      {user?.name || 'User'}
                    </span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded capitalize w-fit",
                      user?.role === 'admin' ? 'bg-red-500/30 text-red-200' :
                      user?.role === 'researcher' ? 'bg-purple-500/30 text-purple-200' :
                      'bg-green-500/30 text-green-200'
                    )}>
                      {user?.role || 'user'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg p-4 animate-fade-in">
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search analyses, varieties..."
                className="w-full pl-12 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-lg animate-fade-in">
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                      isActive
                        ? "bg-brand-red text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t border-neutral-200 pt-4 mt-4">
                <div className="flex items-center gap-3 px-4 py-2 mb-2">
                  <div className="h-10 w-10 rounded-full bg-brand-red/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-brand-red" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800">{user?.name || 'User'}</p>
                    <p className="text-sm text-neutral-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Branding */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/images/chiliscope.png" 
                  alt="ChiliScan" 
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <h3 className="text-xl font-bold">ChiliScan</h3>
                  <p className="text-sm text-neutral-400">AI-Powered Chili Analysis</p>
                </div>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Predict chili heat levels from flower morphology using advanced machine learning. 
                Supporting Philippine chili varieties: Siling Haba, Siling Labuyo, and Siling Demonyo.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link 
                      to={item.path}
                      className="text-neutral-400 hover:text-white transition-colors text-sm"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">
                    API Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">
                    Research Papers
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-bold mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-neutral-400 text-sm">
                  <MapPin className="h-5 w-5 flex-shrink-0" />
                  <span>TUP Taguig Campus, Taguig City, Philippines</span>
                </li>
                <li className="flex items-center gap-3 text-neutral-400 text-sm">
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  <a href="mailto:chiliscan@tup.edu.ph" className="hover:text-white transition-colors">
                    chiliscan@tup.edu.ph
                  </a>
                </li>
                <li className="flex items-center gap-3 text-neutral-400 text-sm">
                  <Phone className="h-5 w-5 flex-shrink-0" />
                  <span>+63 (02) 8838-4890</span>
                </li>
              </ul>

              {/* Social Icons */}
              <div className="flex gap-3 mt-6">
                {[
                  { icon: Facebook, href: '#' },
                  { icon: Twitter, href: '#' },
                  { icon: Instagram, href: '#' },
                ].map((social, idx) => (
                  <a
                    key={idx}
                    href={social.href}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-red transition-colors"
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-neutral-700 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-neutral-500 text-sm text-center sm:text-left">
              © 2026 ChiliScan - TUP Taguig | Developed by Group 9
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-neutral-500 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-neutral-500 hover:text-white transition-colors">
                Terms of Use
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
