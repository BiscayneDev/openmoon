import { GlowCard } from '@/components/cosmic/GlowCard'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Onboard Partner · Admin' }

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function createPartner(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const slug = (formData.get('slug') as string) || slugify(name)
  const logo_url = (formData.get('logo_url') as string) || null
  const website_url = (formData.get('website_url') as string) || null
  const description = (formData.get('description') as string) || null
  const contact_email = (formData.get('contact_email') as string) || null
  const is_active = formData.get('is_active') !== 'off'

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
  const { error } = await admin.from('partners').insert(payload).select().single()

  if (error) {
    throw new Error(error.message)
  }

  redirect('/admin/partners')
}

export default function NewPartnerPage() {
  const inputCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors'
  const textareaCls =
    'w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-none'

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <MoonPhaseIcon phase="waxing-crescent" size="sm" glow />
        <div>
          <h1 className="text-2xl font-bold">Onboard Partner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add a new partner organisation</p>
        </div>
      </div>

      <GlowCard glow="none" className="border-border/30 max-w-2xl">
        <form action={createPartner} className="space-y-6">
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
                placeholder="Acme Corp"
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
                placeholder="acme-corp (auto-generated)"
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
              defaultChecked
              className="h-4 w-4 rounded border-border/50 bg-background/50 accent-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
              Active
            </label>
            <span className="text-xs text-muted-foreground">
              Inactive partners are hidden from public listings
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/20">
            <Button type="submit">Onboard Partner</Button>
            <Button asChild variant="ghost">
              <Link href="/admin/partners">Cancel</Link>
            </Button>
          </div>
        </form>
      </GlowCard>
    </div>
  )
}
