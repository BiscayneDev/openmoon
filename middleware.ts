import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { proxy } from './proxy'

export async function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl

  // If there's an auth code in the URL and we're NOT already on /auth/callback,
  // redirect to the callback route so the code gets exchanged for a session
  const code = searchParams.get('code')
  if (code && pathname !== '/auth/callback') {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    return NextResponse.redirect(callbackUrl)
  }

  // Run auth/role protection
  return proxy(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
