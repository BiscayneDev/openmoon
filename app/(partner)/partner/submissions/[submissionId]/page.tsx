import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import type {
  Submission,
  Challenge,
  TeamMember,
  SubmissionStatus,
} from '@/types/database'
import type { AIAnalysis } from '@/types/ai'
import { ExternalLink, Github, Monitor, FileText, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Submission Detail · Partner' }

interface FullSubmission extends Submission {
  challenges: Challenge[]
  team_members: TeamMember[]
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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

async function getSubmission(
  submissionId: string,
  userId: string
): Promise<FullSubmission | null> {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)

  // Get user profile
  const { data: userProfile } = await s
    .from('users')
    .select('partner_id, role')
    .eq('id', userId)
    .single()

  // Get submission with related data
  const { data, error } = await s
    .from('submissions')
    .select(`
      *,
      submission_challenges (
        challenge_id,
        challenges (*)
      ),
      team_members (*)
    `)
    .eq('id', submissionId)
    .single()

  if (error || !data) return null

  // Flatten challenges from the nested join
  const rawSub = data as Record<string, unknown>
  const scJoins = (rawSub.submission_challenges as { challenge_id: string; challenges: Challenge }[]) ?? []
  const challenges: Challenge[] = scJoins.map((j) => j.challenges).filter(Boolean)
  const teamMembers: TeamMember[] = (rawSub.team_members as TeamMember[]) ?? []

  const submission: FullSubmission = {
    ...(rawSub as unknown as Submission),
    challenges,
    team_members: teamMembers,
  }

  // Admins see everything; partners can only see submissions targeting their challenges
  if (userProfile?.role !== 'admin') {
    if (!userProfile?.partner_id) return null

    const partnerChallengeIds = new Set(
      challenges
        .filter((c) => c.partner_id === userProfile.partner_id)
        .map((c) => c.id)
    )
    if (partnerChallengeIds.size === 0) return null
  }

  return submission
}

export default async function PartnerSubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const { submissionId } = await params

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?returnTo=/partner/submissions')

  const submission = await getSubmission(submissionId, user.id)
  if (!submission) notFound()

  const aiAnalysis = submission.ai_analysis as AIAnalysis | null

  return (
    <div className="max-w-4xl">
      {/* Back nav */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/partner/submissions">&larr; Back to submissions</Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <MoonPhaseIcon phase="waxing-gibbous" size="sm" glow />
          <div>
            <h1 className="text-2xl font-bold">{submission.project_title}</h1>
            {submission.tagline && (
              <p className="text-sm text-muted-foreground mt-0.5 italic">{submission.tagline}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusBadge status={submission.status} />
              <span className="text-xs text-muted-foreground">
                Submitted {formatDate(submission.submitted_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Team */}
        <GlowCard glow="none" className="border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <Users className="size-4 text-primary" />
            <h2 className="font-semibold">Team: {submission.team_name}</h2>
          </div>
          {submission.team_members.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {submission.team_members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-border/20"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {member.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{member.display_name}</span>
                      {member.is_lead && (
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-primary/15 text-primary border border-primary/20">
                          Lead
                        </span>
                      )}
                    </div>
                    {member.role_in_team && (
                      <p className="text-xs text-muted-foreground mt-0.5">{member.role_in_team}</p>
                    )}
                    {member.github_username && (
                      <a
                        href={`https://github.com/${member.github_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary/70 hover:text-primary transition-colors"
                      >
                        @{member.github_username}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No team member details provided.</p>
          )}
        </GlowCard>

        {/* Project Details */}
        <GlowCard glow="none" className="border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="size-4 text-primary" />
            <h2 className="font-semibold">Project Details</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Description
              </h3>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{submission.description}</p>
            </div>

            {submission.problem_statement && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Problem Statement
                </h3>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {submission.problem_statement}
                </p>
              </div>
            )}

            {submission.solution_description && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Solution
                </h3>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {submission.solution_description}
                </p>
              </div>
            )}

            {submission.tech_stack && submission.tech_stack.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {submission.tech_stack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-white/[0.04] text-foreground/70 border border-border/30"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {submission.moonpay_features && submission.moonpay_features.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  MoonPay Features Used
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {submission.moonpay_features.map((feat) => (
                    <span
                      key={feat}
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary/80 border border-primary/20"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlowCard>

        {/* Links */}
        {(submission.github_url ||
          submission.demo_url ||
          submission.demo_video_url ||
          submission.deck_url ||
          (submission.additional_links && submission.additional_links.length > 0)) && (
          <GlowCard glow="none" className="border-border/30">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="size-4 text-primary" />
              <h2 className="font-semibold">Links</h2>
            </div>
            <div className="space-y-2">
              {submission.github_url && (
                <a
                  href={submission.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors group"
                >
                  <Github className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  <span className="truncate">{submission.github_url}</span>
                </a>
              )}
              {submission.demo_url && (
                <a
                  href={submission.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors group"
                >
                  <Monitor className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  <span className="truncate">{submission.demo_url}</span>
                </a>
              )}
              {submission.demo_video_url && (
                <a
                  href={submission.demo_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">Demo Video</span>
                </a>
              )}
              {submission.deck_url && (
                <a
                  href={submission.deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
                >
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">Pitch Deck</span>
                </a>
              )}
              {submission.additional_links?.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{link.label || link.url}</span>
                </a>
              ))}
            </div>
          </GlowCard>
        )}

        {/* Challenges entered */}
        {submission.challenges.length > 0 && (
          <GlowCard glow="none" className="border-border/30">
            <h2 className="font-semibold mb-3">Challenges Entered</h2>
            <div className="space-y-2">
              {submission.challenges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/20"
                >
                  <span className="size-2 rounded-full bg-primary/60 shrink-0" />
                  <span className="text-sm font-medium">{c.title}</span>
                  {c.prize_amount && (
                    <span className="ml-auto text-xs text-[oklch(0.85_0.15_85)] shrink-0">
                      {c.prize_amount.toLocaleString()} {c.prize_currency}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </GlowCard>
        )}

        {/* AI Analysis — read-only executive summary + scores */}
        {aiAnalysis && (
          <GlowCard glow="none" className="border-border/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">AI Analysis</h2>
              <span className="text-xs text-muted-foreground/60 font-mono">
                {aiAnalysis.model} &middot; confidence {(aiAnalysis.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Overall score */}
            <div className="flex items-center gap-4 mb-5">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {aiAnalysis.scores.overall.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Overall</div>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Innovation', value: aiAnalysis.scores.innovation },
                  { label: 'Technical', value: aiAnalysis.scores.technical_depth },
                  { label: 'Presentation', value: aiAnalysis.scores.presentation_quality },
                  { label: 'Completeness', value: aiAnalysis.scores.completeness },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-border/20 text-center"
                  >
                    <div className="text-lg font-bold text-foreground/80">{value.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Executive summary */}
            {aiAnalysis.executive_summary && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Executive Summary
                </h3>
                <p className="text-sm text-foreground/80">{aiAnalysis.executive_summary}</p>
              </div>
            )}

            {/* Strengths */}
            {aiAnalysis.key_strengths && aiAnalysis.key_strengths.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Key Strengths
                </h3>
                <ul className="space-y-1">
                  {aiAnalysis.key_strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-green-400 mt-0.5 shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {aiAnalysis.key_weaknesses && aiAnalysis.key_weaknesses.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Areas for Improvement
                </h3>
                <ul className="space-y-1">
                  {aiAnalysis.key_weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-yellow-400 mt-0.5 shrink-0">~</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground/40 mt-4 pt-3 border-t border-border/20">
              AI analysis is provided for informational purposes only and does not constitute an
              official score. Final scores are determined by judges.
            </p>
          </GlowCard>
        )}
      </div>
    </div>
  )
}
