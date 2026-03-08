import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Eye, EyeOff, FlaskConical, User, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { firebaseEmailRegister, firebaseGoogleLogin, sendVerificationEmail } from '@/lib/firebase'

type UserRole = 'user' | 'researcher'

const roleOptions = [
  {
    value: 'user' as UserRole,
    label: 'User',
    description: 'Home gardener, farmer, or chili enthusiast',
    icon: User,
  },
  {
    value: 'researcher' as UserRole,
    label: 'Researcher',
    description: 'Academic or agricultural researcher',
    icon: FlaskConical,
  },
]

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  
  const navigate = useNavigate()
  const { toast } = useToast()
  const { login } = useAuthStore()

  /** Sync Firebase user with backend & log in locally */
  const syncAndLogin = async (idToken: string, fbUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }, role: UserRole = userRole) => {
    const response = await authApi.firebaseLogin(idToken, name || fbUser.displayName || 'User', role)
    const user = {
      id: response.user.user_id,
      email: response.user.email,
      name: response.user.full_name,
      role: response.user.user_type as 'admin' | 'researcher' | 'user',
      firebaseUid: fbUser.uid,
      photoURL: fbUser.photoURL,
    }
    login(user, idToken)
    toast({ title: 'Account created!', description: 'Welcome to ChiliScope.' })
    navigate('/dashboard')
  }

  /** Email + Password registration via Firebase */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
      })
      return
    }

    setIsLoading(true)

    try {
      const cred = await firebaseEmailRegister(email, password, name)

      // Send verification email before allowing full access
      await sendVerificationEmail()

      // Try to pre-create the backend profile so it's ready after verification.
      // This may fail with 403 (email not verified) — that's expected and safe
      // to ignore because the profile will be created when the user logs in
      // after verifying their email.
      try {
        const idToken = await cred.user.getIdToken()
        await authApi.firebaseLogin(idToken, name, userRole)
      } catch {
        // Expected 403 for unverified email — backend will create the profile on first verified login
      }

      toast({
        title: 'Verification email sent!',
        description: 'Please check your inbox to verify your email address.',
      })
      navigate('/verify-email', { state: { email: cred.user.email } })
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; response?: { data?: { detail?: string | Array<{ msg: string }> } } }
      let errorMessage = 'Could not create account'

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Use at least 6 characters.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail) && detail.length > 0) {
          errorMessage = detail.map(e => e.msg).join(', ')
        }
      }
      
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  /** Google sign-up via Firebase */
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    try {
      const cred = await firebaseGoogleLogin()
      const idToken = await cred.user.getIdToken()
      await syncAndLogin(idToken, cred.user)
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err.code === 'auth/popup-closed-by-user') return
      toast({ variant: 'destructive', title: 'Google sign-up failed', description: err.message || 'Something went wrong.' })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Fiery branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-red-800 via-red-700 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/[0.03]" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-red-500/10 blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 shadow-sidebar-md border border-white/10">
            <Flame className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display text-white mb-2">ChiliScope</h1>
          <p className="text-base text-white/70 mb-8">AI-Powered Heat Level Prediction</p>
          <div className="max-w-sm text-white/50 text-sm leading-relaxed">
            <p>
              Join researchers and chili enthusiasts using machine learning to predict 
              heat levels from pod morphology and maturity.
            </p>
          </div>
          
          {/* Feature bullets */}
          <div className="mt-10 grid grid-cols-2 gap-3 text-left max-w-sm">
            {[
              'AI-powered analysis',
              'Instant results',
              'Multiple varieties',
              'Research-grade accuracy'
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-white/60 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right — Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border border-border shadow-elevated">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="w-12 h-12 rounded-xl bg-chili flex items-center justify-center">
                <Flame className="w-7 h-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold font-display">Create Account</CardTitle>
            <CardDescription className="mt-1">
              Start analyzing chili heat levels today
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-foreground font-medium text-sm">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-foreground font-medium text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              
              {/* Role Selection */}
              <div className="space-y-1.5">
                <Label className="text-foreground font-medium text-sm">Account Type</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {roleOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setUserRole(option.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                          userRole === option.value
                            ? 'border-primary bg-primary-50'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <Icon className={`h-4 w-4 ${userRole === option.value ? 'text-primary' : 'text-foreground-muted'}`} />
                          <span className={`font-medium text-sm ${userRole === option.value ? 'text-primary-700' : 'text-foreground'}`}>
                            {option.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground-muted">{option.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground font-medium text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-foreground-muted">Minimum 8 characters</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium text-sm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="pt-1">
                <Button 
                  type="submit" 
                  className="w-full h-10" 
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
              
              <p className="text-[11px] text-foreground-muted text-center">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-primary hover:text-primary-600 transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:text-primary-600 transition-colors">Privacy Policy</a>
              </p>
            </form>
            
            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-foreground-muted">or continue with</span>
              </div>
            </div>

            {/* Google Sign-Up */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              onClick={handleGoogleSignUp}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </Button>
            
            <div className="mt-5 text-center text-sm">
              <span className="text-foreground-secondary">Already have an account? </span>
              <Link to="/login" className="text-primary hover:text-primary-600 font-semibold transition-colors">
                Sign in
              </Link>
            </div>
            
            <div className="mt-5 pt-4 border-t border-border text-center">
              <p className="text-[11px] text-foreground-muted">
                © 2026 ChiliScope — TUP Taguig | Developed by Group 9
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  )
}
