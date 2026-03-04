import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import type {
  Mooncycle,
  Challenge,
  Submission,
  Winner,
  Partner,
  PrizeCurrency,
} from '@/types/database'

export const metadata: Metadata = { title: 'Select Winners · Admin' }

interface ChallengeRow extends Challenge {
  partner: Partner | null
}

interface SubmissionRow extends Submission {
  avg_judge_score: number | null
  judge_count: number
  challenges: ChallengeRow[]
}

interface WinnerRow extends Winner {
  submission: Pick<Submission, 'id' | 'project_title' | 'team_name'>
}

const PLACE_LABELS: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: '1st Place', color: 'text-[oklch(0.85_0.15_85)]', icon: '🥇' },
  2: { label: '2nd Place', color: 'text-slate-300', icon: '🥈' },
  3: { label: '3rd Place', color: 'text-amber-600', icon: '🥉' },
}

async function getWinnersPageData(cycleId: string) {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)

  const [cycleRes, challengesRes, submissionsRes, winnersRes] = await Promise.all([
    s.from('mooncycles').select('*').eq('id', cycleId).single(),
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
      .from('winners')
      .select(`*, submission:submissions(id, project_title, team_name)`)
      .eq('cycle_id', cycleId),
  ])

  const cycle = cycleRes.data as Mooncycle | null
  const challenges: ChallengeRow[] = (challengesRes.data as ChallengeRow[]) ?? []
  const rawSubs = (submissionsRes.data as Array<Record<string, unknown>>) ?? []
  const existingWinners: WinnerRow[] = (winnersRes.data as WinnerRow[]) ?? []

  // Flatten submission challenge joins
  const submissions: SubmissionRow[] = rawSubs.map((sub) => {
    const challengeJoins =
      (sub.challenges as Array<{ challenge: ChallengeRow }>) ?? []
    return {
      ...sub,
      challenges: challengeJoins.map((j) => j.challenge).filter(Boolean),
      avg_judge_score: null,
      judge_count: 0,
    } as unknown as SubmissionRow
  })

  // Load and aggregate scores
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

    // Aggregate per submission+challenge
    const aggMap = new Map<string, { total: number; judges: Set<string> }>()
    rawScores.forEach((score) => {
      const key = `${score.submission_id}::${score.challenge_id}`
      if (!aggMap.has(key)) aggMap.set(key, { total: 0, judges: new Set() })
      const agg = aggMap.get(key)!
      agg.total += score.overall_score
      agg.judges.add(score.judge_id)
    })

    // Attach to submissions (using first challenge match for display)
    submissions.forEach((sub) => {
      // Average across all challenges the submission is in
      let totalScore = 0
      let totalJudges = 0
      let entries = 0
      sub.challenges.forEach((c) => {
        const agg = aggMap.get(`${sub.id}::${c.id}`)
        if (agg) {
          totalScore += agg.total / agg.judges.size
          totalJudges = Math.max(totalJudges, agg.judges.size)
          entries++
        }
      })
      if (entries > 0) {
        sub.avg_judge_score = Math.round(totalScore / entries)
        sub.judge_count = totalJudges
      }
    })
  }

  return { cycle, challenges, submissions, existingWinners }
}

// Server action: save winners for a challenge
async function saveWinners(
  cycleId: string,
  challengeId: string,
  formData: FormData
) {
  'use server'

  const admin = db(getSupabaseAdminClient())

  // Delete existing winners for this challenge
  await admin
    .from('winners')
    .delete()
    .eq('cycle_id', cycleId)
    .eq('challenge_id', challengeId)

  const now = new Date().toISOString()
  const inserts = []

  for (const place of [1, 2, 3]) {
    const submissionId = formData.get(`place_${place}`) as string | null
    if (!submissionId || submissionId === '') continue

    const prizeAmount = formData.get(`prize_amount_${place}`) as string | null
    const prizeCurrency = (formData.get(`prize_currency_${place}`) as string) || 'USDC'
    const prizeNotes = formData.get(`prize_notes_${place}`) as string | null

    inserts.push({
      cycle_id: cycleId,
      challenge_id: challengeId,
      submission_id: submissionId,
      place,
      prize_amount: prizeAmount ? Number(prizeAmount) : null,
      prize_currency: prizeCurrency as PrizeCurrency,
      prize_notes: prizeNotes || null,
      announced_at: null,
      created_by: null,
      created_at: now,
    })
  }

  if (inserts.length > 0) {
    const { error } = await admin.from('winners').insert(inserts)
    if (error) throw new Error(error.message)

    // Update submission statuses to winner
    const winnerSubmissionIds = inserts.map((i) => i.submission_id)
    await admin
      .from('submissions')
      .update({ status: 'winner' })
      .in('id', winnerSubmissionIds)
  }

  redirect(`/admin/judging/${cycleId}/winners`)
}

