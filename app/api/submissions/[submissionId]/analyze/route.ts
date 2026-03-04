import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/types'
import { analyzeSubmission } from '@/lib/ai/analyze-submission'
import type { ApiResponse } from '@/types/api'
import type { AIAnalysis } from '@/types/ai'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params

  try {
    // Auth check — must be authenticated
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const admin = db(getSupabaseAdminClient())

    // Set status to processing
    await admin
      .from('submissions')
      .update({ analysis_status: 'processing' })
      .eq('id', submissionId)

    // Fetch submission + team members + challenges
    const { data: submission, error: subError } = await admin
      .from('submissions')
      .select(`
        *,
        team_members (display_name, role_in_team),
        submission_challenges (
          challenges (
            *,
            partners (*)
          )
        )
      `)
      .eq('id', submissionId)
      .single()

    if (subError || !submission) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { message: 'Submission not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    // Extract challenges from the join
    const challenges = submission.submission_challenges
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((sc: any) => sc.challenges)
      .filter(Boolean)

    // Run analysis
    const analysis: AIAnalysis = await analyzeSubmission(submission, challenges)

    // Persist result
    await admin
      .from('submissions')
      .update({
        ai_analysis: analysis,
        analysis_status: 'completed',
      })
      .eq('id', submissionId)

    return NextResponse.json<ApiResponse<AIAnalysis>>({ data: analysis, error: null })
  } catch (err) {
    console.error('[analyze-submission]', err)

    // Mark as failed
    const admin = db(getSupabaseAdminClient())
    await admin
      .from('submissions')
      .update({
        analysis_status: 'failed',
        ai_analysis: { error: String(err), analyzed_at: new Date().toISOString() },
      })
      .eq('id', submissionId)

    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { message: 'Analysis failed', code: 'ANALYSIS_FAILED' } },
      { status: 500 }
    )
  }
}
