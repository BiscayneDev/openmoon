import type { Submission, Challenge, Partner } from '@/types/database'

interface AnalysisContext {
  submission: Submission & { team_members?: Array<{ display_name: string; role_in_team: string | null }> }
  challenges: Array<Challenge & { partner: Partner | null }>
}

export function buildAnalysisPrompt({ submission, challenges }: AnalysisContext): string {
  const teamList = submission.team_members?.map(m => `- ${m.display_name}${m.role_in_team ? ` (${m.role_in_team})` : ''}`).join('\n') ?? 'Not provided'

  const challengeDetails = challenges.map(c => `
### ${c.title}${c.partner ? ` (Sponsored by ${c.partner.name})` : ' (Main Challenge)'}
${c.description}
${c.requirements_md ? `\nRequirements:\n${c.requirements_md}` : ''}
${c.judging_criteria ? `\nJudging Criteria: ${JSON.stringify(c.judging_criteria, null, 2)}` : ''}
`).join('\n---\n')

  const moonpayFeatures = submission.moonpay_features?.length
    ? submission.moonpay_features.join(', ')
    : 'Not specified'

  return `You are an expert hackathon judge for OpenMoon, a hackathon platform built around the MoonPay Agent Stack. Analyze this project submission objectively and provide structured feedback to assist human judges.

## Submission Details

**Project:** ${submission.project_title}
**Tagline:** ${submission.tagline ?? 'None'}
**Team:** ${submission.team_name}
**Team Members:**
${teamList}

**Description:**
${submission.description}

**Problem Statement:**
${submission.problem_statement ?? 'Not provided'}

**Solution:**
${submission.solution_description ?? 'Not provided'}

**Tech Stack:** ${submission.tech_stack?.join(', ') ?? 'Not specified'}

**MoonPay Features Used:** ${moonpayFeatures}

**Links:**
- GitHub: ${submission.github_url ?? 'Not provided'}
- Demo: ${submission.demo_url ?? 'Not provided'}
- Video: ${submission.demo_video_url ?? 'Not provided'}
- Deck: ${submission.deck_url ?? 'Not provided'}

## Target Challenges

${challengeDetails}

## Instructions

Analyze this submission and call the submit_analysis tool with your structured assessment. Be specific and constructive. Flag missing deliverables as red flags. Score each dimension 0-100. Keep the executive_summary under 200 words. Evaluate MoonPay Agent Stack integration depth specifically.`.trim()
}
