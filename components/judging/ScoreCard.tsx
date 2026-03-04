'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Score, JudgingCriterion } from '@/types/database'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ScoreCardProps {
  submissionId: string
  challengeId: string
  challengeTitle: string
  judgingCriteria?: JudgingCriterion[] | null
  existingScore?: Score
}

const DEFAULT_CRITERIA: JudgingCriterion[] = [
  { name: 'Innovation', weight: 1, description: 'Originality and creativity of the solution' },
  { name: 'Technical Execution', weight: 1, description: 'Quality and soundness of implementation' },
  { name: 'Product Quality', weight: 1, description: 'Polish, UX, and overall product feel' },
  { name: 'Presentation', weight: 1, description: 'Clarity of the submission and demo' },
]

function CriterionSlider({
  name,
  description,
  value,
  onChange,
}: {
  name: string
  description?: string
  value: number
  onChange: (v: number) => void
}) {
  const color =
    value > 7 ? 'text-emerald-400' : value >= 4 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-foreground/90">{name}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={10}
            value={value}
            onChange={(e) => {
              const v = Math.min(10, Math.max(1, Number(e.target.value)))
              onChange(v)
            }}
            className={`w-12 text-center rounded border border-border/50 bg-background/50 px-1.5 py-0.5 text-xs font-bold ${color} focus:outline-none focus:ring-1 focus:ring-ring/50`}
          />
          <span className="text-xs text-muted-foreground/40">/10</span>
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground/60 mb-1.5">{description}</p>
      )}
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-white/8 accent-[#6A04D4] cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/30 mt-0.5">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}

export function ScoreCard({
  submissionId,
  challengeId,
  challengeTitle,
  judgingCriteria,
  existingScore,
}: ScoreCardProps) {
  const criteria = judgingCriteria && judgingCriteria.length > 0 ? judgingCriteria : DEFAULT_CRITERIA

  const initialCriteriaScores: Record<string, number> = {}
  criteria.forEach((c) => {
    initialCriteriaScores[c.name] =
      existingScore?.criteria_scores?.[c.name] ?? 5
  })

  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(initialCriteriaScores)
  const [overallScore, setOverallScore] = useState<number>(existingScore?.overall_score ?? 50)
  const [feedback, setFeedback] = useState<string>(existingScore?.feedback ?? '')
  const [isFinal, setIsFinal] = useState<boolean>(existingScore?.is_final ?? false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const overallColor =
    overallScore > 70
      ? 'text-emerald-400'
      : overallScore >= 40
      ? 'text-yellow-400'
      : 'text-red-400'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          challenge_id: challengeId,
          criteria_scores: criteriaScores,
          overall_score: overallScore,
          feedback: feedback || null,
          is_final: isFinal,
        }),
      })

      if (res.ok) {
        setResult({ ok: true, message: 'Score saved.' })
      } else {
        const body = await res.json().catch(() => ({}))
        setResult({ ok: false, message: body.error ?? 'Failed to save score.' })
      }
    } catch {
      setResult({ ok: false, message: 'Network error. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 bg-white/[0.02]">
        <div>
          <h3 className="text-sm font-semibold">{challengeTitle}</h3>
          {existingScore && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last scored {new Date(existingScore.updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
        {existingScore?.is_final && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[#6A04D4]/20 text-purple-400 border border-purple-500/30">
            Final
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
        {/* Criteria Sliders */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Criteria (1–10)
          </h4>
          <div className="space-y-4">
            {criteria.map((c) => (
              <CriterionSlider
                key={c.name}
                name={c.name}
                description={c.description}
                value={criteriaScores[c.name] ?? 5}
                onChange={(v) =>
                  setCriteriaScores((prev) => ({ ...prev, [c.name]: v }))
                }
              />
            ))}
          </div>
        </div>

        {/* Overall Score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overall Score
            </h4>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={100}
                value={overallScore}
                onChange={(e) => {
                  const v = Math.min(100, Math.max(1, Number(e.target.value)))
                  setOverallScore(v)
                }}
                className={`w-14 text-center rounded border border-border/50 bg-background/50 px-1.5 py-0.5 text-sm font-bold ${overallColor} focus:outline-none focus:ring-1 focus:ring-ring/50`}
              />
              <span className="text-xs text-muted-foreground/40">/100</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/8">
            <div
              className={`h-full rounded-full transition-all ${
                overallScore > 70
                  ? 'bg-emerald-400/80'
                  : overallScore >= 40
                  ? 'bg-yellow-400/80'
                  : 'bg-red-400/80'
              }`}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>

        {/* Feedback */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Feedback
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Notes for the team or other judges..."
            rows={3}
            className="resize-none border-border/50 bg-background/50 text-sm placeholder:text-muted-foreground/40 focus-visible:ring-[#6A04D4]/50"
          />
        </div>

        {/* Final toggle */}
        <div className="flex items-center gap-2">
          <input
            id={`final-${challengeId}`}
            type="checkbox"
            checked={isFinal}
            onChange={(e) => setIsFinal(e.target.checked)}
            className="accent-[#6A04D4] size-3.5 cursor-pointer"
          />
          <label
            htmlFor={`final-${challengeId}`}
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Mark as final score
          </label>
        </div>

        {/* Result feedback */}
        {result && (
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
              result.ok
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {result.ok ? (
              <CheckCircle className="size-3.5 shrink-0" />
            ) : (
              <AlertCircle className="size-3.5 shrink-0" />
            )}
            {result.message}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#6A04D4] text-white hover:bg-[#7B14E4] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="size-3.5 mr-2 animate-spin" />
              Saving...
            </>
          ) : existingScore ? (
            'Update Score'
          ) : (
            'Submit Score'
          )}
        </Button>
      </form>
    </GlowCard>
  )
}
