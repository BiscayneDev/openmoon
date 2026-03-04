import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Check simple password cookie first (fast path — no Supabase needed)
  const cookieStore = await cookies()
  const adminSession = cookieStore.get('admin_session')?.value
  const adminPassword = process.env.ADMIN_PASSWORD

  const hasPasswordAccess = adminPassword && adminSession === adminPassword

  if (!hasPasswordAccess) {
    // Fall back to Supabase role check
    try {
      const supabase = await getSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) redirect('/admin-login')

      const { data: profile } = await db(supabase).from('users').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') redirect('/admin-login')
    } catch {
      redirect('/admin-login')
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
