// Types matching the Supabase schema

export type CycleStatus = 'draft' | 'upcoming' | 'active' | 'judging' | 'ended'
export type SubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'scored' | 'winner' | 'disqualified'
export type UserRole = 'participant' | 'partner' | 'judge' | 'admin'
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PrizeCurrency = 'USDC' | 'USD' | 'ETH' | 'SOL' | 'custom'

export interface User {
  id: string
  email: string | null
  github_username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  wallet_address: string | null
  role: UserRole
  partner_id: string | null
  is_active: boolean
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export const MOONPAY_FEATURES = [
  'MoonPay Agents CLI',
  'MoonPay On-Ramp',
  'MoonPay Off-Ramp',
  'MoonPay Swap',
  'MoonPay Transfers',
  'MoonPay DCA',
  'MoonPay Limit Orders',
  'MCP Integration',
  'x402 Protocol',
] as const

export type MoonPayFeature = typeof MOONPAY_FEATURES[number]

export interface Partner {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website_url: string | null
  description: string | null
  contact_email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Mooncycle {
  id: string
  slug: string
  title: string
  description: string | null
  theme: string | null
  status: CycleStatus
  starts_at: string
  ends_at: string
  judging_ends_at: string | null
  announcement_at: string | null
  main_prize_usdc: number
  total_prize_pool: number
  banner_url: string | null
  rules_md: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface JudgingCriterion {
  name: string
  weight: number
  description: string
}

export interface Challenge {
  id: string
  cycle_id: string
  partner_id: string | null
  title: string
  slug: string
  description: string
  requirements_md: string | null
  judging_criteria: JudgingCriterion[] | null
  prize_amount: number | null
  prize_currency: PrizeCurrency
  prize_description: string | null
  max_winners: number
  is_main_challenge: boolean
  is_active: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AdditionalLink {
  label: string
  url: string
}

export interface Submission {
  id: string
  cycle_id: string
  team_name: string
  project_title: string
  tagline: string | null
  description: string
  problem_statement: string | null
  solution_description: string | null
  tech_stack: string[] | null
  moonpay_features: string[] | null
  github_url: string | null
  demo_url: string | null
  demo_video_url: string | null
  deck_url: string | null
  additional_links: AdditionalLink[] | null
  status: SubmissionStatus
  submitted_at: string | null
  analysis_status: AnalysisStatus
  ai_analysis: import('./ai').AIAnalysis | null
  final_score: number | null
  judge_notes: string | null
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface SubmissionChallenge {
  id: string
  submission_id: string
  challenge_id: string
  created_at: string
}

export interface TeamMember {
  id: string
  submission_id: string
  user_id: string | null
  display_name: string
  email: string | null
  wallet_address: string | null
  github_username: string | null
  role_in_team: string | null
  is_lead: boolean
  created_at: string
}

export interface Judge {
  id: string
  user_id: string
  cycle_id: string
  is_active: boolean
  assigned_at: string
}

export interface Score {
  id: string
  submission_id: string
  challenge_id: string
  judge_id: string
  criteria_scores: Record<string, number>
  overall_score: number
  feedback: string | null
  is_final: boolean
  scored_at: string
  updated_at: string
}

export interface Winner {
  id: string
  cycle_id: string
  challenge_id: string
  submission_id: string
  place: number
  prize_amount: number | null
  prize_currency: PrizeCurrency | null
  prize_notes: string | null
  announced_at: string | null
  created_by: string | null
  created_at: string
}

// ---- Enriched types (with joins) ----

export interface ChallengeWithPartner extends Challenge {
  partner: Partner | null
}

export interface MooncycleWithChallenges extends Mooncycle {
  challenges: ChallengeWithPartner[]
}

export interface SubmissionWithDetails extends Submission {
  challenges: ChallengeWithPartner[]
  team_members: TeamMember[]
  created_by_user?: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'wallet_address'>
}

export interface WinnerWithDetails extends Winner {
  submission: Pick<Submission, 'id' | 'project_title' | 'team_name' | 'tagline' | 'demo_url'>
  challenge: Pick<Challenge, 'id' | 'title' | 'prize_amount' | 'prize_currency'>
}
