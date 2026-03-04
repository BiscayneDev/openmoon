import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import type {
  Mooncycle,
  Challenge,
  Submission,
  Score,
  Partner,
} from '@/types/database'

export const metadata: Metadata = { title: 'Judging · Admin' }

interface ChallengeRow extends Challenge {
  partner: Partner | null
}

interface SubmissionRow extends Submission {
  challenges: ChallengeRow[]
}

interface ScoreAgg {
  submission_id: string
  challenge_id: string
  avg_score: number
  judge_count: number
}

async function getJudgingData(cycleId: string) {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)

  const [challengesRes, submissionsRes, scoresRes] = await Promise.all([
    s
      .from('challenges')
      .select('*, partner:partners(*)')
      .eq('cycle_id', cycleId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    s
      .from('submissions')
      .select(`
        *,
        challenges:submission_challenges(
          challenge:challenges(*, partner:partners(*))
        )
      `)
      .eq('cycle_id', cycleId)
      .in('status', ['submitted', 'under_review', 'scored', 'winner']),
    s
      .from('scores')
      .select('submission_id, challenge_id, overall_score, judge_id')
      .in(
        'submission_id',
        // We'll filter after
        []
      ),
  ])

  const challenges: ChallengeRow[] = (challengesRes.data as ChallengeRow[]) ?? []

  // Flatten the submissions
  const rawSubs = (submissionsRes.data as Array<Record<string, unknown>>) ?? []
  const submissions: SubmissionRow[] = rawSubs.map((sub) => {
    const challengeJoins =
      (sub.challenges as Array<{ challenge: ChallengeRow }>) ?? []
    return {
      ...sub,
      challenges: challengeJoins.map((j) => j.challenge).filter(Boolean),
    } as unknown as SubmissionRow
  })

  // Aggregate scores per submission+challenge
  // Re-query scores with actual submission ids
  let scoreAggs: ScoreAgg[] = []
  if (submissions.length > 0) {
    const subIds = submissions.map((s) => s.id)
    const { data: scoresData } = await db(supabase)
      .from('scores')
      .select('submission_id, challenge_id, overall_score, judge_id')
      .in('submission_id', subIds)

    const rawScores = (scoresData as Array<{
      submission_id: string
      challenge_id: string
      overall_score: number
      judge_id: string
    }>) ?? []

    // Group by submission_id + challenge_id
    const aggMap = new Map<string, { total: number; judges: Set<string> }>()
    rawScores.forEach((score) => {
      const key = `${score.submission_id}::${score.challenge_id}`
      if (!aggMap.has(key)) {
        aggMap.set(key, { total: 0, judges: new Set() })
      }
      const agg = aggMap.get(key)!
      agg.total += score.overall_score
      agg.judges.add(score.judge_id)
    })

    scoreAggs = Array.from(aggMap.entries()).map(([key, val]) => {
      const [submission_id, challenge_id] = key.split('::')
      return {
        submission_id,
        challenge_id,
        avg_score: Math.round(val.total / val.judges.size),
        judge_count: val.judges.size,
      }
    })
  }

  return { challenges, submissions, scoreAggs }
}

async function getCycles(): Promise<Mooncycle[]> {
  const supabase = await getSupabaseServerClient()
  const { data } = await db(supabase)
    .from('mooncycles')
    .select('*')
    .in('status', ['judging', 'active', 'ended'])
    .order('starts_at', { ascending: false })
  return (data as Mooncycle[]) ?? []
}

function ScorePill({ score, judgeCount }: { score: number; judgeCount: number }) {
  const color =
    score > 70
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : score >= 40
      ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      : 'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${color}`}
      title={`${judgeCount} judge${judgeCount !== 1 ? 's' : ''}`}
    >
      {score}
      <span className="text-[10px] font-normal opacity-70">({judgeCount}j)</span>
    </span>
  )
}

