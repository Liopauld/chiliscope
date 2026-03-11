import { useState, useEffect } from 'react'
import { User, Bell, Palette, Save, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { usersApi } from '@/lib/api'

type ThemeMode = 'light' | 'dark' | 'system'

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
  } else if (mode === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

export default function Settings() {
  const { user, updateUser } = useAuthStore()
  const { toast } = useToast()

  // Profile
  const [name, setName] = useState(user?.name || '')
  const [email] = useState(user?.email || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Notifications (persisted in localStorage)
  const [emailNotifs, setEmailNotifs] = useState(() => localStorage.getItem('pref_email_notifs') !== 'false')
  const [weeklyReports, setWeeklyReports] = useState(() => localStorage.getItem('pref_weekly_reports') === 'true')

  // Theme
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('pref_theme') as ThemeMode) || 'system')

  // Apply theme on mount & when changed
  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('pref_theme', theme)
  }, [theme])

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Please enter your full name.' })
      return
    }
    setIsSavingProfile(true)
    try {
      const updated = await usersApi.updateProfile({ full_name: name.trim() })
      updateUser({ name: updated.full_name })
      toast({ title: 'Profile updated', description: 'Your profile has been saved successfully.' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update profile.'
      toast({ variant: 'destructive', title: 'Error', description: msg })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const toggleEmailNotifs = () => {
    const next = !emailNotifs
    setEmailNotifs(next)
    localStorage.setItem('pref_email_notifs', String(next))
    toast({ title: `Email notifications ${next ? 'enabled' : 'disabled'}` })
  }

  const toggleWeeklyReports = () => {
    const next = !weeklyReports
    setWeeklyReports(next)
    localStorage.setItem('pref_weekly_reports', String(next))
    toast({ title: `Weekly reports ${next ? 'enabled' : 'disabled'}` })
  }

  return (
    <div className="page-container space-y-5 max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-foreground-secondary text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" /> Profile
          </CardTitle>
          <CardDescription className="text-xs">Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input id="email" type="email" value={email} disabled className="h-10 opacity-60 cursor-not-allowed" />
            <p className="text-[11px] text-foreground-muted">Email cannot be changed</p>
          </div>
          <Button onClick={handleSaveProfile} disabled={isSavingProfile || name.trim() === user?.name} size="sm">
            {isSavingProfile ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes</>}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </CardTitle>
          <CardDescription className="text-xs">Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">Email Notifications</p>
              <p className="text-xs text-foreground-muted">Receive analysis results via email</p>
            </div>
            <Button
              variant={emailNotifs ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs min-w-[80px]"
              onClick={toggleEmailNotifs}
            >
              {emailNotifs ? <><Check className="mr-1 h-3 w-3" />Enabled</> : 'Disabled'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">Weekly Reports</p>
              <p className="text-xs text-foreground-muted">Get weekly summary of your analyses</p>
            </div>
            <Button
              variant={weeklyReports ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs min-w-[80px]"
              onClick={toggleWeeklyReports}
            >
              {weeklyReports ? <><Check className="mr-1 h-3 w-3" />Enabled</> : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" /> Appearance
          </CardTitle>
          <CardDescription className="text-xs">Customize the app appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">Theme</p>
              <p className="text-xs text-foreground-muted">Switch between light and dark mode</p>
            </div>
            <div className="flex gap-1">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={theme === mode ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs capitalize"
                  onClick={() => setTheme(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
