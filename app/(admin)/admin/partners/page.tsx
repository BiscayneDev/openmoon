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
import type { Partner } from '@/types/database'

export const metadata: Metadata = { title: 'Partners · Admin' }

async function getPartners(): Promise<Partner[]> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await db(supabase)
    .from('partners')
    .select('*')
    .order('name', { ascending: true })

  if (error) return []
  return (data as Partner[]) ?? []
}

export default async function AdminPartnersPage() {
  const partners = await getPartners()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MoonPhaseIcon phase="full" size="sm" glow />
          <div>
            <h1 className="text-2xl font-bold">Partners</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {partners.length} partner org{partners.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/partners/new">+ Onboard Partner</Link>
        </Button>
      </div>

      <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
        {partners.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MoonPhaseIcon phase="new" size="md" className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No partners onboarded yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
              Onboard a partner org to start creating partner challenges.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/partners/new">Onboard the first partner</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id} className="border-border/20 hover:bg-white/[0.02]">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      {partner.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={partner.logo_url}
                          alt={partner.name}
                          className="h-7 w-7 rounded-full object-cover ring-1 ring-border/30 shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted/30 border border-border/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">
                            {partner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{partner.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {partner.slug}
                  </TableCell>
                  <TableCell className="text-sm">
                    {partner.website_url ? (
                      <a
                        href={partner.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary/80 hover:text-primary transition-colors truncate max-w-[180px] block"
                      >
                        {partner.website_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {partner.contact_email ?? <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell>
                    {partner.is_active ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted/40 text-muted-foreground border border-border/40">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/partners/${partner.id}/edit`}>Edit</Link>
                    </Button>
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
