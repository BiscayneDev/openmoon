export interface AIAnalysisScores {
  innovation: number
  technical_depth: number
  presentation_quality: number
  completeness: number
  overall: number
}

export interface AIChallengeFit {
  challenge_id: string
  challenge_title: string
  fit_score: number
  fit_reasoning: string
  meets_requirements: boolean
  missing_requirements: string[]
}

export interface AIAnalysis {
  analyzed_at: string
  model: string
  confidence: number
  executive_summary: string
  key_strengths: string[]
  key_weaknesses: string[]
  red_flags: string[]
  scores: AIAnalysisScores
  challenge_fit: AIChallengeFit[]
  suggested_questions: string[]
}
