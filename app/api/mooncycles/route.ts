import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { ApiResponse } from '@/types/api'
import type { Mooncycle } from '@/types/database'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const includeAll = searchParams.get('all') === 'true'

  const baseQuery = db(supabase).from('mooncycles').select(`*, challenges(count)`).order('starts_at', { ascending: false })
  const { data, error } = await (includeAll ? baseQuery : baseQuery.neq('status', 'draft'))
  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: error.message, code: 'DB_ERROR' } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<typeof data>>({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }

  const { data: profile } = await db(supabase).from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
      { status: 403 }
    )
  }

  const body = await request.json()
  const admin = db(getSupabaseAdminClient())

  const { data, error } = await admin
    .from('mooncycles')
    .insert({ ...body, created_by: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: error.message, code: 'DB_ERROR' } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<Mooncycle>>({ data, error: null }, { status: 201 })
}
