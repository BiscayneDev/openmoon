import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/submit', '/submissions', '/profile']
// Routes that require admin role
const ADMIN_PATHS = ['/admin']
// Routes that require partner or admin role
const PARTNER_PATHS = ['/partner']

export async function proxy(request: NextRequest) {
  // Handle OAuth callback: redirect auth codes to /auth/callback
  const code = request.nextUrl.searchParams.get('code')
  if (code && request.nextUrl.pathname !== '/auth/callback') {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    return NextResponse.redirect(callbackUrl)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes
  const needsAuth = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  const needsAdmin = ADMIN_PATHS.some(p => pathname.startsWith(p))
  const needsPartner = PARTNER_PATHS.some(p => pathname.startsWith(p))

  // Admin password cookie bypasses Supabase auth for /admin/* routes
  const adminSession = request.cookies.get('admin_session')?.value
  const adminPassword = process.env.ADMIN_PASSWORD
  const hasAdminCookie = !!(adminPassword && adminSession === adminPassword)

  if ((needsAuth || needsPartner) && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (needsAdmin && !user && !hasAdminCookie) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // Role-based protection (Supabase users only — cookie holders get full admin access)
  if ((needsAdmin || needsPartner) && user && !hasAdminCookie) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'participant'

    if (needsAdmin && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (needsPartner && !['admin', 'partner'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
