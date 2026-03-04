import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { Mooncycle, ChallengeWithPartner } from '@/types/database'
import { SubmissionWizard } from './SubmissionWizard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Submit Project · OpenMoon' }

async function getCycleWithChallenges(
  cycleId: string
): Promise<{ cycle: Mooncycle; challenges: ChallengeWithPartner[] } | null> {
  const supabase = await getSupabaseServerClient()

  const [{ data: cycle, error: cycleError }, { data: challenges }] = await Promise.all([
    db(supabase).from('mooncycles').select('*').eq('id', cycleId).single(),
    db(supabase)
      .from('challenges')
      .select(`*, partners (id, name, slug, logo_url)`)
      .eq('cycle_id', cycleId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  if (cycleError || !cycle) return null

  return {
    cycle: cycle as Mooncycle,
    challenges: (challenges ?? []) as ChallengeWithPartner[],
  }
}

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params

  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?returnTo=/submit/${cycleId}`)

  const result = await getCycleWithChallenges(cycleId)
  if (!result) notFound()

  const { cycle, challenges } = result

  if (cycle.status !== 'active' || new Date(cycle.ends_at) < new Date()) {
    redirect('/dashboard')
  }

  return <SubmissionWizard cycle={cycle} challenges={challenges} />
}
