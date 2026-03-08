import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Loader2, Mail, CheckCircle2, RefreshCw, Flame, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { sendVerificationEmail, reloadFirebaseUser, auth } from '@/lib/firebase'

export default function EmailVerification() {
  const [isResending, setIsResending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [verified, setVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const email = (location.state as { email?: string })?.email || auth.currentUser?.email || ''

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Auto-check verification every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const user = await reloadFirebaseUser()
        if (user?.emailVerified) {
          setVerified(true)
          clearInterval(interval)
        }
      } catch {
        // user might have signed out
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Once verified, auto-redirect after a short delay
  useEffect(() => {
    if (!verified) return
    const timeout = setTimeout(() => navigate('/login'), 2500)
    return () => clearTimeout(timeout)
  }, [verified, navigate])

  const handleResend = useCallback(async () => {
    setIsResending(true)
    try {
      await sendVerificationEmail()
      setCooldown(60) // 60-second cooldown
      toast({ title: 'Email sent!', description: 'A new verification email has been sent.' })
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err.code === 'auth/too-many-requests') {
        toast({ variant: 'destructive', title: 'Too many requests', description: 'Please wait a moment before requesting another email.' })
        setCooldown(60)
      } else {
        toast({ variant: 'destructive', title: 'Failed to send', description: err.message || 'Could not send verification email.' })
      }
    } finally {
      setIsResending(false)
    }
  }, [toast])

  const handleCheckNow = useCallback(async () => {
    setIsChecking(true)
    try {
      const user = await reloadFirebaseUser()
      if (user?.emailVerified) {
        setVerified(true)
      } else {
        toast({ title: 'Not yet verified', description: 'Please click the link in the email we sent you.' })
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not check verification status.' })
    } finally {
      setIsChecking(false)
    }
  }, [toast])

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
              Just one more step! Verify your email address to unlock full access 
              to chili analysis, heat prediction, and community features.
            </p>
          </div>
        </div>
      </div>

      {/* Right — Verification card */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border border-border shadow-elevated">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-5 lg:hidden">
              <div className="w-12 h-12 rounded-xl bg-chili flex items-center justify-center">
                <Flame className="w-7 h-7 text-white" />
              </div>
            </div>

            {verified ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold font-display text-green-700 dark:text-green-400">
                  Email Verified!
                </CardTitle>
                <CardDescription className="mt-1">
                  Your email has been verified. Redirecting to login...
                </CardDescription>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold font-display">Check Your Email</CardTitle>
                <CardDescription className="mt-1">
                  We've sent a verification link to
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="pt-2">
            {!verified && (
              <div className="space-y-5">
                {/* Email display */}
                <div className="text-center">
                  <p className="font-medium text-primary text-sm break-all">{email}</p>
                </div>

                {/* Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground-secondary space-y-2">
                  <p>📩 Click the link in the email to verify your account.</p>
                  <p>⏱️ The link expires in 1 hour.</p>
                  <p>📁 Check your spam or junk folder if you don't see it.</p>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCheckNow}
                    className="w-full h-10"
                    disabled={isChecking}
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        I've Verified — Check Now
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleResend}
                    className="w-full h-10"
                    disabled={isResending || cooldown > 0}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : cooldown > 0 ? (
                      `Resend in ${cooldown}s`
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                </div>

                {/* Auto-check notice */}
                <p className="text-[11px] text-foreground-muted text-center">
                  We're also checking automatically every few seconds.
                </p>
              </div>
            )}

            {verified && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            )}

            {/* Back to login link */}
            <div className="mt-5 text-center text-sm">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-primary hover:text-primary-600 font-semibold transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Login
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
    </div>
  )
}
