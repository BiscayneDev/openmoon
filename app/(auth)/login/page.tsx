'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MoonPayIcon } from '@/components/brand/MoonPayLogo'
import { StarField } from '@/components/cosmic/StarField'
import { OrbitLoader } from '@/components/cosmic/OrbitLoader'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Github, Mail } from 'lucide-react'

function LoginContent() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/dashboard'
  const [loading, setLoading] = useState<'github' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  async function signInWithGitHub() {
    setLoading('github')
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo}` },
    })
  }

  async function signInWithGoogle() {
    setLoading('email')
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo}` },
    })
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading('email')
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo}` },
    })
    setMagicSent(true)
    setLoading(null)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4" style={{ background: '#050505' }}>
      <StarField count={80} />
      {/* Cinematic atmospheric glow */}
      <div className="fixed pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120vw', height: '120vh', background: 'radial-gradient(circle at 25% 35%, rgba(255,107,53,0.3) 0%, transparent 45%), radial-gradient(circle at 75% 65%, rgba(74,144,226,0.2) 0%, transparent 45%)', opacity: 0.15, filter: 'blur(80px)', zIndex: 0 }} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <MoonPayIcon size={40} color="#ffffff" className="mb-4 mx-auto block opacity-90" />
          <h1 className="text-3xl font-bold gradient-text-moon mb-2">Welcome to OpenMoon</h1>
          <p className="text-muted-foreground text-sm">Sign in to submit your project and compete</p>
        </div>

        <Card className="glass border-glow p-6 space-y-3">
          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-3">📧</div>
              <p className="font-medium mb-1">Check your inbox</p>
              <p className="text-sm text-muted-foreground">We sent a magic link to <strong>{email}</strong></p>
            </div>
          ) : (
            <>
              <Button
                onClick={signInWithGitHub}
                disabled={!!loading}
                className="w-full glass border-glow hover:glow-white transition-all"
                variant="outline"
              >
                {loading === 'github' ? <OrbitLoader size="sm" className="mr-2" /> : <Github className="mr-2 size-4" />}
                Continue with GitHub
              </Button>

              <Button
                onClick={signInWithGoogle}
                disabled={!!loading}
                className="w-full glass border-glow hover:glow-white transition-all"
                variant="outline"
              >
                {loading === 'email' ? <OrbitLoader size="sm" className="mr-2" /> : (
                  <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or email magic link</span>
                </div>
              </div>

              <form onSubmit={sendMagicLink} className="space-y-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-md bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
                <Button type="submit" disabled={!!loading || !email} className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold">
                  <Mail className="mr-2 size-4" />
                  Send Magic Link
                </Button>
              </form>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By signing in you agree to participate in OpenMoon hackathon challenges.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
