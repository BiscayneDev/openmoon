import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { ApiResponse } from '@/types/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const { partnerId } = await params
  const supabase = await getSupabaseServerClient()

  const { data, error } = await db(supabase)
    .from('partners')
    .select('*')
    .eq('id', partnerId)
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
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const { partnerId } = await params
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }

  const { data: profile } = await db(supabase)
    .from('users')
    .select('role, partner_id')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = profile?.role === 'partner' && profile?.partner_id === partnerId

  if (!isAdmin && !isOwner) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
      { status: 403 }
    )
  }

  const body = await request.json()

  const { data, error } = await db(getSupabaseAdminClient())
    .from('partners')
    .update(body)
    .eq('id', partnerId)
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: error.message, code: 'DB_ERROR' } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<typeof data>>({ data, error: null })
}
