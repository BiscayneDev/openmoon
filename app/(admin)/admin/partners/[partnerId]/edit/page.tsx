import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/types'
import type { Metadata } from 'next'
import type { Partner } from '@/types/database'

export const metadata: Metadata = { title: 'Edit Partner · Admin' }

async function getPartner(partnerId: string): Promise<Partner | null> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await db(supabase)
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .single()

  if (error || !data) return null
  return data as Partner
}

async function updatePartner(partnerId: string, formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const logo_url = (formData.get('logo_url') as string) || null
  const website_url = (formData.get('website_url') as string) || null
  const description = (formData.get('description') as string) || null
  const contact_email = (formData.get('contact_email') as string) || null
  const is_active = formData.get('is_active') === 'on'

  const payload = {
    name,
    slug,
    logo_url,
    website_url,
    description,
    contact_email,
    is_active,
  }

  const admin = db(getSupabaseAdminClient())
  const { error } = await admin
    .from('partners')
    .update(payload)
    .eq('id', partnerId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  redirect('/admin/partners')
}

async function deletePartner(partnerId: string) {
  'use server'

  const admin = db(getSupabaseAdminClient())
  const { error } = await admin.from('partners').delete().eq('id', partnerId)

  if (error) {
    throw new Error(error.message)
  }

  redirect('/admin/partners')
}

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ partnerId: string }>
}) {
  const { partnerId } = await params
  const partner = await getPartner(partnerId)

  if (!partner) notFound()

  const updateWithId = updatePartner.bind(null, partnerId)
  const deleteWithId = deletePartner.bind(null, partnerId)

  const inputCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors'
  const textareaCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-none'

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="waning-gibbous" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">Edit Partner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{partner.name}</p>
        </div>
      </div>

      <GlowCard glow="none" className="border-border/30 max-w-2xl">
        <form action={updateWithId} className="space-y-6">
          {/* Name + Slug */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={partner.name}
                placeholder="Acme Corp"
                className={inputCls}
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
                defaultValue={partner.slug}
                placeholder="acme-corp"
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <label htmlFor="logo_url" className="text-sm font-medium">
              Logo URL
            </label>
            <input
              id="logo_url"
              name="logo_url"
              type="url"
              defaultValue={partner.logo_url ?? ''}
              placeholder="https://example.com/logo.png"
              className={inputCls}
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label htmlFor="website_url" className="text-sm font-medium">
              Website URL
            </label>
            <input
              id="website_url"
              name="website_url"
              type="url"
              defaultValue={partner.website_url ?? ''}
              placeholder="https://example.com"
              className={inputCls}
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
              defaultValue={partner.description ?? ''}
              placeholder="Brief description of the partner organisation…"
              className={textareaCls}
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-1.5">
            <label htmlFor="contact_email" className="text-sm font-medium">
              Contact Email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={partner.contact_email ?? ''}
              placeholder="contact@example.com"
              className={inputCls}
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked={partner.is_active}
              className="h-4 w-4 rounded border-border/50 bg-background/50 accent-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
              Active
            </label>
            <span className="text-xs text-muted-foreground">
              Inactive partners are hidden from public listings
            </span>
          </div>

          {/* Save + Cancel */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/20">
            <Button type="submit">Save Changes</Button>
            <Button asChild variant="ghost">
              <Link href="/admin/partners">Cancel</Link>
            </Button>
          </div>
        </form>

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-destructive/20">
          <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Deleting a partner is permanent. All challenges associated with this partner will lose
            their partner reference. Consider deactivating instead.
          </p>
          <form action={deleteWithId}>
            <Button type="submit" variant="destructive" size="sm">
              Delete Partner
            </Button>
          </form>
        </div>
      </GlowCard>
    </div>
  )
}
