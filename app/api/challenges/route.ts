import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { ApiResponse } from '@/types/api'
import type { Challenge } from '@/types/database'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const cycle_id = searchParams.get('cycle_id')

  let query = db(supabase)
    .from('challenges')
    .select(`*, partners (id, name, slug, logo_url)`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (cycle_id) {
    query = query.eq('cycle_id', cycle_id)
  }

  const { data, error } = await query

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
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
      { status: 403 }
    )
  }

  const body = await request.json()
  const admin = db(getSupabaseAdminClient())

  const { data, error } = await admin
    .from('challenges')
    .insert({ ...body, created_by: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: error.message, code: 'DB_ERROR' } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<Challenge>>({ data, error: null }, { status: 201 })
}
