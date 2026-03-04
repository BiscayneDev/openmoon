'use client'

import { useState } from 'react'
import { GlowCard } from '@/components/cosmic/GlowCard'
import type { AIAnalysis } from '@/types/ai'
import type { AnalysisStatus } from '@/types/database'
import { ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react'

interface AIAnalysisPanelProps {
  analysis: AIAnalysis | null
  status: AnalysisStatus
  onReanalyze?: () => void
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score > 70
      ? 'bg-emerald-400/80'
      : score >= 40
      ? 'bg-yellow-400/80'
      : 'bg-red-400/80'
  return (
    <div className="h-1.5 rounded-full bg-white/8 mt-1">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: AnalysisStatus }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted/40 text-muted-foreground border border-border/40">
        <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
        Pending
      </span>
    )
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <Loader2 className="size-3 animate-spin" />
        Processing
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30">
        <span className="size-1.5 rounded-full bg-green-400" />
        Completed
      </span>
    )
  }
  // failed
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
      <span className="size-1.5 rounded-full bg-red-400" />
      Failed
    </span>
  )
}

const SCORE_LABELS: { key: keyof NonNullable<AIAnalysis['scores']>; label: string }[] = [
  { key: 'innovation', label: 'Innovation' },
  { key: 'technical_depth', label: 'Technical Depth' },
  { key: 'presentation_quality', label: 'Presentation' },
  { key: 'completeness', label: 'Completeness' },
  { key: 'overall', label: 'Overall' },
]

export function AIAnalysisPanel({ analysis, status, onReanalyze }: AIAnalysisPanelProps) {
  const [expanded, setExpanded] = useState(true)

  const canReanalyze = onReanalyze && (status === 'completed' || status === 'failed')

  return (
    <GlowCard glow="none" className="border-border/30 p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">AI Analysis</h3>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2">
          {canReanalyze && (
            <button
              onClick={onReanalyze}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border border-border/40 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="size-3" />
              Re-analyze
            </button>
          )}
          {status === 'completed' && analysis && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Pending */}
        {status === 'pending' && (
          <div className="py-6 text-center">
            <div className="inline-flex gap-1 mb-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 rounded-full bg-muted-foreground/40 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Analysis queued...</p>
          </div>
        )}

        {/* Processing */}
        {status === 'processing' && (
          <div className="py-6 text-center">
            <Loader2 className="size-6 animate-spin mx-auto mb-3 text-[#6A04D4]" />
            <p className="text-sm text-muted-foreground">Analyzing submission...</p>
          </div>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <div className="py-6 text-center">
            <div className="size-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-red-400 text-lg font-bold">!</span>
            </div>
            <p className="text-sm font-medium text-red-400 mb-1">Analysis failed</p>
            <p className="text-xs text-muted-foreground mb-4">
              The AI analysis could not be completed.
            </p>
            {onReanalyze && (
              <button
                onClick={onReanalyze}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-[#6A04D4] text-white hover:bg-[#7B14E4] transition-colors"
              >
                <RefreshCw className="size-3" />
                Try again
              </button>
            )}
          </div>
        )}

        {/* Completed but collapsed */}
        {status === 'completed' && analysis && !expanded && (
          <div className="flex items-center justify-between py-1">
            <p className="text-xs text-muted-foreground line-clamp-1 flex-1 pr-4">
              {analysis.executive_summary}
            </p>
            <span className="shrink-0 text-sm font-bold text-emerald-400">
              {analysis.scores.overall}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </span>
          </div>
        )}

        {/* Completed and expanded */}
        {status === 'completed' && analysis && expanded && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Executive Summary
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {analysis.executive_summary}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                Model: {analysis.model} &middot; Confidence: {Math.round(analysis.confidence * 100)}%
                &middot; Analyzed {new Date(analysis.analyzed_at).toLocaleDateString()}
              </p>
            </div>

            {/* Scores */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Scores
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {SCORE_LABELS.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span
                        className={
                          analysis.scores[key] > 70
                            ? 'text-emerald-400 font-semibold'
                            : analysis.scores[key] >= 40
                            ? 'text-yellow-400 font-semibold'
                            : 'text-red-400 font-semibold'
                        }
                      >
                        {analysis.scores[key]}
                      </span>
                    </div>
                    <ScoreBar score={analysis.scores[key]} />
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {analysis.key_strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Key Strengths
                  </h4>
                  <ul className="space-y-1.5">
                    {analysis.key_strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span className="text-foreground/80">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.key_weaknesses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Key Weaknesses
                  </h4>
                  <ul className="space-y-1.5">
                    {analysis.key_weaknesses.map((w, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span className="text-foreground/80">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Red Flags */}
            {analysis.red_flags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Red Flags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.red_flags.map((flag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Challenge Fit */}
            {analysis.challenge_fit.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Challenge Fit
                </h4>
                <div className="space-y-4">
                  {analysis.challenge_fit.map((fit) => (
                    <div
                      key={fit.challenge_id}
                      className="rounded-lg border border-border/20 bg-white/[0.02] px-4 py-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">{fit.challenge_title}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              fit.meets_requirements ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {fit.meets_requirements ? 'Meets requirements' : 'Missing requirements'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-1.5 rounded-full bg-white/8 flex-1">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fit.fit_score > 70
                                ? 'bg-emerald-400/80'
                                : fit.fit_score >= 40
                                ? 'bg-yellow-400/80'
                                : 'bg-red-400/80'
                            }`}
                            style={{ width: `${fit.fit_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {fit.fit_score}/100
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{fit.fit_reasoning}</p>
                      {fit.missing_requirements.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-red-400/80 mb-1">Missing:</p>
                          <ul className="space-y-0.5">
                            {fit.missing_requirements.map((req, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                <span className="text-red-400/60">–</span>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {analysis.suggested_questions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Suggested Questions
                </h4>
                <ol className="space-y-2">
                  {analysis.suggested_questions.map((q, i) => (
                    <li key={i} className="flex gap-2.5 text-xs">
                      <span className="shrink-0 size-4 rounded-full bg-[#6A04D4]/30 text-[#a855f7] flex items-center justify-center font-medium text-[10px]">
                        {i + 1}
                      </span>
                      <span className="text-foreground/80 leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </GlowCard>
  )
}
