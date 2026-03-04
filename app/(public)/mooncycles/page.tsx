import { Suspense } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NebulaBg } from '@/components/cosmic/NebulaBg'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon, getCyclePhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Mooncycle } from '@/types/database'
import { formatDate, daysUntil } from '@/lib/utils/dates'
import { formatPrizeShort } from '@/lib/utils/prizes'
import { ArrowRight, Calendar, Trophy } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mooncycles' }

const STATUS_LABELS: Record<string, string> = {
  upcoming: '⏳ Upcoming',
  active: '🟢 Live',
  judging: '⚖️ Judging',
  ended: '✅ Ended',
  draft: '📝 Draft',
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  judging: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ended: 'bg-muted text-muted-foreground',
  draft: 'bg-muted text-muted-foreground',
}

async function getCycles() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase
    .from('mooncycles')
    .select('*')
    .neq('status', 'draft')
    .order('starts_at', { ascending: false })
  return (data ?? []) as Mooncycle[]
}

export default async function MooncyclesPage() {
  const cycles = await getCycles()
  const active = cycles.filter(c => c.status === 'active' || c.status === 'upcoming')
  const past = cycles.filter(c => c.status === 'judging' || c.status === 'ended')

  return (
    <div className="px-4 py-12">
      <div className="container mx-auto max-w-4xl">
        <div
          className="text-center mb-12 py-10 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
        >
          <h1
            className="text-4xl font-bold mb-3"
            style={{ background: 'linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            Mooncycles
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every Mooncycle is a new hackathon sprint. Build with MoonPay Agents, enter partner challenges, and compete for prizes.
          </p>
        </div>

        {active.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wider text-xs">Current &amp; Upcoming</h2>
            <div className="space-y-4">
              {active.map((cycle, idx) => (
                <CycleCard key={cycle.id} cycle={cycle} index={idx + 1} featured />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wider text-xs">Past Cycles</h2>
            <div className="space-y-3">
              {past.map((cycle, idx) => (
                <CycleCard key={cycle.id} cycle={cycle} index={active.length + idx + 1} />
              ))}
            </div>
          </section>
        )}

        {cycles.length === 0 && (
          <GlowCard className="text-center py-16">
            <MoonPhaseIcon phase="new" size="lg" className="mb-4 mx-auto block opacity-30" />
            <p className="text-muted-foreground">No mooncycles yet. Check back soon.</p>
          </GlowCard>
        )}
      </div>
    </div>
  )
}

function CycleCard({ cycle, index, featured = false }: { cycle: Mooncycle; index: number; featured?: boolean }) {
  const phase = getCyclePhaseIcon(index)

  return (
    <Link href={`/mooncycles/${cycle.slug}`} className="block group">
      <GlowCard glow={featured ? 'white' : 'none'} className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${!featured ? 'border border-white/8 hover:border-white/20' : ''} transition-all`}>
        <div className="flex items-center gap-4">
          <MoonPhaseIcon phase={phase} size="md" glow={featured} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`text-xs ${STATUS_COLORS[cycle.status]}`}>
                {STATUS_LABELS[cycle.status]}
              </Badge>
            </div>
            <h3 className="font-bold text-lg group-hover:text-white transition-colors">{cycle.title}</h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDate(cycle.starts_at)} – {formatDate(cycle.ends_at)}
              </span>
              {cycle.status === 'active' && (
                <span className="text-green-400">· {daysUntil(cycle.ends_at)}d left</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden md:block">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Trophy className="size-3" />
              Total prizes
            </div>
            <div className="font-bold text-lg">{formatPrizeShort(cycle.total_prize_pool)}</div>
          </div>
          <ArrowRight className="size-5 text-muted-foreground group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
      </GlowCard>
    </Link>
  )
}
