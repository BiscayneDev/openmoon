import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import type { Mooncycle, Partner } from '@/types/database'

export const metadata: Metadata = { title: 'New Challenge · Admin' }

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function createChallenge(formData: FormData) {
  'use server'

  const title = formData.get('title') as string
  const slug = (formData.get('slug') as string) || slugify(title)
  const cycle_id = formData.get('cycle_id') as string
  const partner_id_raw = formData.get('partner_id') as string
  const partner_id = partner_id_raw && partner_id_raw !== 'none' ? partner_id_raw : null
  const description = (formData.get('description') as string) || ''
  const requirements_md = (formData.get('requirements_md') as string) || null
  const judging_criteria_raw = (formData.get('judging_criteria') as string) || null
  const prize_amount_raw = formData.get('prize_amount') as string
  const prize_amount = prize_amount_raw ? Number(prize_amount_raw) : null
  const prize_currency = (formData.get('prize_currency') as string) || 'USDC'
  const prize_description = (formData.get('prize_description') as string) || null
  const max_winners = Number(formData.get('max_winners') || 3)
  const is_main_challenge = formData.get('is_main_challenge') === 'on'
  const sort_order = Number(formData.get('sort_order') || 0)

  let judging_criteria = null
  if (judging_criteria_raw) {
    try {
      judging_criteria = JSON.parse(judging_criteria_raw)
    } catch {
      judging_criteria = null
    }
  }

  const payload = {
    title,
    slug,
    cycle_id,
    partner_id,
    description,
    requirements_md,
    judging_criteria,
    prize_amount,
    prize_currency,
    prize_description,
    max_winners,
    is_main_challenge,
    sort_order,
    is_active: true,
  }

  const admin = db(getSupabaseAdminClient())
  const { error } = await admin.from('challenges').insert(payload).select().single()

  if (error) {
    throw new Error(error.message)
  }

  redirect('/admin/challenges')
}

async function getFormData(): Promise<{ cycles: Mooncycle[]; partners: Partner[] }> {
  const supabase = await getSupabaseServerClient()
  const [cyclesRes, partnersRes] = await Promise.all([
    db(supabase)
      .from('mooncycles')
      .select('id, title, slug, status')
      .order('starts_at', { ascending: false }),
    db(supabase)
      .from('partners')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])
  return {
    cycles: (cyclesRes.data as Mooncycle[]) ?? [],
    partners: (partnersRes.data as Partner[]) ?? [],
  }
}

export default async function NewChallengePage() {
  const { cycles, partners } = await getFormData()

  const inputCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors'
  const selectCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors'
  const textareaCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-y'

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="waxing-crescent" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">New Challenge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add a challenge to a mooncycle</p>
        </div>
      </div>

      <GlowCard glow="none" className="border-border/30 max-w-3xl">
        <form action={createChallenge} className="space-y-6">
          {/* Cycle + Partner */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="cycle_id" className="text-sm font-medium">
                Mooncycle <span className="text-destructive">*</span>
              </label>
              <select id="cycle_id" name="cycle_id" required className={selectCls}>
                <option value="">Select a cycle…</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partner_id" className="text-sm font-medium">
                Partner
              </label>
              <select id="partner_id" name="partner_id" defaultValue="none" className={selectCls}>
                <option value="none">None / Main Challenge</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title + Slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Best DeFi Integration"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                placeholder="best-defi-integration (auto-generated)"
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="A short description of this challenge…"
              className={textareaCls}
            />
          </div>

          {/* Requirements */}
          <div className="space-y-1.5">
            <label htmlFor="requirements_md" className="text-sm font-medium">
              Requirements{' '}
              <span className="text-muted-foreground font-normal">(Markdown)</span>
            </label>
            <textarea
              id="requirements_md"
              name="requirements_md"
              rows={5}
              placeholder="## Requirements&#10;&#10;- Must use MoonPay SDK&#10;…"
              className={`${textareaCls} font-mono`}
            />
          </div>

          {/* Judging Criteria */}
          <div className="space-y-1.5">
            <label htmlFor="judging_criteria" className="text-sm font-medium">
              Judging Criteria{' '}
              <span className="text-muted-foreground font-normal">(JSON)</span>
            </label>
            <textarea
              id="judging_criteria"
              name="judging_criteria"
              rows={5}
              placeholder={`[{"name":"Innovation","weight":0.4,"description":"How novel is the idea?"},{"name":"Execution","weight":0.6,"description":"Quality of implementation"}]`}
              className={`${textareaCls} font-mono text-xs`}
            />
          </div>

          {/* Prize */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prize_amount" className="text-sm font-medium">
                Prize Amount
              </label>
              <input
                id="prize_amount"
                name="prize_amount"
                type="number"
                min={0}
                step={100}
                placeholder="5000"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="prize_currency" className="text-sm font-medium">
                Currency
              </label>
              <select
                id="prize_currency"
                name="prize_currency"
                defaultValue="USDC"
                className={selectCls}
              >
                <option value="USDC">USDC</option>
                <option value="USD">USD</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="max_winners" className="text-sm font-medium">
                Max Winners
              </label>
              <input
                id="max_winners"
                name="max_winners"
                type="number"
                min={1}
                defaultValue={3}
                className={inputCls}
              />
            </div>
          </div>

          {/* Prize Description */}
          <div className="space-y-1.5">
            <label htmlFor="prize_description" className="text-sm font-medium">
              Prize Description
            </label>
            <textarea
              id="prize_description"
              name="prize_description"
              rows={2}
              placeholder="e.g. $5,000 USDC split across top 3 teams"
              className={textareaCls}
            />
          </div>

          {/* Sort Order + Flags */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="sort_order" className="text-sm font-medium">
                Sort Order
              </label>
              <input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={0}
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                id="is_main_challenge"
                name="is_main_challenge"
                type="checkbox"
                className="h-4 w-4 rounded border-border/50 bg-background/50 accent-primary"
              />
              <label htmlFor="is_main_challenge" className="text-sm font-medium cursor-pointer">
                Main Challenge
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/20">
            <Button type="submit">Create Challenge</Button>
            <Button asChild variant="ghost">
              <Link href="/admin/challenges">Cancel</Link>
            </Button>
          </div>
        </form>
      </GlowCard>
    </div>
  )
}
