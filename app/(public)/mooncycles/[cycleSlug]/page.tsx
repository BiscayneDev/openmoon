import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { NebulaBg } from '@/components/cosmic/NebulaBg'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon, getCyclePhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { MooncycleWithChallenges, ChallengeWithPartner } from '@/types/database'
import { formatDate, daysUntil } from '@/lib/utils/dates'
import { formatPrize, formatPrizeShort } from '@/lib/utils/prizes'
import { ArrowRight, Calendar, Clock, Trophy, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ cycleSlug: string }>
}

async function getCycle(slug: string) {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase
    .from('mooncycles')
    .select(`
      *,
      challenges (
        *,
        partners (id, name, slug, logo_url, website_url, description)
      )
    `)
    .eq('slug', slug)
    .neq('status', 'draft')
    .single()
  return data as MooncycleWithChallenges | null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cycleSlug } = await params
  const cycle = await getCycle(cycleSlug)
  if (!cycle) return {}
  return {
    title: cycle.title,
    description: cycle.description ?? `Hackathon cycle with ${formatPrizeShort(cycle.total_prize_pool)} in prizes.`,
  }
}

export default async function CycleDetailPage({ params }: Props) {
  const { cycleSlug } = await params
  const cycle = await getCycle(cycleSlug)
  if (!cycle) notFound()

  const isActive = cycle.status === 'active'
  const isUpcoming = cycle.status === 'upcoming'
  const canSubmit = isActive
  const mainChallenge = cycle.challenges.find(c => c.is_main_challenge)
  const partnerChallenges = cycle.challenges.filter(c => !c.is_main_challenge).sort((a, b) => a.sort_order - b.sort_order)
  const cycleNumber = parseInt(cycle.slug.replace(/\D/g, ''), 10) || 1

  return (
    <div>
      {/* ── Hero ── */}
      <NebulaBg variant="hero" className="px-4 pt-12 pb-16">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-start gap-6">
            <MoonPhaseIcon phase={getCyclePhaseIcon(cycleNumber)} size="lg" glow className="mt-1 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge className={`text-xs ${isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground'}`}>
                  {isActive ? '🟢 Live Now' : isUpcoming ? '⏳ Upcoming' : cycle.status === 'judging' ? '⚖️ Judging' : '✅ Ended'}
                </Badge>
                {cycle.theme && (
                  <Badge variant="outline" className="text-xs border-border/50">{cycle.theme}</Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-3">{cycle.title}</h1>

              {cycle.description && (
                <p className="text-muted-foreground text-lg leading-relaxed mb-6 max-w-2xl">
                  {cycle.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-8">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  {formatDate(cycle.starts_at)} – {formatDate(cycle.ends_at)}
                </span>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-green-400">
                    <Clock className="size-4" />
                    {daysUntil(cycle.ends_at)} days remaining
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Trophy className="size-4 text-primary" />
                  <strong className="text-foreground">{formatPrizeShort(cycle.total_prize_pool)}</strong> total prizes
                </span>
              </div>

              {canSubmit && (
                <Button asChild size="lg" className="gradient-moon text-white border-0 glow-purple font-semibold">
                  <Link href={`/submit/${cycle.id}`}>
                    Submit Your Project
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </NebulaBg>

      {/* ── Challenges ── */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-4xl space-y-8">

          {/* Main challenge */}
          {mainChallenge && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Main Challenge</h2>
              <ChallengeCard challenge={mainChallenge} featured />
            </div>
          )}

          {/* Partner challenges */}
          {partnerChallenges.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Partner Challenges ({partnerChallenges.length})
              </h2>
              <div className="space-y-4">
                {partnerChallenges.map(challenge => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Rules ── */}
      {cycle.rules_md && (
        <section className="px-4 py-12 border-t border-border/30">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold mb-6">Rules &amp; Guidelines</h2>
            <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{cycle.rules_md}</pre>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function ChallengeCard({ challenge, featured = false }: { challenge: ChallengeWithPartner; featured?: boolean }) {
  return (
    <GlowCard glow={featured ? 'purple' : 'blue'} className={featured ? '' : 'border-[oklch(0.55_0.18_220/20%)]'}>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1">
          {challenge.partner && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
                {challenge.partner.name}
              </Badge>
              {challenge.partner.website_url && (
                <a href={challenge.partner.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          <h3 className="text-xl font-bold mb-2">{challenge.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{challenge.description}</p>

          {challenge.judging_criteria && challenge.judging_criteria.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Judging Criteria</p>
              <div className="flex flex-wrap gap-2">
                {challenge.judging_criteria.map(c => (
                  <span key={c.name} className="text-xs glass border-border/30 px-2 py-1 rounded-full">
                    {c.name} <span className="text-muted-foreground">({c.weight}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 text-right md:text-right">
          <div className="text-xs text-muted-foreground mb-1">Prize</div>
          <div className="text-2xl font-bold gradient-text-moon">
            {challenge.prize_description ?? formatPrize(challenge.prize_amount, challenge.prize_currency)}
          </div>
          {challenge.max_winners > 1 && (
            <div className="text-xs text-muted-foreground mt-1">up to {challenge.max_winners} winners</div>
          )}
        </div>
      </div>
    </GlowCard>
  )
}
