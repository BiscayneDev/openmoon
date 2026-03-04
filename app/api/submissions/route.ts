import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import type { ApiResponse } from '@/types/api'
import type { Submission } from '@/types/database'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const cycleId = searchParams.get('cycle_id')
  const own = searchParams.get('own') === 'true'

  const { data: profile } = await db(supabase).from('users').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'judge'

  // Build query dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db(supabase).from('submissions').select(`
    *,
    submission_challenges (challenge_id),
    team_members (display_name, is_lead)
  `)
  if (own) q = q.eq('created_by', user.id)
  else if (!isAdmin) q = q.eq('is_public', true)
  if (cycleId) q = q.eq('cycle_id', cycleId)
  q = q.order('created_at', { ascending: false })

  const { data, error } = await q
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

  const body = await request.json()
  const {
    cycle_id, team_name, project_title, tagline, description,
    problem_statement, solution_description, tech_stack, moonpay_features,
    github_url, demo_url, demo_video_url, deck_url, additional_links,
    challenge_ids, team_members,
  } = body

  if (!cycle_id || !team_name || !project_title || !description || !challenge_ids?.length) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Missing required fields', code: 'VALIDATION_ERROR' } },
      { status: 400 }
    )
  }

  const admin = db(getSupabaseAdminClient())

  // Check cycle is active
  const { data: cycle } = await admin
    .from('mooncycles')
    .select('status, ends_at')
    .eq('id', cycle_id)
    .single()

  if (!cycle || cycle.status !== 'active' || new Date(cycle.ends_at) < new Date()) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Cycle is not accepting submissions', code: 'CYCLE_CLOSED' } },
      { status: 400 }
    )
  }

  // Create submission
  const { data: submission, error: subError } = await admin
    .from('submissions')
    .insert({
      cycle_id, team_name, project_title, tagline, description,
      problem_statement, solution_description,
      tech_stack: tech_stack ?? [],
      moonpay_features: moonpay_features ?? [],
      github_url, demo_url, demo_video_url, deck_url,
      additional_links: additional_links ?? [],
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single()

  if (subError || !submission) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: subError?.message ?? 'Failed to create submission', code: 'DB_ERROR' } },
      { status: 500 }
    )
  }

  // Link challenges
  if (challenge_ids?.length) {
    await admin.from('submission_challenges').insert(
      challenge_ids.map((challenge_id: string) => ({ submission_id: submission.id, challenge_id }))
    )
  }

  // Insert team members
  if (team_members?.length) {
    await admin.from('team_members').insert(
      team_members.map((m: { display_name: string; email?: string; wallet_address?: string; github_username?: string; role_in_team?: string; is_lead?: boolean }) => ({
        submission_id: submission.id,
        ...m,
      }))
    )
  }

  return NextResponse.json<ApiResponse<Submission>>(
    { data: submission, error: null },
    { status: 201 }
  )
}
