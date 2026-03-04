export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code: string } }

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface CreateMooncycleBody {
  slug: string
  title: string
  description?: string
  theme?: string
  starts_at: string
  ends_at: string
  judging_ends_at?: string
  main_prize_usdc: number
  total_prize_pool: number
  banner_url?: string
  rules_md?: string
}

export interface CreateChallengeBody {
  cycle_id: string
  partner_id?: string
  title: string
  slug: string
  description: string
  requirements_md?: string
  judging_criteria?: Array<{ name: string; weight: number; description: string }>
  prize_amount?: number
  prize_currency?: string
  prize_description?: string
  max_winners?: number
  is_main_challenge?: boolean
  sort_order?: number
}

export interface CreatePartnerBody {
  name: string
  slug: string
  logo_url?: string
  website_url?: string
  description?: string
  contact_email?: string
}

export interface CreateSubmissionBody {
  cycle_id: string
  team_name: string
  project_title: string
  tagline?: string
  description: string
  problem_statement?: string
  solution_description?: string
  tech_stack?: string[]
  github_url?: string
  demo_url?: string
  demo_video_url?: string
  deck_url?: string
  additional_links?: Array<{ label: string; url: string }>
  challenge_ids: string[]
  team_members: Array<{
    display_name: string
    email?: string
    wallet_address?: string
    github_username?: string
    role_in_team?: string
    is_lead?: boolean
  }>
}

export interface CreateScoreBody {
  submission_id: string
  challenge_id: string
  criteria_scores: Record<string, number>
  overall_score: number
  feedback?: string
  is_final?: boolean
}

export interface DeclareWinnerBody {
  cycle_id: string
  challenge_id: string
  submission_id: string
  place: number
  prize_amount?: number
  prize_currency?: string
  prize_notes?: string
}
