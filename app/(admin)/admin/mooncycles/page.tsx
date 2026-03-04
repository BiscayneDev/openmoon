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
import type { CycleStatus, Mooncycle } from '@/types/database'

export const metadata: Metadata = { title: 'Mooncycles · Admin' }

const STATUS_STYLES: Record<CycleStatus, string> = {
  draft: 'bg-muted/40 text-muted-foreground border border-border/40',
  upcoming: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  active: 'bg-green-500/15 text-green-400 border border-green-500/30',
  judging: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  ended: 'bg-muted/20 text-muted-foreground/60 border border-border/20',
}

function StatusBadge({ status }: { status: CycleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
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

function formatUSDC(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

async function getMooncycles(): Promise<Mooncycle[]> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await db(supabase)
    .from('mooncycles')
    .select('*')
    .order('starts_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export default async function AdminMooncyclesPage() {
  const cycles = await getMooncycles()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MoonPhaseIcon phase="waxing-gibbous" size="sm" glow />
          <div>
            <h1 className="text-2xl font-bold">Mooncycles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {cycles.length} cycle{cycles.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/mooncycles/new">+ New Mooncycle</Link>
        </Button>
      </div>

      <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
        {cycles.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MoonPhaseIcon phase="new" size="md" className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No mooncycles yet.</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/admin/mooncycles/new">Create the first one</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="pl-6">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Starts At</TableHead>
                <TableHead>Ends At</TableHead>
                <TableHead>Prize Pool</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id} className="border-border/20 hover:bg-white/[0.02]">
                  <TableCell className="pl-6">
                    <div>
                      <span className="font-medium">{cycle.title}</span>
                      {cycle.theme && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cycle.theme}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cycle.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(cycle.starts_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(cycle.ends_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-[var(--moon-gold,oklch(0.85_0.15_85))]">
                      {formatUSDC(cycle.total_prize_pool)}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/mooncycles/${cycle.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
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
