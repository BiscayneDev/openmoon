import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
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
import { AIAnalysisPanel } from '@/components/judging/AIAnalysisPanel'
import { ScoreCard } from '@/components/judging/ScoreCard'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ExternalLink, Github, Video, FileText, Link2 } from 'lucide-react'
import type { Metadata } from 'next'
import type {
  SubmissionWithDetails,
  SubmissionStatus,
  Score,
  ChallengeWithPartner,
} from '@/types/database'

export const metadata: Metadata = { title: 'Submission · Admin' }

const SUBMISSION_STATUS_STYLES: Record<SubmissionStatus, string> = {
  draft: 'bg-muted/40 text-muted-foreground border border-border/40',
  submitted: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  under_review: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  scored: 'bg-[oklch(0.55_0.18_280/15%)] text-purple-400 border border-purple-500/25',
  winner: 'bg-green-500/15 text-green-400 border border-green-500/30',
  disqualified: 'bg-red-500/15 text-red-400 border border-red-500/30',
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SUBMISSION_STATUS_STYLES[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

async function getSubmission(id: string): Promise<SubmissionWithDetails | null> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await db(supabase)
    .from('submissions')
    .select(`
      *,
      challenges:submission_challenges(
        challenge:challenges(*, partner:partners(*))
      ),
      team_members(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Flatten the nested challenge join
  const raw = data as Record<string, unknown>
  const challengeJoins = (raw.challenges as Array<{ challenge: ChallengeWithPartner }>) ?? []
  const challenges = challengeJoins.map((j) => j.challenge).filter(Boolean)

  return {
    ...raw,
    challenges,
  } as unknown as SubmissionWithDetails
}

async function getScoresForSubmission(submissionId: string): Promise<Score[]> {
  const supabase = await getSupabaseServerClient()
  const { data } = await db(supabase)
    .from('scores')
    .select('*')
    .eq('submission_id', submissionId)
  return (data as Score[]) ?? []
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// --- Server Actions ---

async function updateStatus(submissionId: string, formData: FormData) {
  'use server'
  const status = formData.get('status') as string
  const admin = db(getSupabaseAdminClient())
  await admin.from('submissions').update({ status }).eq('id', submissionId)
  redirect(`/admin/submissions/${submissionId}`)
}

async function togglePublic(submissionId: string, formData: FormData) {
  'use server'
  const is_public = formData.get('is_public') === 'true'
  const admin = db(getSupabaseAdminClient())
  await admin.from('submissions').update({ is_public }).eq('id', submissionId)
  redirect(`/admin/submissions/${submissionId}`)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const { submissionId } = await params
  const [submission, scores, currentUserId] = await Promise.all([
    getSubmission(submissionId),
    getScoresForSubmission(submissionId),
    getCurrentUserId(),
  ])

  if (!submission) notFound()

  const updateStatusAction = updateStatus.bind(null, submissionId)
  const togglePublicAction = togglePublic.bind(null, submissionId)

  // Scores indexed by challenge_id for the current judge
  const myScoresByChallengeId: Record<string, Score> = {}
  if (currentUserId) {
    scores
      .filter((s) => s.judge_id === currentUserId)
      .forEach((s) => {
        myScoresByChallengeId[s.challenge_id] = s
      })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/admin/submissions"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          ← Submissions
        </Link>
      </div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <MoonPhaseIcon phase="waning-crescent" size="sm" glow />
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{submission.project_title}</h1>
              <StatusBadge status={submission.status} />
            </div>
            {submission.tagline && (
              <p className="text-sm text-muted-foreground mt-0.5">{submission.tagline}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-border/20">
        {/* Change Status */}
        <form action={updateStatusAction} className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Status:
          </label>
          <select
            name="status"
            defaultValue={submission.status}
            className="rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors"
          >
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="scored">Scored</option>
            <option value="winner">Winner</option>
            <option value="disqualified">Disqualified</option>
          </select>
          <Button type="submit" size="sm" variant="outline" className="text-xs h-7 px-2.5">
            Update
          </Button>
        </form>

        {/* Toggle Public */}
        <form action={togglePublicAction} className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Visibility:
          </label>
          <input
            type="hidden"
            name="is_public"
            value={submission.is_public ? 'false' : 'true'}
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className={`text-xs h-7 px-2.5 ${
              submission.is_public
                ? 'text-green-400 border-green-500/30 hover:bg-green-500/10'
                : 'text-muted-foreground'
            }`}
          >
            {submission.is_public ? 'Public' : 'Private'}
          </Button>
        </form>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: Details */}
        <div className="space-y-6 min-w-0">
          {/* Project Details */}
          <GlowCard glow="none" className="border-border/30">
            <h2 className="text-sm font-semibold mb-4">Project Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-relaxed">{submission.description}</p>
              </div>
              {submission.problem_statement && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Problem Statement</p>
                  <p className="text-sm leading-relaxed">{submission.problem_statement}</p>
                </div>
              )}
              {submission.solution_description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Solution</p>
                  <p className="text-sm leading-relaxed">{submission.solution_description}</p>
                </div>
              )}
              {submission.tech_stack && submission.tech_stack.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {submission.tech_stack.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs bg-white/5 border border-border/30 text-foreground/80"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {submission.moonpay_features && submission.moonpay_features.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">MoonPay Features Used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {submission.moonpay_features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs bg-[#6A04D4]/15 border border-purple-500/25 text-purple-400"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/10 text-xs text-muted-foreground">
                <div>
                  <p className="text-muted-foreground/60 mb-0.5">Submitted</p>
                  <p>{formatDate(submission.submitted_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground/60 mb-0.5">Last Updated</p>
                  <p>{formatDate(submission.updated_at)}</p>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Team Members */}
          {submission.team_members.length > 0 && (
            <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-border/20">
                <h2 className="text-sm font-semibold">
                  Team Members ({submission.team_members.length})
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20 hover:bg-transparent">
                    <TableHead className="pl-6 text-xs">Name</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">GitHub</TableHead>
                    <TableHead className="pr-6 text-xs">Wallet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submission.team_members.map((member) => (
                    <TableRow key={member.id} className="border-border/10 hover:bg-white/[0.02]">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{member.display_name}</span>
                          {member.is_lead && (
                            <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-[#6A04D4]/15 text-purple-400 border border-purple-500/20">
                              Lead
                            </span>
                          )}
                        </div>
                        {member.email && (
                          <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {member.role_in_team ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {member.github_username ? (
                          <a
                            href={`https://github.com/${member.github_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <Github className="size-3" />
                            {member.github_username}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-xs font-mono text-muted-foreground">
                        {member.wallet_address ? (
                          <span title={member.wallet_address}>
                            {member.wallet_address.slice(0, 6)}…{member.wallet_address.slice(-4)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </GlowCard>
          )}

          {/* Challenges Entered */}
          {submission.challenges.length > 0 && (
            <GlowCard glow="none" className="border-border/30">
              <h2 className="text-sm font-semibold mb-4">
                Challenges Entered ({submission.challenges.length})
              </h2>
              <div className="space-y-3">
                {submission.challenges.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-border/20 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.title}</p>
                        {c.partner && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.partner.name}
                          </p>
                        )}
                      </div>
                      {c.prize_amount && (
                        <span className="text-xs text-[oklch(0.85_0.15_85)] shrink-0">
                          {c.prize_amount.toLocaleString()} {c.prize_currency}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          )}
        </div>

        {/* RIGHT: AI Analysis + Score Cards + Links */}
        <div className="space-y-6">
          {/* AI Analysis */}
          <AIAnalysisPanel
            analysis={submission.ai_analysis}
            status={submission.analysis_status}
          />

          {/* Score Cards - one per challenge */}
          {submission.challenges.map((challenge) => (
            <ScoreCard
              key={challenge.id}
              submissionId={submission.id}
              challengeId={challenge.id}
              challengeTitle={challenge.title}
              judgingCriteria={challenge.judging_criteria}
              existingScore={myScoresByChallengeId[challenge.id]}
            />
          ))}

          {/* Links */}
          {(submission.github_url ||
            submission.demo_url ||
            submission.demo_video_url ||
            submission.deck_url ||
            (submission.additional_links && submission.additional_links.length > 0)) && (
            <GlowCard glow="none" className="border-border/30">
              <h3 className="text-sm font-semibold mb-3">Links</h3>
              <div className="space-y-2">
                {submission.github_url && (
                  <a
                    href={submission.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <Github className="size-4 shrink-0" />
                    GitHub Repository
                    <ExternalLink className="size-3 ml-auto" />
                  </a>
                )}
                {submission.demo_url && (
                  <a
                    href={submission.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <ExternalLink className="size-4 shrink-0" />
                    Live Demo
                    <ExternalLink className="size-3 ml-auto" />
                  </a>
                )}
                {submission.demo_video_url && (
                  <a
                    href={submission.demo_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <Video className="size-4 shrink-0" />
                    Demo Video
                    <ExternalLink className="size-3 ml-auto" />
                  </a>
                )}
                {submission.deck_url && (
                  <a
                    href={submission.deck_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <FileText className="size-4 shrink-0" />
                    Pitch Deck
                    <ExternalLink className="size-3 ml-auto" />
                  </a>
                )}
                {submission.additional_links?.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <Link2 className="size-4 shrink-0" />
                    {link.label}
                    <ExternalLink className="size-3 ml-auto" />
                  </a>
                ))}
              </div>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  )
}
