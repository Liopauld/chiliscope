import { useState } from 'react'
import { User, Bell, Shield, Palette, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/stores/authStore'

export default function Settings() {
  const { user, updateUser } = useAuthStore()
  const { toast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 1000))
      updateUser({ name, email })
      toast({ title: 'Profile updated', description: 'Your profile has been saved successfully.' })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' })
    } finally {
      setIsLoading(false)
    }
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
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
          </div>
          <Button onClick={handleSaveProfile} disabled={isLoading} size="sm">
            {isLoading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes</>}
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
            <Button variant="outline" size="sm" className="h-7 text-xs">Enabled</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">Weekly Reports</p>
              <p className="text-xs text-foreground-muted">Get weekly summary of your analyses</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">Disabled</Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" /> Security
          </CardTitle>
          <CardDescription className="text-xs">Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">Change Password</p>
              <p className="text-xs text-foreground-muted">Update your account password</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">Change</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-foreground-muted">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">Enable</Button>
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
              <Button variant="outline" size="sm" className="h-7 text-xs">Light</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs">Dark</Button>
              <Button size="sm" className="h-7 text-xs">System</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
