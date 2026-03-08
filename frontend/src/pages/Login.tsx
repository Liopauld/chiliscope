import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Eye, EyeOff, Flame, Mail, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { firebaseEmailLogin, firebaseGoogleLogin, sendVerificationEmail, resetPassword } from '@/lib/firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showVerificationBanner, setShowVerificationBanner] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [loginError, setLoginError] = useState('')
  const [showCredentialHelp, setShowCredentialHelp] = useState(false)
  const [isResetSending, setIsResetSending] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [banInfo, setBanInfo] = useState<{
    reason?: string
    reason_category?: string
    is_temporary?: boolean
    duration_days?: number
    deactivated_at?: string
  } | null>(null)
  
  const navigate = useNavigate()
  const { toast } = useToast()
  const { login } = useAuthStore()

  /** Sync Firebase user with backend & log in locally */
  const syncAndLogin = async (idToken: string, fbUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) => {
    try {
      const response = await authApi.firebaseLogin(idToken)
      const user = {
        id: response.user.user_id,
        email: response.user.email,
        name: response.user.full_name,
        role: response.user.user_type as 'admin' | 'researcher' | 'user',
        firebaseUid: fbUser.uid,
        photoURL: fbUser.photoURL,
      }
      login(user, idToken)
      toast({ title: 'Welcome back!', description: 'Successfully logged in.' })
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: Record<string, unknown> | string } } }
      if (axiosErr.response?.status === 403) {
        const detail = axiosErr.response.data?.detail
        if (typeof detail === 'object' && detail?.error === 'account_banned') {
          setBanInfo(detail as typeof banInfo)
          setLoginError('')
          return
        }
      }
      throw err
    }
  }

  /** Email + Password sign-in via Firebase */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')
    setShowVerificationBanner(false)
    setShowCredentialHelp(false)
    setResetSent(false)
    setBanInfo(null)

    try {
      const cred = await firebaseEmailLogin(email, password)

      // Block sign-in if email is not verified (email/password accounts only)
      if (!cred.user.emailVerified) {
        // Show the verification banner on the login page
        setUnverifiedEmail(cred.user.email || email)
        setShowVerificationBanner(true)
        // Try to re-send verification email automatically
        try { await sendVerificationEmail() } catch { /* ignore if already sent recently */ }
        return
      }

      const idToken = await cred.user.getIdToken()
      await syncAndLogin(idToken, cred.user)
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; response?: { data?: { detail?: string | Array<{ msg: string }> } } }
      let errorMessage = 'Invalid email or password. Please try again.'

      // Firebase-specific error codes
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect email or password'
        setShowCredentialHelp(true)
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.'
        setShowCredentialHelp(true)
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Check your internet connection.'
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        errorMessage = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : errorMessage
      }

      setLoginError(errorMessage)
      toast({ variant: 'destructive', title: 'Login failed', description: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  /** Resend verification email from the login page */
  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      await sendVerificationEmail()
      setResendCooldown(60)
      toast({ title: 'Verification email sent!', description: `Check your inbox at ${unverifiedEmail}` })
      // Start cooldown countdown
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (error: unknown) {
      const err = error as { code?: string }
      if (err.code === 'auth/too-many-requests') {
        toast({ variant: 'destructive', title: 'Too many requests', description: 'Please wait before requesting another email.' })
      } else {
        toast({ variant: 'destructive', title: 'Failed to send', description: 'Could not send verification email.' })
      }
    } finally {
      setIsResending(false)
    }
  }

  /** Send a password reset email */
  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Enter your email', description: 'Please enter your email address first, then click Reset Password.' })
      return
    }
    setIsResetSending(true)
    try {
      await resetPassword(email)
      setResetSent(true)
      toast({ title: 'Reset email sent!', description: `Check your inbox at ${email} for a password reset link.` })
    } catch (error: unknown) {
      const err = error as { code?: string }
      if (err.code === 'auth/user-not-found') {
        toast({ variant: 'destructive', title: 'Account not found', description: 'No account exists with this email. Try signing up instead.' })
      } else if (err.code === 'auth/too-many-requests') {
        toast({ variant: 'destructive', title: 'Too many requests', description: 'Please wait before requesting another reset email.' })
      } else {
        toast({ variant: 'destructive', title: 'Failed to send', description: 'Could not send password reset email. Please try again.' })
      }
    } finally {
      setIsResetSending(false)
    }
  }

  /** Google sign-in via Firebase */
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      const cred = await firebaseGoogleLogin()
      const idToken = await cred.user.getIdToken()
      await syncAndLogin(idToken, cred.user)
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err.code === 'auth/popup-closed-by-user') return // user cancelled
      toast({ variant: 'destructive', title: 'Google sign-in failed', description: err.message || 'Something went wrong.' })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Fiery branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-red-800 via-red-700 to-orange-600 relative overflow-hidden">
        {/* Decorative */}
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
              Predict chili pungency from pod morphology and maturity using advanced machine learning.
              Supporting Philippine chili varieties.
            </p>
          </div>
          
          {/* Heat badges */}
          <div className="flex gap-2 mt-10">
            <span className="px-3 py-1 rounded-full bg-heat-mild/80 text-white text-xs font-medium">Mild</span>
            <span className="px-3 py-1 rounded-full bg-heat-medium/80 text-white text-xs font-medium">Medium</span>
            <span className="px-3 py-1 rounded-full bg-heat-hot/80 text-white text-xs font-medium">Hot</span>
            <span className="px-3 py-1 rounded-full bg-heat-extra-hot/80 text-white text-xs font-medium">Extra Hot</span>
          </div>
        </div>
      </div>
      
      {/* Right — Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border border-border shadow-elevated">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-5 lg:hidden">
              <div className="w-12 h-12 rounded-xl bg-chili flex items-center justify-center">
                <Flame className="w-7 h-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold font-display">Welcome Back</CardTitle>
            <CardDescription className="mt-1">
              Sign in to continue analyzing chili samples
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {/* Login Error Banner */}
            {loginError && !showVerificationBanner && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{loginError}</p>
                    {showCredentialHelp && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
                          onClick={handleResetPassword}
                          disabled={isResetSending || resetSent}
                        >
                          {isResetSending ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Mail className="mr-1 h-3 w-3" />
                          )}
                          {resetSent ? 'Reset email sent ✓' : 'Reset Password'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-600 hover:bg-red-100"
                          onClick={() => navigate('/register')}
                        >
                          Create New Account →
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Account Banned Banner */}
            {banInfo && (
              <div className="mb-5 p-4 bg-red-50 border border-red-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-red-800">Account Deactivated</h4>
                    <p className="text-xs text-red-700 mt-1">
                      Your account has been {banInfo.is_temporary ? 'temporarily suspended' : 'deactivated'} by an administrator.
                    </p>
                    {banInfo.reason_category && (
                      <p className="text-xs text-red-600 mt-1">
                        <strong>Reason:</strong> {banInfo.reason_category}
                      </p>
                    )}
                    {banInfo.reason && (
                      <p className="text-xs text-red-600 mt-0.5">{banInfo.reason}</p>
                    )}
                    {banInfo.is_temporary && banInfo.duration_days && (
                      <p className="text-xs text-red-600 mt-1">
                        <strong>Duration:</strong> {banInfo.duration_days} day{banInfo.duration_days > 1 ? 's' : ''}
                      </p>
                    )}
                    {banInfo.deactivated_at && (
                      <p className="text-xs text-red-500 mt-1">
                        Since {new Date(banInfo.deactivated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    <p className="text-xs text-red-500 mt-2">
                      If you believe this is a mistake, please contact support.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100 mt-2"
                      onClick={() => setBanInfo(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Banner */}
            {showVerificationBanner && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-amber-800">Email Not Verified</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Your account <strong className="break-all">{unverifiedEmail}</strong> needs email verification before you can sign in.
                      We've sent a verification link to your inbox.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={handleResendVerification}
                        disabled={isResending || resendCooldown > 0}
                      >
                        {isResending ? (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        ) : (
                          <Mail className="mr-1.5 h-3 w-3" />
                        )}
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-amber-700 hover:bg-amber-100"
                        onClick={() => navigate('/verify-email', { state: { email: unverifiedEmail } })}
                      >
                        Go to Verification Page →
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-foreground-secondary">
                  <input type="checkbox" className="rounded border-input text-primary focus:ring-primary/30" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-primary hover:text-primary-600 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-10" 
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
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

            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              onClick={handleGoogleLogin}
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
            
            <div className="mt-6 text-center text-sm">
              <span className="text-foreground-secondary">Don't have an account? </span>
              <Link to="/register" className="text-primary hover:text-primary-600 font-semibold transition-colors">
                Sign up
              </Link>
            </div>
            
            <div className="mt-6 pt-5 border-t border-border text-center">
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
