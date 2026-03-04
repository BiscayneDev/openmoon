import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import type { Mooncycle } from '@/types/database'

export const metadata: Metadata = { title: 'Edit Mooncycle · Admin' }

// Strip seconds so datetime-local inputs work correctly
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

async function getMooncycle(cycleId: string): Promise<Mooncycle | null> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await db(supabase)
    .from('mooncycles')
    .select('*')
    .eq('id', cycleId)
    .single()

  if (error || !data) return null
  return data as Mooncycle
}

async function updateMooncycle(cycleId: string, formData: FormData) {
  'use server'

  const title = formData.get('title') as string
  const slug = formData.get('slug') as string
  const description = (formData.get('description') as string) || null
  const theme = (formData.get('theme') as string) || null
  const status = formData.get('status') as string
  const starts_at = formData.get('starts_at') as string
  const ends_at = formData.get('ends_at') as string
  const judging_ends_at = (formData.get('judging_ends_at') as string) || null
  const main_prize_usdc = Number(formData.get('main_prize_usdc') || 0)
  const total_prize_pool = Number(formData.get('total_prize_pool') || 0)
  const rules_md = (formData.get('rules_md') as string) || null

  const payload = {
    title,
    slug,
    description,
    theme,
    status,
    starts_at,
    ends_at,
    judging_ends_at: judging_ends_at || null,
    main_prize_usdc,
    total_prize_pool,
    rules_md,
  }

  const admin = db(getSupabaseAdminClient())
  const { error } = await admin
    .from('mooncycles')
    .update(payload)
    .eq('id', cycleId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  redirect('/admin/mooncycles')
}

async function deleteMooncycle(cycleId: string) {
  'use server'

  const admin = db(getSupabaseAdminClient())
  const { error } = await admin.from('mooncycles').delete().eq('id', cycleId)

  if (error) {
    throw new Error(error.message)
  }

  redirect('/admin/mooncycles')
}

export default async function EditMooncyclePage({
  params,
}: {
  params: Promise<{ cycleId: string }>
}) {
  const { cycleId } = await params
  const cycle = await getMooncycle(cycleId)

  if (!cycle) notFound()

  const updateWithId = updateMooncycle.bind(null, cycleId)
  const deleteWithId = deleteMooncycle.bind(null, cycleId)

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="waning-gibbous" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">Edit Mooncycle</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{cycle.title}</p>
        </div>
      </div>

      <GlowCard glow="none" className="border-border/30 max-w-3xl">
        <form action={updateWithId} className="space-y-6">
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
                defaultValue={cycle.title}
                placeholder="Mooncycle #1"
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug <span className="text-destructive">*</span>
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                defaultValue={cycle.slug}
                placeholder="mooncycle-1"
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors font-mono"
              />
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-1.5">
            <label htmlFor="theme" className="text-sm font-medium">
              Theme
            </label>
            <input
              id="theme"
              name="theme"
              type="text"
              defaultValue={cycle.theme ?? ''}
              placeholder="e.g. AI Agents & DeFi"
              className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
            />
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
              defaultValue={cycle.description ?? ''}
              placeholder="A brief description of this mooncycle..."
              className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-none"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={cycle.status}
              className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
            >
              <option value="draft">Draft</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="judging">Judging</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="starts_at" className="text-sm font-medium">
                Starts At
              </label>
              <input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                defaultValue={toDatetimeLocal(cycle.starts_at)}
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ends_at" className="text-sm font-medium">
                Ends At
              </label>
              <input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                defaultValue={toDatetimeLocal(cycle.ends_at)}
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="judging_ends_at" className="text-sm font-medium">
                Judging Ends At
              </label>
              <input
                id="judging_ends_at"
                name="judging_ends_at"
                type="datetime-local"
                defaultValue={toDatetimeLocal(cycle.judging_ends_at)}
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
              />
            </div>
          </div>

          {/* Prize amounts */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="main_prize_usdc" className="text-sm font-medium">
                Main Prize (USDC)
              </label>
              <input
                id="main_prize_usdc"
                name="main_prize_usdc"
                type="number"
                min={0}
                step={100}
                defaultValue={cycle.main_prize_usdc}
                placeholder="10000"
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="total_prize_pool" className="text-sm font-medium">
                Total Prize Pool (USDC)
              </label>
              <input
                id="total_prize_pool"
                name="total_prize_pool"
                type="number"
                min={0}
                step={100}
                defaultValue={cycle.total_prize_pool}
                placeholder="50000"
                className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors"
              />
            </div>
          </div>

          {/* Rules markdown */}
          <div className="space-y-1.5">
            <label htmlFor="rules_md" className="text-sm font-medium">
              Rules{' '}
              <span className="text-muted-foreground font-normal">(Markdown)</span>
            </label>
            <textarea
              id="rules_md"
              name="rules_md"
              rows={8}
              defaultValue={cycle.rules_md ?? ''}
              placeholder="# Rules&#10;&#10;## Eligibility&#10;..."
              className="w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-y"
            />
          </div>

          {/* Save + Cancel */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/20">
            <Button type="submit">Save Changes</Button>
            <Button asChild variant="ghost">
              <Link href="/admin/mooncycles">Cancel</Link>
            </Button>
          </div>
        </form>

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-destructive/20">
          <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Deleting a mooncycle is permanent and cannot be undone. All associated challenges and
            submissions will become orphaned.
          </p>
          <form action={deleteWithId}>
            <Button type="submit" variant="destructive" size="sm">
              Delete Mooncycle
            </Button>
          </form>
        </div>
      </GlowCard>
    </div>
  )
}
