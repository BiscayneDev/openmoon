import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { ApiResponse } from '@/types/api'
import type { Partner } from '@/types/database'

export async function GET(_request: Request) {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await db(supabase)
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

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
    .from('partners')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: error.message, code: 'DB_ERROR' } },
      { status: 500 }
    )
  }

  return NextResponse.json<ApiResponse<Partner>>({ data, error: null }, { status: 201 })
}
