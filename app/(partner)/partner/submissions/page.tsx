import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
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
import type { Submission, Challenge, SubmissionStatus } from '@/types/database'
import type { AIAnalysis } from '@/types/ai'

export const metadata: Metadata = { title: 'Submissions · Partner' }

interface SubmissionRow extends Submission {
  challenge_title: string
  challenge_id: string
}

const STATUS_VARIANTS: Record<SubmissionStatus, string> = {
  draft: 'bg-muted/40 text-muted-foreground/60 border-border/30',
  submitted: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  under_review: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  scored: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  winner: 'bg-green-500/15 text-green-400 border-green-500/30',
  disqualified: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cls = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.draft
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${cls}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr))
}

function getAIScore(analysis: AIAnalysis | null): string {
  if (!analysis?.scores?.overall) return '—'
  return analysis.scores.overall.toFixed(1)
}

async function getPartnerSubmissions(userId: string): Promise<SubmissionRow[] | null> {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)

  const { data: userProfile } = await s
    .from('users')
    .select('partner_id')
    .eq('id', userId)
    .single()

  if (!userProfile?.partner_id) return null

  const partnerId = userProfile.partner_id as string

  // Get all challenge ids belonging to this partner
  const { data: challengeRows, error: cErr } = await s
    .from('challenges')
    .select('id, title')
    .eq('partner_id', partnerId)

  if (cErr || !challengeRows || challengeRows.length === 0) return []

  const challengeMap: Record<string, string> = {}
  for (const c of challengeRows as Challenge[]) {
    challengeMap[c.id] = c.title
  }
  const challengeIds = Object.keys(challengeMap)

  // Get submission_ids from the join table
  const { data: scRows, error: scErr } = await s
    .from('submission_challenges')
    .select('submission_id, challenge_id')
    .in('challenge_id', challengeIds)

  if (scErr || !scRows || scRows.length === 0) return []

  const submissionIds = [
    ...new Set((scRows as { submission_id: string; challenge_id: string }[]).map((r) => r.submission_id)),
  ]

  // Map submission_id -> first challenge_id (for display)
  const submissionToChallengeId: Record<string, string> = {}
  for (const row of scRows as { submission_id: string; challenge_id: string }[]) {
    if (!submissionToChallengeId[row.submission_id]) {
      submissionToChallengeId[row.submission_id] = row.challenge_id
    }
  }

  const { data: submissions, error: sErr } = await s
    .from('submissions')
    .select(
      'id, project_title, team_name, status, submitted_at, analysis_status, ai_analysis, final_score'
    )
    .in('id', submissionIds)
    .order('submitted_at', { ascending: false })

  if (sErr || !submissions) return []

  return (submissions as Submission[]).map((sub) => {
    const challengeId = submissionToChallengeId[sub.id] ?? ''
    return {
      ...sub,
      challenge_id: challengeId,
      challenge_title: challengeMap[challengeId] ?? '—',
    } as SubmissionRow
  })
}

export default async function PartnerSubmissionsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?returnTo=/partner/submissions')

  const submissions = await getPartnerSubmissions(user.id)

  if (submissions === null) {
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
        <MoonPhaseIcon phase="waxing-gibbous" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">Submissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} targeting your
            challenges &mdash; read-only view
          </p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <GlowCard glow="none" className="border-border/30">
          <div className="py-12 text-center text-muted-foreground">
            <MoonPhaseIcon phase="new" size="md" className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No submissions yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Submissions targeting your challenges will appear here once the cycle opens.
            </p>
          </div>
        </GlowCard>
      ) : (
        <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="pl-6">Project</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Challenge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead className="pr-6 text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id} className="border-border/20 hover:bg-white/[0.02]">
                  <TableCell className="pl-6">
                    <span className="font-medium">{sub.project_title}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.team_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.challenge_title}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={sub.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(sub.submitted_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {sub.ai_analysis ? (
                      <span className="text-primary/80 font-mono">
                        {getAIScore(sub.ai_analysis as unknown as AIAnalysis)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      href={`/partner/submissions/${sub.id}`}
                      className="text-xs text-primary/70 hover:text-primary transition-colors"
                    >
                      View &rarr;
                    </Link>
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
