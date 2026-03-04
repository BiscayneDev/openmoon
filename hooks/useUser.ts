'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session, AuthResponse } from '@supabase/supabase-js'
import type { User as DbUser } from '@/types/database'

interface UseUserReturn {
  authUser: User | null
  dbUser: DbUser | null
  isLoading: boolean
  isAuthenticated: boolean
  refresh: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [dbUser, setDbUser] = useState<DbUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function fetchDbUser(userId: string) {
    const supabase = getSupabaseBrowserClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setDbUser((data as DbUser) ?? null)
  }

  async function refresh() {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    setAuthUser(user)
    if (user) await fetchDbUser(user.id)
    else setDbUser(null)
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    void supabase.auth.getUser().then((result: AuthResponse) => {
      const u = result.data.user
      setAuthUser(u)
      if (u) {
        void fetchDbUser(u.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const user = session?.user ?? null
      setAuthUser(user)
      if (user) fetchDbUser(user.id)
      else setDbUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    authUser,
    dbUser,
    isLoading,
    isAuthenticated: !!authUser,
    refresh,
  }
}
