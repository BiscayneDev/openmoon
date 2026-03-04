import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/types'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Challenge, Mooncycle, Partner } from '@/types/database'

export const metadata: Metadata = { title: 'Edit Challenge · Partner' }

interface ChallengeWithRelations extends Challenge {
  mooncycles: Pick<Mooncycle, 'id' | 'title' | 'status'> | null
  partners: Pick<Partner, 'id' | 'name'> | null
}

async function getChallenge(
  challengeId: string,
  userId: string
): Promise<ChallengeWithRelations | null> {
  const supabase = await getSupabaseServerClient()
  const s = db(supabase)

  // Verify the user's partner_id
  const { data: userProfile } = await s
    .from('users')
    .select('partner_id')
    .eq('id', userId)
    .single()

  if (!userProfile?.partner_id) return null

  const { data, error } = await s
    .from('challenges')
    .select(`*, mooncycles (id, title, status), partners (id, name)`)
    .eq('id', challengeId)
    .single()

  if (error || !data) return null

  const challenge = data as ChallengeWithRelations

  // Ownership check — admins bypass via role check in layout, partners must own the challenge
  if (challenge.partner_id !== userProfile.partner_id) return null

  return challenge
}

async function updatePartnerChallenge(
  challengeId: string,
  partnerId: string,
  formData: FormData
) {
  'use server'

  const description = (formData.get('description') as string) || ''
  const requirements_md = (formData.get('requirements_md') as string) || null
  const prize_description = (formData.get('prize_description') as string) || null

  // Verify ownership before writing
  const supabase = await getSupabaseServerClient()
  const { data: challenge } = await db(supabase)
    .from('challenges')
    .select('partner_id')
    .eq('id', challengeId)
    .single()

  if (!challenge || challenge.partner_id !== partnerId) {
    throw new Error('Forbidden: you do not own this challenge')
  }

  const admin = db(getSupabaseAdminClient())
  const { error } = await admin
    .from('challenges')
    .update({ description, requirements_md, prize_description })
    .eq('id', challengeId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  redirect('/partner/challenges')
}

export default async function PartnerEditChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>
}) {
  const { challengeId } = await params

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?returnTo=/partner/challenges')

  // Get user's partner_id for the bound server action
  const { data: userProfile } = await db(supabase)
    .from('users')
    .select('partner_id, role')
    .eq('id', user.id)
    .single()

  // Admins can edit any challenge; partners must own it
  let challenge: ChallengeWithRelations | null = null
  if (userProfile?.role === 'admin') {
    const { data } = await db(supabase)
      .from('challenges')
      .select(`*, mooncycles (id, title, status), partners (id, name)`)
      .eq('id', challengeId)
      .single()
    challenge = data as ChallengeWithRelations | null
  } else {
    challenge = await getChallenge(challengeId, user.id)
  }

  if (!challenge) notFound()

  const partnerId = (challenge.partner_id ?? userProfile?.partner_id ?? '') as string
  const updateAction = updatePartnerChallenge.bind(null, challengeId, partnerId)

  const inputCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors'
  const readonlyCls =
    'w-full rounded-md border border-border/30 bg-white/[0.02] px-3 py-2 text-sm text-muted-foreground cursor-not-allowed'
  const textareaCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-y'

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="waning-gibbous" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">Edit Challenge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{challenge.title}</p>
        </div>
      </div>

      <GlowCard glow="none" className="border-border/30 max-w-3xl">
        {/* Read-only context */}
        <div className="mb-6 pb-6 border-b border-border/20">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Challenge Info (read-only)
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <div className={readonlyCls}>{challenge.title}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cycle</label>
              <div className={readonlyCls}>
                {challenge.mooncycles?.title ?? '—'}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prize Amount</label>
              <div className={readonlyCls}>
                {challenge.prize_amount != null
                  ? `${challenge.prize_amount.toLocaleString()} ${challenge.prize_currency}`
                  : '—'}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Max Winners</label>
              <div className={readonlyCls}>{challenge.max_winners}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-3">
            Prize amount, cycle, and other settings are managed by the OpenMoon admin team.
          </p>
        </div>

        {/* Editable fields */}
        <form action={updateAction} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={challenge.description ?? ''}
              placeholder="Describe what participants should build for this challenge…"
              className={textareaCls}
            />
            <p className="text-xs text-muted-foreground/60">
              A concise overview shown to participants on the challenges page.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="requirements_md" className="text-sm font-medium">
              Requirements{' '}
              <span className="text-muted-foreground font-normal">(Markdown)</span>
            </label>
            <textarea
              id="requirements_md"
              name="requirements_md"
              rows={8}
              defaultValue={challenge.requirements_md ?? ''}
              placeholder={`## Requirements\n\n- Must integrate at least one MoonPay SDK feature\n- Include a live demo URL\n…`}
              className={`${textareaCls} font-mono text-xs`}
            />
            <p className="text-xs text-muted-foreground/60">
              Full eligibility criteria rendered as Markdown on the challenge detail page.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prize_description" className="text-sm font-medium">
              Prize Description
            </label>
            <textarea
              id="prize_description"
              name="prize_description"
              rows={2}
              defaultValue={challenge.prize_description ?? ''}
              placeholder="e.g. $5,000 USDC — 1st: $3,000 · 2nd: $1,500 · 3rd: $500"
              className={textareaCls}
            />
            <p className="text-xs text-muted-foreground/60">
              Human-readable prize breakdown shown alongside the challenge.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border/20">
            <Button type="submit">Save Changes</Button>
            <Button asChild variant="ghost">
              <Link href="/partner/challenges">Cancel</Link>
            </Button>
          </div>
        </form>
      </GlowCard>
    </div>
  )
}
