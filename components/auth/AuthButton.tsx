'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrbitLoader } from '@/components/cosmic/OrbitLoader'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { LogOut, User, LayoutDashboard } from 'lucide-react'

export function AuthButton() {
  const { authUser, dbUser, isLoading } = useUser()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const router = useRouter()

  async function signInWithGitHub() {
    setIsSigningIn(true)
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (isLoading) {
    return <OrbitLoader size="sm" />
  }

  if (!authUser) {
    return (
      <Button
        onClick={signInWithGitHub}
        disabled={isSigningIn}
        className="bg-white text-black border-0 font-semibold hover:bg-white/90 transition-colors rounded-full px-4"
        size="sm"
      >
        {isSigningIn ? <OrbitLoader size="sm" className="mr-2" /> : null}
        Sign In
      </Button>
    )
  }

  const initials = (dbUser?.display_name ?? authUser.email ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-8 border border-border">
            <AvatarImage src={dbUser?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
          {dbUser?.display_name ?? authUser.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard')}>
          <LayoutDashboard className="mr-2 size-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
