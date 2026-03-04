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
import type { Challenge, Mooncycle, Partner } from '@/types/database'

export const metadata: Metadata = { title: 'Challenges · Admin' }

interface ChallengeRow extends Challenge {
  partners: Partner | null
  mooncycles: Pick<Mooncycle, 'id' | 'title' | 'slug'> | null
}

async function getChallenges(): Promise<ChallengeRow[]> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await db(supabase)
    .from('challenges')
    .select(`*, partners (id, name, slug, logo_url), mooncycles (id, title, slug)`)
    .order('cycle_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return []
  return (data as ChallengeRow[]) ?? []
}

function formatPrize(amount: number | null, currency: string): string {
  if (amount === null || amount === undefined) return '—'
  if (currency === 'USDC' || currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount) + (currency === 'USDC' ? ' USDC' : '')
  }
  return `${amount} ${currency}`
}

// Group challenges by cycle title for section headings
function groupByCycle(challenges: ChallengeRow[]): Map<string, { cycle: ChallengeRow['mooncycles']; rows: ChallengeRow[] }> {
  const map = new Map<string, { cycle: ChallengeRow['mooncycles']; rows: ChallengeRow[] }>()
  for (const c of challenges) {
    const key = c.cycle_id
    if (!map.has(key)) {
      map.set(key, { cycle: c.mooncycles, rows: [] })
    }
    map.get(key)!.rows.push(c)
  }
  return map
}

export default async function AdminChallengesPage() {
  const challenges = await getChallenges()
  const grouped = groupByCycle(challenges)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MoonPhaseIcon phase="first-quarter" size="sm" glow />
          <div>
            <h1 className="text-2xl font-bold">Challenges</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {challenges.length} challenge{challenges.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/challenges/new">+ New Challenge</Link>
        </Button>
      </div>

      {challenges.length === 0 ? (
        <GlowCard glow="none" className="border-border/30">
          <div className="py-12 text-center text-muted-foreground">
            <MoonPhaseIcon phase="new" size="md" className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No challenges yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
              Create a mooncycle first, then add partner or main challenges.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/challenges/new">Create the first challenge</Link>
            </Button>
          </div>
        </GlowCard>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([cycleId, { cycle, rows }]) => (
            <div key={cycleId}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {cycle?.title ?? 'Unknown Cycle'}
                </h2>
                <span className="text-xs text-muted-foreground/50">
                  ({rows.length} challenge{rows.length !== 1 ? 's' : ''})
                </span>
              </div>

              <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="pl-6">Title</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Prize</TableHead>
                      <TableHead>Sort</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((challenge) => (
                      <TableRow
                        key={challenge.id}
                        className="border-border/20 hover:bg-white/[0.02]"
                      >
                        <TableCell className="pl-6">
                          <div>
                            <span className="font-medium">{challenge.title}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {challenge.is_main_challenge && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[oklch(0.55_0.18_280/15%)] text-purple-400 border border-purple-500/25">
                                  Main Challenge
                                </span>
                              )}
                              {!challenge.is_active && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted/30 text-muted-foreground/60 border border-border/30">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {challenge.partners?.name ?? (
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
                          {challenge.sort_order}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/challenges/${challenge.id}/edit`}>Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </GlowCard>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
