import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import Link from 'next/link'
import { Moon, FileText, Users, Zap } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin' }

async function getStats() {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)
  const [cycles, submissions, users, pendingAnalysis] = await Promise.all([
    s.from('mooncycles').select('id', { count: 'exact' }).in('status', ['active', 'upcoming']),
    s.from('submissions').select('id', { count: 'exact' }).eq('status', 'submitted'),
    s.from('users').select('id', { count: 'exact' }),
    s.from('submissions').select('id', { count: 'exact' }).eq('analysis_status', 'pending'),
  ])
  return {
    activeCycles: cycles.count ?? 0,
    pendingSubmissions: submissions.count ?? 0,
    totalUsers: users.count ?? 0,
    pendingAnalysis: pendingAnalysis.count ?? 0,
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="full" size="sm" glow />
        <h1 className="text-2xl font-bold">Admin Overview</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Cycles', value: stats.activeCycles, icon: Moon, href: '/admin/mooncycles' },
          { label: 'New Submissions', value: stats.pendingSubmissions, icon: FileText, href: '/admin/submissions' },
          { label: 'Total Users', value: stats.totalUsers, icon: Users, href: '/admin/users' },
          { label: 'Pending Analysis', value: stats.pendingAnalysis, icon: Zap, href: '/admin/submissions?filter=pending_analysis' },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <GlowCard glow="none" className="hover:border-glow transition-all border-border/30 cursor-pointer">
              <Icon className="size-5 text-primary mb-3" />
              <div className="text-3xl font-bold mb-1">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </GlowCard>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <GlowCard glow="none" className="border-border/30">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/mooncycles/new', label: '+ New Mooncycle' },
              { href: '/admin/challenges/new', label: '+ New Challenge' },
              { href: '/admin/partners/new', label: '+ Onboard Partner' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 border-b border-border/20 last:border-0">
                {label}
              </Link>
            ))}
          </div>
        </GlowCard>

        <GlowCard glow="none" className="border-border/30">
          <h2 className="font-semibold mb-4">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">Connect Supabase to see activity feed</p>
        </GlowCard>
      </div>
    </div>
  )
}
