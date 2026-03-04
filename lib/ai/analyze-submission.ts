import { getAnthropicClient } from './client'
import { buildAnalysisPrompt } from './prompts'
import type { Submission, Challenge, Partner } from '@/types/database'
import type { AIAnalysis } from '@/types/ai'

const ANALYSIS_TOOL = {
  name: 'submit_analysis' as const,
  description: 'Submit a structured analysis of the hackathon submission',
  input_schema: {
    type: 'object' as const,
    required: [
      'executive_summary', 'key_strengths', 'key_weaknesses', 'red_flags',
      'scores', 'challenge_fit', 'suggested_questions', 'confidence',
    ],
    properties: {
      confidence: {
        type: 'number',
        description: '0-1 confidence score based on how complete the submission information was',
      },
      executive_summary: {
        type: 'string',
        description: '2-3 sentence overview for judges',
      },
      key_strengths: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 specific strengths',
      },
      key_weaknesses: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 specific weaknesses or areas for improvement',
      },
      red_flags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Missing deliverables, vague descriptions, or concerns',
      },
      scores: {
        type: 'object',
        required: ['innovation', 'technical_depth', 'presentation_quality', 'completeness', 'moonpay_integration', 'overall'],
        properties: {
          innovation: { type: 'number', description: '0-100' },
          technical_depth: { type: 'number', description: '0-100' },
          presentation_quality: { type: 'number', description: '0-100' },
          completeness: { type: 'number', description: '0-100 — did they fill everything out?' },
          moonpay_integration: { type: 'number', description: '0-100 — depth of MoonPay Agent Stack usage' },
          overall: { type: 'number', description: '0-100 weighted average' },
        },
      },
      challenge_fit: {
        type: 'array',
        items: {
          type: 'object',
          required: ['challenge_id', 'challenge_title', 'fit_score', 'fit_reasoning', 'meets_requirements', 'missing_requirements'],
          properties: {
            challenge_id: { type: 'string' },
            challenge_title: { type: 'string' },
            fit_score: { type: 'number', description: '0-100' },
            fit_reasoning: { type: 'string' },
            meets_requirements: { type: 'boolean' },
            missing_requirements: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      suggested_questions: {
        type: 'array',
        items: { type: 'string' },
        description: '3 questions judges should ask the team',
      },
    },
  },
}

export async function analyzeSubmission(
  submission: Submission & { team_members?: Array<{ display_name: string; role_in_team: string | null }> },
  challenges: Array<Challenge & { partner: Partner | null }>
): Promise<AIAnalysis> {
  const client = getAnthropicClient()

  const prompt = buildAnalysisPrompt({ submission, challenges })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_analysis' },
    messages: [{ role: 'user', content: prompt }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool_use response from Claude')
  }

  const input = toolUse.input as Omit<AIAnalysis, 'analyzed_at' | 'model'>

  return {
    ...input,
    analyzed_at: new Date().toISOString(),
    model: 'claude-haiku-4-5-20251001',
  }
}
