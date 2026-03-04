import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import type { SubmissionStatus, AnalysisStatus, Mooncycle } from '@/types/database'
import { FileText, Plus, Rocket } from 'lucide-react'

export const metadata: Metadata = { title: 'My Dashboard · OpenMoon' }

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-white/10 text-white/50' },
  submitted: { label: 'Submitted', className: 'bg-blue-500/20 text-blue-400' },
  under_review: { label: 'Under Review', className: 'bg-yellow-500/20 text-yellow-400' },
  scored: { label: 'Scored', className: 'bg-orange-500/20 text-orange-400' },
  winner: { label: 'Winner', className: 'bg-yellow-400/20 text-yellow-300' },
  disqualified: { label: 'Disqualified', className: 'bg-red-500/20 text-red-400' },
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

async function getActiveCycle(): Promise<Mooncycle | null> {
  const supabase = await getSupabaseServerClient()
  const { data } = await db(supabase)
    .from('mooncycles')
    .select('*')
    .in('status', ['active', 'upcoming'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .single()
  return data ?? null
}

async function getUserSubmissions(userId: string) {
  const supabase = await getSupabaseServerClient()
  const { data } = await db(supabase)
    .from('submissions')
    .select(`
      id,
      project_title,
      team_name,
      status,
      analysis_status,
      submitted_at,
      created_at,
      cycle_id,
      mooncycles (title)
    `)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Array<{
    id: string
    project_title: string
    team_name: string
    status: SubmissionStatus
    analysis_status: AnalysisStatus
    submitted_at: string | null
    created_at: string
    cycle_id: string
    mooncycles: { title: string } | null
  }>
}

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?returnTo=/dashboard')

  const [submissions, activeCycle] = await Promise.all([
    getUserSubmissions(user.id),
    getActiveCycle(),
  ])

  const newSubmissionHref = activeCycle ? `/submit/${activeCycle.id}` : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
          {activeCycle && (
            <p className="text-sm text-white/50 mt-1">
              Active cycle: <span className="text-white/70">{activeCycle.title}</span>
            </p>
          )}
        </div>
        {newSubmissionHref ? (
          <Button
            asChild
            className="bg-[#6A04D4] text-white hover:bg-[#7B14E4] gap-2"
          >
            <Link href={newSubmissionHref}>
              <Plus className="size-4" />
              New Submission
            </Link>
          </Button>
        ) : (
          <Button
            disabled
            className="bg-[#6A04D4]/40 text-white/40 cursor-not-allowed gap-2"
          >
            <Plus className="size-4" />
            New Submission
          </Button>
        )}
      </div>

      {/* Empty state */}
      {submissions.length === 0 ? (
        <GlowCard glow="purple" className="text-center py-16">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-[#6A04D4]/20 p-4">
              <Rocket className="size-8 text-[#6A04D4]" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No submissions yet</h2>
          {activeCycle ? (
            <>
              <p className="text-white/50 mb-6 max-w-md mx-auto">
                The current cycle is live — start building and submit your project before time runs out.
              </p>
              <Button
                asChild
                className="bg-[#6A04D4] text-white hover:bg-[#7B14E4]"
              >
                <Link href={`/submit/${activeCycle.id}`}>Start Your Submission</Link>
              </Button>
            </>
          ) : (
            <p className="text-white/50 max-w-md mx-auto">
              There are no active cycles right now. Check back soon for the next hackathon.
            </p>
          )}
        </GlowCard>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <GlowCard
              key={sub.id}
              glow="none"
              hover={false}
              className="border border-white/8 p-0 overflow-hidden"
            >
              <div className="flex items-center gap-4 p-5">
                <div className="flex-shrink-0 rounded-lg bg-[#6A04D4]/15 p-2.5">
                  <FileText className="size-5 text-[#6A04D4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-white truncate">
                      {sub.project_title}
                    </h3>
                    <StatusBadge status={sub.status} />
                    {sub.analysis_status === 'completed' && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[#6A04D4]/20 text-[#A855F7]">
                        AI Analysis
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                    <span>{sub.team_name}</span>
                    {sub.mooncycles?.title && (
                      <>
                        <span className="text-white/20">·</span>
                        <span>{sub.mooncycles.title}</span>
                      </>
                    )}
                    {sub.submitted_at && (
                      <>
                        <span className="text-white/20">·</span>
                        <span>
                          Submitted{' '}
                          {new Date(sub.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="border border-white/12 text-white/70 hover:text-white hover:bg-white/5"
                  >
                    <Link href={`/submissions/${sub.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      )}
    </div>
  )
}
