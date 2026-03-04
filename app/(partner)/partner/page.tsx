import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import Link from 'next/link'
import { Puzzle, FileText, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import type { Partner, Challenge, Mooncycle } from '@/types/database'

export const metadata: Metadata = { title: 'Partner Overview' }

interface ChallengeWithCount extends Challenge {
  submission_count: number
  mooncycles: Pick<Mooncycle, 'id' | 'title' | 'status'> | null
}

async function getPartnerData(userId: string) {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)

  // Get user's partner_id
  const { data: userProfile } = await s
    .from('users')
    .select('partner_id')
    .eq('id', userId)
    .single()

  if (!userProfile?.partner_id) return null

  const partnerId = userProfile.partner_id as string

  const [partnerRes, challengesRes] = await Promise.all([
    s.from('partners').select('*').eq('id', partnerId).single(),
    s
      .from('challenges')
      .select(`*, mooncycles (id, title, status)`)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false }),
  ])

  if (!partnerRes.data) return null

  const challenges = (challengesRes.data ?? []) as ChallengeWithCount[]

  // For each challenge, count submissions via submission_challenges join
  const challengeIds = challenges.map((c: Challenge) => c.id)
  let submissionCountMap: Record<string, number> = {}

  if (challengeIds.length > 0) {
    const { data: scRows } = await s
      .from('submission_challenges')
      .select('challenge_id')
      .in('challenge_id', challengeIds)

    for (const row of scRows ?? []) {
      const cid = (row as { challenge_id: string }).challenge_id
      submissionCountMap[cid] = (submissionCountMap[cid] ?? 0) + 1
    }
  }

  const enrichedChallenges: ChallengeWithCount[] = challenges.map((c: ChallengeWithCount) => ({
    ...c,
    submission_count: submissionCountMap[c.id] ?? 0,
  }))

  const totalSubmissions = Object.values(submissionCountMap).reduce((a, b) => a + b, 0)

  // Determine active cycle status from challenges
  const activeCycle = enrichedChallenges.find(
    (c) => c.mooncycles?.status === 'active'
  )?.mooncycles ?? null

  return {
    partner: partnerRes.data as Partner,
    challenges: enrichedChallenges,
    totalSubmissions,
    activeCycle,
  }
}

export default async function PartnerOverviewPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?returnTo=/partner')

  const data = await getPartnerData(user.id)

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <MoonPhaseIcon phase="new" size="lg" className="mb-6 opacity-30" />
        <h1 className="text-xl font-bold mb-2">No partner account linked</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account is not yet associated with a partner organisation. Contact an admin to complete
          your partner setup.
        </p>
      </div>
    )
  }

  const { partner, challenges, totalSubmissions, activeCycle } = data

  const statCards = [
    {
      label: 'Challenges',
      value: challenges.length,
      icon: Puzzle,
      href: '/partner/challenges',
    },
    {
      label: 'Total Submissions',
      value: totalSubmissions,
      icon: FileText,
      href: '/partner/submissions',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        {partner.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logo_url}
            alt={partner.name}
            className="h-12 w-12 rounded-xl object-cover ring-1 ring-border/40 shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">
              {partner.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{partner.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {partner.website_url && (
              <a
                href={partner.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors"
              >
                <ExternalLink className="size-3" />
                {partner.website_url.replace(/^https?:\/\//, '')}
              </a>
            )}
            {activeCycle && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                Active: {activeCycle.title}
              </span>
            )}
          </div>
          {partner.description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{partner.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <GlowCard glow="none" className="hover:border-glow transition-all border-border/30 cursor-pointer">
              <Icon className="size-5 text-primary mb-3" />
              <div className="text-3xl font-bold mb-1">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </GlowCard>
          </Link>
        ))}
      </div>

      {/* Challenges quick view */}
      <div className="grid md:grid-cols-2 gap-6">
        <GlowCard glow="none" className="border-border/30">
          <h2 className="font-semibold mb-4">Your Challenges</h2>
          {challenges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No challenges yet.</p>
          ) : (
            <div className="space-y-2">
              {challenges.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.submission_count} submission{c.submission_count !== 1 ? 's' : ''}
                      {c.mooncycles && (
                        <> &middot; {c.mooncycles.title}</>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/partner/challenges/${c.id}/edit`}
                    className="text-xs text-primary/70 hover:text-primary transition-colors shrink-0 ml-3"
                  >
                    Edit
                  </Link>
                </div>
              ))}
              {challenges.length > 5 && (
                <Link
                  href="/partner/challenges"
                  className="block text-xs text-primary/70 hover:text-primary transition-colors pt-1"
                >
                  View all {challenges.length} challenges &rarr;
                </Link>
              )}
            </div>
          )}
        </GlowCard>

        <GlowCard glow="none" className="border-border/30">
          <h2 className="font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            {[
              { href: '/partner/challenges', label: 'View all challenges' },
              { href: '/partner/submissions', label: 'Review submissions' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 border-b border-border/20 last:border-0"
              >
                {label} &rarr;
              </Link>
            ))}
          </div>
        </GlowCard>
      </div>
    </div>
  )
}
