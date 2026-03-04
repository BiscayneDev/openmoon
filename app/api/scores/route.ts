import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/types'

interface ScoreBody {
  submission_id: string
  challenge_id: string
  criteria_scores: Record<string, number>
  overall_score: number
  feedback?: string | null
  is_final?: boolean
}

export async function POST(request: NextRequest) {
  // Authenticate
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check the user is a judge or admin
  const { data: userRecord, error: userError } = await db(supabase)
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userRecord) {
    return NextResponse.json({ error: 'User record not found' }, { status: 403 })
  }

  if (userRecord.role !== 'judge' && userRecord.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: only judges and admins can submit scores' },
      { status: 403 }
    )
  }

  // Parse body
  let body: ScoreBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    submission_id,
    challenge_id,
    criteria_scores,
    overall_score,
    feedback,
    is_final,
  } = body

  // Validate required fields
  if (!submission_id || !challenge_id) {
    return NextResponse.json(
      { error: 'submission_id and challenge_id are required' },
      { status: 400 }
    )
  }
  if (typeof overall_score !== 'number' || overall_score < 1 || overall_score > 100) {
    return NextResponse.json(
      { error: 'overall_score must be a number between 1 and 100' },
      { status: 400 }
    )
  }
  if (typeof criteria_scores !== 'object' || criteria_scores === null) {
    return NextResponse.json({ error: 'criteria_scores must be an object' }, { status: 400 })
  }

  // Validate criteria score values (1-10)
  for (const [key, val] of Object.entries(criteria_scores)) {
    if (typeof val !== 'number' || val < 1 || val > 10) {
      return NextResponse.json(
        { error: `Criterion "${key}" must be between 1 and 10` },
        { status: 400 }
      )
    }
  }

  // Verify the submission exists
  const { data: submission, error: subError } = await db(supabase)
    .from('submissions')
    .select('id, status')
    .eq('id', submission_id)
    .single()

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Verify the challenge exists and belongs to the same cycle
  const { data: challenge, error: challengeError } = await db(supabase)
    .from('challenges')
    .select('id, cycle_id')
    .eq('id', challenge_id)
    .single()

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  // Upsert score using admin client (bypass RLS)
  const admin = db(getSupabaseAdminClient())

  const now = new Date().toISOString()

  const scorePayload = {
    submission_id,
    challenge_id,
    judge_id: user.id,
    criteria_scores,
    overall_score,
    feedback: feedback ?? null,
    is_final: is_final ?? false,
    scored_at: now,
    updated_at: now,
  }

  const { data: existingScore } = await admin
    .from('scores')
    .select('id')
    .eq('submission_id', submission_id)
    .eq('challenge_id', challenge_id)
    .eq('judge_id', user.id)
    .maybeSingle()

  let result
  if (existingScore?.id) {
    // Update existing score
    const { data, error } = await admin
      .from('scores')
      .update({
        criteria_scores,
        overall_score,
        feedback: feedback ?? null,
        is_final: is_final ?? false,
        updated_at: now,
      })
      .eq('id', existingScore.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = data
  } else {
    // Insert new score
    const { data, error } = await admin
      .from('scores')
      .insert(scorePayload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = data
  }

  return NextResponse.json({ score: result }, { status: 200 })
}
