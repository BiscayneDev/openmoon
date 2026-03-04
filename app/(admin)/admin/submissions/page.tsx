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
import type {
  Submission,
  SubmissionStatus,
  AnalysisStatus,
  Mooncycle,
} from '@/types/database'

export const metadata: Metadata = { title: 'Submissions · Admin' }

interface SubmissionRow extends Submission {
  mooncycles: Pick<Mooncycle, 'id' | 'title' | 'slug'> | null
}

type FilterParam = 'all' | 'submitted' | 'under_review' | 'pending_analysis'

const SUBMISSION_STATUS_STYLES: Record<SubmissionStatus, string> = {
  draft: 'bg-muted/40 text-muted-foreground border border-border/40',
  submitted: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  under_review: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  scored: 'bg-[oklch(0.55_0.18_280/15%)] text-purple-400 border border-purple-500/25',
  winner: 'bg-green-500/15 text-green-400 border border-green-500/30',
  disqualified: 'bg-red-500/15 text-red-400 border border-red-500/30',
}

const ANALYSIS_STATUS_STYLES: Record<AnalysisStatus, string> = {
  pending: 'bg-muted/40 text-muted-foreground border border-border/40',
  processing: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  completed: 'bg-green-500/15 text-green-400 border border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border border-red-500/30',
}

function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SUBMISSION_STATUS_STYLES[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ANALYSIS_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return <span className="text-muted-foreground/40">—</span>
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function getSubmissions(filter: FilterParam): Promise<SubmissionRow[]> {
  const supabase = await getSupabaseServerClient()
  let query = db(supabase)
    .from('submissions')
    .select(`*, mooncycles (id, title, slug)`)
    .order('submitted_at', { ascending: false })

  if (filter === 'submitted') {
    query = query.eq('status', 'submitted')
  } else if (filter === 'under_review') {
    query = query.eq('status', 'under_review')
  } else if (filter === 'pending_analysis') {
    query = query.eq('analysis_status', 'pending')
  }

  const { data, error } = await query
  if (error) return []
  return (data as SubmissionRow[]) ?? []
}

const FILTER_TABS: { label: string; value: FilterParam }[] = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Pending Analysis', value: 'pending_analysis' },
]

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter } = await searchParams
  const filter: FilterParam =
    rawFilter === 'submitted' ||
    rawFilter === 'under_review' ||
    rawFilter === 'pending_analysis'
      ? rawFilter
      : 'all'

  const submissions = await getSubmissions(filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MoonPhaseIcon phase="waxing-crescent" size="sm" glow />
          <div>
            <h1 className="text-2xl font-bold">Submissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              {filter !== 'all' && ' (filtered)'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border/20 pb-0">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/admin/submissions' : `/admin/submissions?filter=${tab.value}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative -mb-px ${
              filter === tab.value
                ? 'text-foreground border-b-2 border-[#6A04D4]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MoonPhaseIcon phase="new" size="md" className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No submissions found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="pl-6">Project</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Analysis</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="pr-6">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow
                  key={sub.id}
                  className="border-border/20 hover:bg-white/[0.02]"
                >
                  <TableCell className="pl-6">
                    <Link
                      href={`/admin/submissions/${sub.id}`}
                      className="font-medium hover:text-[#a855f7] transition-colors"
                    >
                      {sub.project_title}
                    </Link>
                    {sub.tagline && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {sub.tagline}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.team_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sub.mooncycles?.title ?? (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SubmissionStatusBadge status={sub.status} />
                  </TableCell>
                  <TableCell>
                    <AnalysisStatusBadge status={sub.analysis_status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {sub.final_score !== null ? (
                      <span
                        className={
                          sub.final_score > 70
                            ? 'text-emerald-400 font-semibold'
                            : sub.final_score >= 40
                            ? 'text-yellow-400 font-semibold'
                            : 'text-red-400 font-semibold'
                        }
                      >
                        {sub.final_score}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-sm text-muted-foreground">
                    {formatDate(sub.submitted_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlowCard>
    </div>
  )
}
