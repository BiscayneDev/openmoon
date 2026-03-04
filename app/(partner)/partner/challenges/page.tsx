import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Challenge, Mooncycle } from '@/types/database'

export const metadata: Metadata = { title: 'My Challenges · Partner' }

interface ChallengeRow extends Challenge {
  mooncycles: Pick<Mooncycle, 'id' | 'title' | 'status'> | null
  submission_count: number
}

function formatPrize(amount: number | null, currency: string): string {
  if (amount === null || amount === undefined) return '—'
  if (currency === 'USDC' || currency === 'USD') {
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount) + (currency === 'USDC' ? ' USDC' : '')
    )
  }
  return `${amount} ${currency}`
}

function CycleStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: 'bg-green-500/15 text-green-400 border-green-500/30',
    upcoming: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    judging: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    ended: 'bg-muted/40 text-muted-foreground border-border/40',
    draft: 'bg-muted/40 text-muted-foreground/60 border-border/30',
  }
  const cls = variants[status] ?? variants.draft
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${cls}`}
    >
      {status}
    </span>
  )
}

async function getPartnerChallenges(userId: string): Promise<ChallengeRow[] | null> {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)

  const { data: userProfile } = await s
    .from('users')
    .select('partner_id')
    .eq('id', userId)
    .single()

  if (!userProfile?.partner_id) return null

  const partnerId = userProfile.partner_id as string

  const { data, error } = await s
    .from('challenges')
    .select(`*, mooncycles (id, title, status)`)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })

  if (error) return []

  const challenges = (data ?? []) as ChallengeRow[]
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

  return challenges.map((c: ChallengeRow) => ({
    ...c,
    submission_count: submissionCountMap[c.id] ?? 0,
  }))
}

export default async function PartnerChallengesPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?returnTo=/partner/challenges')

  const challenges = await getPartnerChallenges(user.id)

  if (challenges === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <MoonPhaseIcon phase="new" size="lg" className="mb-6 opacity-30" />
        <h1 className="text-xl font-bold mb-2">No partner account linked</h1>
        <p className="text-sm text-muted-foreground">
          Your account is not associated with a partner organisation.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="first-quarter" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">My Challenges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {challenges.length} challenge{challenges.length !== 1 ? 's' : ''} assigned to your
            organisation
          </p>
        </div>
      </div>

      {challenges.length === 0 ? (
        <GlowCard glow="none" className="border-border/30">
          <div className="py-12 text-center text-muted-foreground">
            <MoonPhaseIcon phase="new" size="md" className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No challenges assigned yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              An admin will add challenges to your partner account.
            </p>
          </div>
        </GlowCard>
      ) : (
        <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="pl-6">Title</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((challenge) => (
                <TableRow
                  key={challenge.id}
                  className="border-border/20 hover:bg-white/[0.02]"
                >
                  <TableCell className="pl-6">
                    <div>
                      <span className="font-medium">{challenge.title}</span>
                      {!challenge.is_active && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted/30 text-muted-foreground/60 border border-border/30">
                            Inactive
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {challenge.mooncycles ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-foreground/80">{challenge.mooncycles.title}</span>
                        <CycleStatusBadge status={challenge.mooncycles.status} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {challenge.prize_amount ? (
                      <span className="text-[oklch(0.85_0.15_85)]">
                        {formatPrize(challenge.prize_amount, challenge.prize_currency)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {challenge.submission_count}
                  </TableCell>
                  <TableCell>
                    {challenge.is_active ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted/40 text-muted-foreground border border-border/40">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/partner/challenges/${challenge.id}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlowCard>
      )}
    </div>
  )
}