function ScoreBadge({ score, judgeCount }: { score: number | null; judgeCount: number }) {
  if (score === null) {
    return <span className="text-xs text-muted-foreground/40">No scores</span>
  }
  const color =
    score > 70
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : score >= 40
      ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      : 'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${color}`}
    >
      {score}
      {judgeCount > 0 && (
        <span className="text-[10px] font-normal opacity-70">({judgeCount}j)</span>
      )}
    </span>
  )
}

export default async function WinnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ cycleId: string }>
  searchParams: Promise<{ challenge?: string }>
}) {
  const { cycleId } = await params
  const { challenge: focusChallenge } = await searchParams

  const { cycle, challenges, submissions, existingWinners } =
    await getWinnersPageData(cycleId)

  if (!cycle) notFound()

  // Index existing winners by challenge+place
  const winnerMap = new Map<string, WinnerRow>()
  existingWinners.forEach((w) => {
    winnerMap.set(`${w.challenge_id}::${w.place}`, w)
  })

  // Filter to focused challenge if provided
  const displayChallenges = focusChallenge
    ? challenges.filter((c) => c.id === focusChallenge)
    : challenges

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          href={`/admin/judging?cycle=${cycleId}`}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          ← Judging
        </Link>
      </div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="full" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">Select Winners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{cycle.title}</p>
        </div>
      </div>

      {/* Challenge filter tabs */}
      {challenges.length > 1 && (
        <div className="flex items-center gap-1 mb-6 flex-wrap">
          <Link
            href={`/admin/judging/${cycleId}/winners`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              !focusChallenge
                ? 'bg-[#6A04D4] text-white'
                : 'bg-white/5 border border-border/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Challenges
          </Link>
          {challenges.map((c) => (
            <Link
              key={c.id}
              href={`/admin/judging/${cycleId}/winners?challenge=${c.id}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                focusChallenge === c.id
                  ? 'bg-[#6A04D4] text-white'
                  : 'bg-white/5 border border-border/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.title}
            </Link>
          ))}
        </div>
      )}

      {displayChallenges.length === 0 ? (
        <GlowCard glow="none" className="border-border/30">
          <p className="text-sm text-muted-foreground text-center py-8">
            No challenges found.
          </p>
        </GlowCard>
      ) : (
        <div className="space-y-8">
          {displayChallenges.map((challenge) => {
            // Submissions that entered this challenge, sorted by avg judge score
            const challengeSubs = submissions
              .filter((sub) => sub.challenges.some((c) => c.id === challenge.id))
              .sort((a, b) => {
                const aScore = a.avg_judge_score ?? -1
                const bScore = b.avg_judge_score ?? -1
                if (bScore !== aScore) return bScore - aScore
                const aAi = a.ai_analysis?.scores?.overall ?? 0
                const bAi = b.ai_analysis?.scores?.overall ?? 0
                return bAi - aAi
              })

            const saveAction = saveWinners.bind(null, cycleId, challenge.id)

            const existingPlace1 = winnerMap.get(`${challenge.id}::1`)
            const existingPlace2 = winnerMap.get(`${challenge.id}::2`)
            const existingPlace3 = winnerMap.get(`${challenge.id}::3`)

            const hasWinners = existingPlace1 || existingPlace2 || existingPlace3

            return (
              <div key={challenge.id}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <h2 className="font-semibold">{challenge.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {challenge.partner && (
                        <span className="text-xs text-muted-foreground">
                          {challenge.partner.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/50">
                        {challengeSubs.length} submission{challengeSubs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {hasWinners && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="size-4 text-[oklch(0.85_0.15_85)]" />
                      <span className="text-xs text-muted-foreground">Winners set</span>
                    </div>
                  )}
                </div>

                <GlowCard glow="none" className="border-border/30">
                  {/* Existing Winners Summary */}
                  {hasWinners && (
                    <div className="mb-6 pb-5 border-b border-border/20">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Current Winners
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[1, 2, 3].map((place) => {
                          const winner = winnerMap.get(`${challenge.id}::${place}`)
                          const placeInfo = PLACE_LABELS[place]
                          if (!winner) return null
                          return (
                            <div
                              key={place}
                              className="rounded-lg border border-border/20 bg-white/[0.02] px-4 py-3"
                            >
                              <p className={`text-xs font-semibold mb-1 ${placeInfo.color}`}>
                                {placeInfo.icon} {placeInfo.label}
                              </p>
                              <p className="text-sm font-medium">
                                {winner.submission?.project_title ?? 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {winner.submission?.team_name}
                              </p>
                              {winner.prize_amount && (
                                <p className="text-xs text-[oklch(0.85_0.15_85)] mt-1">
                                  {winner.prize_amount.toLocaleString()} {winner.prize_currency}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Submission Rankings */}
                  {challengeSubs.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Ranked Submissions
                      </h3>
                      <div className="space-y-1.5">
                        {challengeSubs.map((sub, idx) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-white/[0.02] border border-border/10"
                          >
                            <span className="text-xs font-bold text-muted-foreground/40 w-4 shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{sub.project_title}</p>
                              <p className="text-xs text-muted-foreground">{sub.team_name}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {sub.ai_analysis?.scores?.overall !== undefined && (
                                <span
                                  className="text-xs text-muted-foreground/60"
                                  title="AI score"
                                >
                                  AI: {sub.ai_analysis.scores.overall}
                                </span>
                              )}
                              <ScoreBadge
                                score={sub.avg_judge_score}
                                judgeCount={sub.judge_count}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Winner Selection Form */}
                  <form action={saveAction} className="space-y-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Assign Winners
                    </h3>

                    {[1, 2, 3].map((place) => {
                      const placeInfo = PLACE_LABELS[place]
                      const currentWinner = winnerMap.get(`${challenge.id}::${place}`)
                      return (
                        <div
                          key={place}
                          className="rounded-lg border border-border/20 bg-white/[0.02] px-4 py-4"
                        >
                          <p className={`text-sm font-semibold mb-3 ${placeInfo.color}`}>
                            {placeInfo.icon} {placeInfo.label}
                          </p>

                          {/* Submission Select */}
                          <div className="space-y-1.5 mb-3">
                            <label
                              htmlFor={`place_${place}_${challenge.id}`}
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Winning Submission
                            </label>
                            <select
                              id={`place_${place}_${challenge.id}`}
                              name={`place_${place}`}
                              defaultValue={currentWinner?.submission_id ?? ''}
                              className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
                            >
                              <option value="">— None —</option>
                              {challengeSubs.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.project_title} ({sub.team_name})
                                  {sub.avg_judge_score !== null
                                    ? ` — Score: ${sub.avg_judge_score}`
                                    : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Prize */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                Prize Amount
                              </label>
                              <input
                                type="number"
                                name={`prize_amount_${place}`}
                                defaultValue={currentWinner?.prize_amount ?? ''}
                                placeholder={
                                  challenge.prize_amount
                                    ? String(challenge.prize_amount)
                                    : '0'
                                }
                                min={0}
                                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                Currency
                              </label>
                              <select
                                name={`prize_currency_${place}`}
                                defaultValue={
                                  currentWinner?.prize_currency ?? challenge.prize_currency ?? 'USDC'
                                }
                                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
                              >
                                <option value="USDC">USDC</option>
                                <option value="USD">USD</option>
                                <option value="ETH">ETH</option>
                                <option value="SOL">SOL</option>
                                <option value="custom">Custom</option>
                              </select>
                            </div>
                          </div>

                          {/* Prize Notes */}
                          <div className="mt-3 space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                              Prize Notes
                              <span className="text-muted-foreground/50 font-normal ml-1">(optional)</span>
                            </label>
                            <input
                              type="text"
                              name={`prize_notes_${place}`}
                              defaultValue={currentWinner?.prize_notes ?? ''}
                              placeholder="e.g. Paid in 2 installments"
                              className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
                            />
                          </div>
                        </div>
                      )
                    })}

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="submit"
                        className="bg-[#6A04D4] text-white hover:bg-[#7B14E4]"
                      >
                        Save Winners
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This will overwrite any existing winner selections for this challenge.
                      </p>
                    </div>
                  </form>
                </GlowCard>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
