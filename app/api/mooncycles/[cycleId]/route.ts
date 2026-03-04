import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { ApiResponse } from '@/types/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const { cycleId } = await params
  const supabase = await getSupabaseServerClient()

  const { data, error } = await db(supabase)
    .from('mooncycles')
    .select(`
      *,
      challenges (
        *,
        partners (id, name, slug, logo_url, website_url)
      )
    `)
    .eq('id', cycleId)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Not found', code: 'NOT_FOUND' } },
      { status: 404 }
    )
  }

  return NextResponse.json<ApiResponse<typeof data>>({ data, error: null })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const { cycleId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, { status: 401 })

  const { data: profile } = await db(supabase).from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } }, { status: 403 })

  const body = await request.json()
  const { data, error } = await db(getSupabaseAdminClient()).from('mooncycles').update(body).eq('id', cycleId).select().single()

  if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
