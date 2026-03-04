'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoonPayIcon } from '@/components/brand/MoonPayLogo'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#050505' }}
    >
      {/* Glow */}
      <div
        className="fixed pointer-events-none"
        aria-hidden="true"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120vw', height: '120vh',
          background: 'radial-gradient(circle at 25% 35%, rgba(255,107,53,0.3) 0%, transparent 45%), radial-gradient(circle at 75% 65%, rgba(74,144,226,0.2) 0%, transparent 45%)',
          opacity: 0.12, filter: 'blur(80px)', zIndex: 0,
        }}
      />

      <div className="relative z-10 w-full max-w-xs">
        <div className="text-center mb-8">
          <MoonPayIcon size={36} color="#ffffff" className="mb-4 mx-auto block opacity-80" />
          <h1 className="text-2xl font-bold text-white mb-1">Admin Access</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>OpenMoon internal portal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 p-6 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
        >
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
            className="w-full px-3 py-2.5 text-sm rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: '#fff', color: '#000' }}
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