export default async function AdminJudgingPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>
}) {
  const cycles = await getCycles()

  if (cycles.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8">
          <MoonPhaseIcon phase="full" size="sm" glow />
          <h1 className="text-2xl font-bold">Judging</h1>
        </div>
        <GlowCard glow="none" className="border-border/30">
          <div className="py-12 text-center">
            <MoonPhaseIcon phase="new" size="md" className="mx-auto mb-4 opacity-30" />
            <p className="text-sm text-muted-foreground">
              No active judging cycles. Set a cycle to &quot;judging&quot; status to begin.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/admin/mooncycles">Manage Cycles</Link>
            </Button>
          </div>
        </GlowCard>
      </div>
    )
  }

  const { cycle: cycleParam } = await searchParams
  const selectedCycle =
    cycles.find((c) => c.id === cycleParam) ??
    cycles.find((c) => c.status === 'judging') ??
    cycles[0]

  const { challenges, submissions, scoreAggs } = await getJudgingData(selectedCycle.id)

  // Index scoreAggs by composite key
  const scoreMap = new Map<string, ScoreAgg>()
  scoreAggs.forEach((agg) => {
    scoreMap.set(`${agg.submission_id}::${agg.challenge_id}`, agg)
  })

  // Group submissions by challenge
  const submissionsByChallenge = new Map<string, SubmissionRow[]>()
  challenges.forEach((c) => submissionsByChallenge.set(c.id, []))
  submissions.forEach((sub) => {
    sub.challenges.forEach((c) => {
      if (submissionsByChallenge.has(c.id)) {
        submissionsByChallenge.get(c.id)!.push(sub)
      }
    })
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MoonPhaseIcon phase="full" size="sm" glow />
          <div>
            <h1 className="text-2xl font-bold">Judging</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''} in review
            </p>
          </div>
        </div>

        {/* Cycle Selector */}
        {cycles.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cycle:</span>
            <div className="flex gap-1">
              {cycles.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/judging?cycle=${c.id}`}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    c.id === selectedCycle.id
                      ? 'bg-[#6A04D4] text-white'
                      : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 border border-border/30'
                  }`}
                >
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cycle header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{selectedCycle.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 mr-1.5 font-medium capitalize border ${
                selectedCycle.status === 'judging'
                  ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                  : selectedCycle.status === 'active'
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : 'bg-muted/20 text-muted-foreground/60 border-border/20'
              }`}
            >
              {selectedCycle.status}
            </span>
            {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Per-challenge sections */}
      {challenges.length === 0 ? (
        <GlowCard glow="none" className="border-border/30">
          <p className="text-sm text-muted-foreground text-center py-8">
            No challenges in this cycle.
          </p>
        </GlowCard>
      ) : (
        <div className="space-y-8">
          {challenges.map((challenge) => {
            const challengeSubs = submissionsByChallenge.get(challenge.id) ?? []
            // Sort by avg judge score desc, then AI score desc
            const sorted = [...challengeSubs].sort((a, b) => {
              const aScore = scoreMap.get(`${a.id}::${challenge.id}`)?.avg_score ?? -1
              const bScore = scoreMap.get(`${b.id}::${challenge.id}`)?.avg_score ?? -1
              if (bScore !== aScore) return bScore - aScore
              const aAi = a.ai_analysis?.scores?.overall ?? 0
              const bAi = b.ai_analysis?.scores?.overall ?? 0
              return bAi - aAi
            })

            return (
              <div key={challenge.id}>
                {/* Challenge header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <h3 className="font-semibold">
                      {challenge.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {challenge.partner && (
                        <span className="text-xs text-muted-foreground">{challenge.partner.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground/50">
                        {challengeSubs.length} submission{challengeSubs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-[#6A04D4] text-white hover:bg-[#7B14E4]">
                    <Link href={`/admin/judging/${selectedCycle.id}/winners?challenge=${challenge.id}`}>
                      Select Winners
                    </Link>
                  </Button>
                </div>

                <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
                  {challengeSubs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No submissions for this challenge.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20">
                          <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                            #
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                            Project
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                            Team
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                            AI Score
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                            Judge Avg
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                            Status
                          </th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                            View
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((sub, idx) => {
                          const scoreAgg = scoreMap.get(`${sub.id}::${challenge.id}`)
                          const aiScore = sub.ai_analysis?.scores?.overall ?? null
                          return (
                            <tr
                              key={sub.id}
                              className="border-b border-border/10 hover:bg-white/[0.02] last:border-0"
                            >
                              <td className="px-5 py-3 text-xs text-muted-foreground/50 font-medium">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-medium">{sub.project_title}</span>
                                {sub.tagline && (
                                  <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">
                                    {sub.tagline}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {sub.team_name}
                              </td>
                              <td className="px-4 py-3">
                                {aiScore !== null ? (
                                  <ScorePill score={aiScore} judgeCount={0} />
                                ) : (
                                  <span className="text-xs text-muted-foreground/40">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {scoreAgg ? (
                                  <ScorePill
                                    score={scoreAgg.avg_score}
                                    judgeCount={scoreAgg.judge_count}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground/40">No scores</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize border ${
                                    sub.status === 'winner'
                                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                      : sub.status === 'scored'
                                      ? 'bg-[oklch(0.55_0.18_280/15%)] text-purple-400 border-purple-500/25'
                                      : sub.status === 'under_review'
                                      ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                      : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  }`}
                                >
                                  {sub.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <Link
                                  href={`/admin/submissions/${sub.id}`}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Review →
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </GlowCard>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
