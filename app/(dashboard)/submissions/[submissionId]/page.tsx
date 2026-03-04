import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import type { SubmissionStatus, AnalysisStatus } from '@/types/database'
import { ArrowLeft, ExternalLink, Github, Globe, Video, BookOpen, Check } from 'lucide-react'

export const metadata: Metadata = { title: 'Submission · OpenMoon' }

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-white/10 text-white/50' },
  submitted: { label: 'Submitted', className: 'bg-blue-500/20 text-blue-400' },
  under_review: { label: 'Under Review', className: 'bg-yellow-500/20 text-yellow-400' },
  scored: { label: 'Scored', className: 'bg-orange-500/20 text-orange-400' },
  winner: { label: 'Winner', className: 'bg-yellow-400/20 text-yellow-300' },
  disqualified: { label: 'Disqualified', className: 'bg-red-500/20 text-red-400' },
}

const ANALYSIS_CONFIG: Record<AnalysisStatus, { label: string; className: string }> = {
  pending: { label: 'Analysis Pending', className: 'bg-white/10 text-white/40' },
  processing: { label: 'Analyzing...', className: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'AI Analysis Complete', className: 'bg-[#6A04D4]/20 text-[#A855F7]' },
  failed: { label: 'Analysis Failed', className: 'bg-red-500/20 text-red-400' },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
      {children}
    </h3>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-white/40 mb-0.5">{label}</dt>
      <dd className="text-sm text-white/80">{value}</dd>
    </div>
  )
}

