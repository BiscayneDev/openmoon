import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?returnTo=/dashboard')

  return (
    <div className="min-h-screen bg-black">
      <main className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
