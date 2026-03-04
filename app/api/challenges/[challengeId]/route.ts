import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { ApiResponse } from '@/types/api'

// Fields a partner is permitted to edit on their own challenge
const PARTNER_EDITABLE_FIELDS = ['description', 'requirements_md', 'prize_description'] as const
type PartnerEditableField = (typeof PARTNER_EDITABLE_FIELDS)[number]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params
  const supabase = await getSupabaseServerClient()

  const { data, error } = await db(supabase)
    .from('challenges')
    .select(`*, partners (id, name, slug, logo_url, website_url)`)
    .eq('id', challengeId)
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
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params
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
  const isPartner = profile?.role === 'partner'

  if (!isAdmin && !isPartner) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
      { status: 403 }
    )
  }

  // Fetch the challenge to verify partner ownership
  const { data: existing } = await db(supabase)
    .from('challenges')
    .select('id, partner_id')
    .eq('id', challengeId)
    .single()

  if (!existing) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Not found', code: 'NOT_FOUND' } },
      { status: 404 }
    )
  }

  if (isPartner && existing.partner_id !== profile?.partner_id) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
      { status: 403 }
    )
  }

  const body = await request.json()
  let updatePayload: Record<string, unknown>

  if (isAdmin) {
    updatePayload = body
  } else {
    // Partners may only edit the allowed subset of fields
    updatePayload = {}
    for (const field of PARTNER_EDITABLE_FIELDS) {
      if (field in body) {
        updatePayload[field as PartnerEditableField] = body[field]
      }
    }
  }

  const { data, error } = await db(getSupabaseAdminClient())
    .from('challenges')
    .update(updatePayload)
    .eq('id', challengeId)
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
