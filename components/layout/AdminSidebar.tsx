'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoonPhaseIcon } from '@/components/cosmic/MoonPhaseIcon'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard, Moon, Puzzle, Users, FileText, Star, Trophy, BarChart3
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/mooncycles', label: 'Mooncycles', icon: Moon },
  { href: '/admin/challenges', label: 'Challenges', icon: Puzzle },
  { href: '/admin/partners', label: 'Partners', icon: Star },
  { href: '/admin/submissions', label: 'Submissions', icon: FileText },
  { href: '/admin/judging', label: 'Judging', icon: BarChart3 },
  { href: '/admin/winners', label: 'Winners', icon: Trophy },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 h-screen w-56 shrink-0 border-r border-border/50 flex flex-col glass">
      <div className="p-4 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <MoonPhaseIcon phase="waxing-gibbous" size="sm" glow />
          <span className="font-bold text-sm gradient-text-moon">OpenMoon</span>
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">Admin Portal</div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border/50">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to dashboard
        </Link>
      </div>
    </aside>
  )
}