async function getSubmission(submissionId: string, userId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: profile } = await db(supabase)
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdminOrJudge = profile?.role === 'admin' || profile?.role === 'judge'

  const { data, error } = await db(supabase)
    .from('submissions')
    .select(`
      *,
      submission_challenges (
        challenge_id,
        challenges (id, title, prize_amount, prize_currency, partners (name))
      ),
      team_members (*),
      mooncycles (id, title)
    `)
    .eq('id', submissionId)
    .single()

  if (error || !data) return null

  // Ensure the viewer owns the submission or is admin/judge
  if (!isAdminOrJudge && data.created_by !== userId) return null

  return data as {
    id: string
    project_title: string
    team_name: string
    tagline: string | null
    description: string
    problem_statement: string | null
    solution_description: string | null
    tech_stack: string[] | null
    moonpay_features: string[] | null
    github_url: string | null
    demo_url: string | null
    demo_video_url: string | null
    deck_url: string | null
    status: SubmissionStatus
    analysis_status: AnalysisStatus
    submitted_at: string | null
    final_score: number | null
    judge_notes: string | null
    created_at: string
    mooncycles: { id: string; title: string } | null
    submission_challenges: Array<{
      challenge_id: string
      challenges: {
        id: string
        title: string
        prize_amount: number | null
        prize_currency: string
        partners: { name: string } | null
      } | null
    }>
    team_members: Array<{
      id: string
      display_name: string
      email: string | null
      github_username: string | null
      role_in_team: string | null
      is_lead: boolean
    }>
  }
}

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const { submissionId } = await params
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?returnTo=/dashboard')

  const submission = await getSubmission(submissionId, user.id)
  if (!submission) notFound()

  const statusCfg = STATUS_CONFIG[submission.status] ?? STATUS_CONFIG.draft
  const analysisCfg = ANALYSIS_CONFIG[submission.analysis_status] ?? ANALYSIS_CONFIG.pending

  return (
    <div>
      {/* Back nav */}
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-white/50 hover:text-white hover:bg-white/5 -ml-2"
        >
          <Link href="/dashboard">
            <ArrowLeft className="size-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{submission.project_title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-white/50 text-sm">{submission.team_name}</span>
            {submission.mooncycles?.title && (
              <>
                <span className="text-white/20 text-sm">·</span>
                <span className="text-white/50 text-sm">{submission.mooncycles.title}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${analysisCfg.className}`}>
            {analysisCfg.label}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details */}
          <GlowCard glow="none" hover={false} className="border border-white/8">
            <SectionLabel>Project Details</SectionLabel>
            <dl className="space-y-4">
              {submission.tagline && (
                <div>
                  <dt className="text-xs text-white/40 mb-0.5">Tagline</dt>
                  <dd className="text-sm text-white/80 italic">"{submission.tagline}"</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-white/40 mb-0.5">Description</dt>
                <dd className="text-sm text-white/80 whitespace-pre-wrap">{submission.description}</dd>
              </div>
              <Field label="Problem Statement" value={submission.problem_statement} />
              <Field label="Solution" value={submission.solution_description} />
            </dl>
          </GlowCard>

          {/* Tech Stack */}
          {submission.tech_stack && submission.tech_stack.length > 0 && (
            <GlowCard glow="none" hover={false} className="border border-white/8">
              <SectionLabel>Tech Stack</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {submission.tech_stack.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md bg-white/8 px-2.5 py-1 text-xs text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </GlowCard>
          )}

          {/* MoonPay Features */}
          {submission.moonpay_features && submission.moonpay_features.length > 0 && (
            <GlowCard glow="none" hover={false} className="border border-white/8">
              <SectionLabel>MoonPay Features Used</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {submission.moonpay_features.map((feat) => (
                  <span
                    key={feat}
                    className="inline-flex items-center rounded-md bg-[#6A04D4]/15 px-2.5 py-1 text-xs text-[#A855F7]"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </GlowCard>
          )}

          {/* Challenges */}
          {submission.submission_challenges.length > 0 && (
            <GlowCard glow="none" hover={false} className="border border-white/8">
              <SectionLabel>Challenges Entered</SectionLabel>
              <div className="space-y-3">
                {submission.submission_challenges.map(({ challenge_id, challenges: c }) =>
                  c ? (
                    <div
                      key={challenge_id}
                      className="flex items-center justify-between rounded-lg bg-white/4 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{c.title}</p>
                        {c.partners?.name && (
                          <p className="text-xs text-white/40 mt-0.5">{c.partners.name}</p>
                        )}
                      </div>
                      {c.prize_amount != null && (
                        <span className="text-xs text-white/60">
                          {c.prize_amount.toLocaleString()} {c.prize_currency}
                        </span>
                      )}
                    </div>
                  ) : null
                )}
              </div>
            </GlowCard>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-6">
          {/* Links */}
          <GlowCard glow="none" hover={false} className="border border-white/8">
            <SectionLabel>Links</SectionLabel>
            <div className="space-y-2">
              {submission.github_url && (
                <a
                  href={submission.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <Github className="size-4 flex-shrink-0" />
                  <span className="truncate">GitHub</span>
                  <ExternalLink className="size-3 ml-auto flex-shrink-0 opacity-50" />
                </a>
              )}
              {submission.demo_url && (
                <a
                  href={submission.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <Globe className="size-4 flex-shrink-0" />
                  <span className="truncate">Live Demo</span>
                  <ExternalLink className="size-3 ml-auto flex-shrink-0 opacity-50" />
                </a>
              )}
              {submission.demo_video_url && (
                <a
                  href={submission.demo_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <Video className="size-4 flex-shrink-0" />
                  <span className="truncate">Demo Video</span>
                  <ExternalLink className="size-3 ml-auto flex-shrink-0 opacity-50" />
                </a>
              )}
              {submission.deck_url && (
                <a
                  href={submission.deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  <BookOpen className="size-4 flex-shrink-0" />
                  <span className="truncate">Pitch Deck</span>
                  <ExternalLink className="size-3 ml-auto flex-shrink-0 opacity-50" />
                </a>
              )}
              {!submission.github_url &&
                !submission.demo_url &&
                !submission.demo_video_url &&
                !submission.deck_url && (
                  <p className="text-xs text-white/30">No links provided</p>
                )}
            </div>
          </GlowCard>

          {/* Team Members */}
          <GlowCard glow="none" hover={false} className="border border-white/8">
            <SectionLabel>Team Members</SectionLabel>
            <div className="space-y-3">
              {submission.team_members.map((member) => (
                <div key={member.id} className="flex items-start gap-2.5">
                  <div className="size-7 rounded-full bg-[#6A04D4]/30 flex items-center justify-center text-xs font-semibold text-[#A855F7] flex-shrink-0">
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white/80">{member.display_name}</span>
                      {member.is_lead && (
                        <span className="text-[10px] bg-[#6A04D4]/20 text-[#A855F7] rounded px-1.5 py-0.5 font-medium">
                          Lead
                        </span>
                      )}
                    </div>
                    {member.role_in_team && (
                      <p className="text-xs text-white/40 mt-0.5">{member.role_in_team}</p>
                    )}
                    {member.github_username && (
                      <p className="text-xs text-white/30 mt-0.5">@{member.github_username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>

          {/* Metadata */}
          <GlowCard glow="none" hover={false} className="border border-white/8">
            <SectionLabel>Details</SectionLabel>
            <dl className="space-y-2">
              {submission.submitted_at && (
                <div>
                  <dt className="text-xs text-white/30">Submitted</dt>
                  <dd className="text-xs text-white/60">
                    {new Date(submission.submitted_at).toLocaleString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
              )}
              {submission.final_score != null && (
                <div>
                  <dt className="text-xs text-white/30">Final Score</dt>
                  <dd className="text-sm font-bold text-white">{submission.final_score}</dd>
                </div>
              )}
              {submission.judge_notes && (
                <div>
                  <dt className="text-xs text-white/30 mb-1">Judge Notes</dt>
                  <dd className="text-xs text-white/60 rounded bg-white/4 p-2">
                    {submission.judge_notes}
                  </dd>
                </div>
              )}
            </dl>
          </GlowCard>
        </div>
      </div>
    </div>
  )
}
