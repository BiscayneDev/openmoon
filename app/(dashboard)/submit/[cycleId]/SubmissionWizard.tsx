'use client'

import { useState, useEffect, useCallback, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GlowCard } from '@/components/cosmic/GlowCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { Mooncycle, ChallengeWithPartner } from '@/types/database'
import { MOONPAY_FEATURES } from '@/types/database'
import { Plus, X, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Zod schemas per step
// ---------------------------------------------------------------------------

const teamMemberSchema = z.object({
  display_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  github_username: z.string().optional(),
  role_in_team: z.string().optional(),
  is_lead: z.boolean().optional(),
})

const step1Schema = z.object({
  team_name: z.string().min(1, 'Team name is required'),
  team_members: z
    .array(teamMemberSchema)
    .min(1, 'At least one team member is required')
    .max(4, 'Maximum 4 team members'),
})

const step2Schema = z.object({
  project_title: z.string().min(1, 'Project title is required'),
  tagline: z.string().max(120, 'Max 120 characters').optional(),
  description: z.string().min(1, 'Description is required'),
  problem_statement: z.string().optional(),
  solution_description: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  github_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  demo_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  demo_video_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  deck_url: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
})

const step3Schema = z.object({
  challenge_ids: z
    .array(z.string())
    .min(1, 'Select at least one challenge'),
  moonpay_features: z.array(z.string()).optional(),
})

// Combined full schema
const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)

type FormValues = z.infer<typeof fullSchema>

// ---------------------------------------------------------------------------
// Prop types
// ---------------------------------------------------------------------------

interface Props {
  cycle: Mooncycle
  challenges: ChallengeWithPartner[]
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { n: 1, label: 'Team Info' },
  { n: 2, label: 'Project' },
  { n: 3, label: 'Challenges' },
  { n: 4, label: 'Review' },
] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map(({ n, label }, i) => (
        <div key={n} className="flex items-center">
          {/* Circle */}
          <div className="flex flex-col items-center">
            <div
              className={`size-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                n < current
                  ? 'bg-[#6A04D4] border-[#6A04D4] text-white'
                  : n === current
                  ? 'bg-[#6A04D4] border-[#6A04D4] text-white ring-4 ring-[#6A04D4]/20'
                  : 'bg-transparent border-white/20 text-white/30'
              }`}
            >
              {n < current ? <Check className="size-3.5" /> : n}
            </div>
            <span
              className={`text-xs mt-1 font-medium ${
                n === current ? 'text-white/80' : 'text-white/30'
              }`}
            >
              {label}
            </span>
          </div>

          {/* Connector */}
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-12 sm:w-20 mx-1 mb-5 transition-all ${
                n < current ? 'bg-[#6A04D4]/60' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tag input (tech_stack)
// ---------------------------------------------------------------------------

function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')

  const addTag = (val: string) => {
    const trimmed = val.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInputValue('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="min-h-[42px] flex flex-wrap gap-1.5 items-center rounded-md border border-white/12 bg-white/4 px-3 py-2 focus-within:border-[#6A04D4]/70 transition-colors">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-[#6A04D4]/20 px-2 py-0.5 text-xs text-[#A855F7]"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-white transition-colors"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder={tags.length === 0 ? 'Type and press Enter to add…' : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white outline-none placeholder:text-white/30"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Challenge card
// ---------------------------------------------------------------------------

function ChallengeCard({
  challenge,
  selected,
  onToggle,
}: {
  challenge: ChallengeWithPartner
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selected
          ? 'border-[#6A04D4] bg-[#6A04D4]/8'
          : 'border-white/8 hover:border-[#6A04D4]/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 size-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            selected ? 'bg-[#6A04D4] border-[#6A04D4]' : 'border-white/20'
          }`}
        >
          {selected && <Check className="size-2.5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">{challenge.title}</h4>
          {challenge.partner && (
            <p className="text-xs text-white/40 mt-0.5">{challenge.partner.name}</p>
          )}
          <p className="text-xs text-white/60 mt-1.5 line-clamp-2">{challenge.description}</p>
          {challenge.prize_amount != null && (
            <p className="text-xs text-[#A855F7] mt-2 font-medium">
              {challenge.prize_amount.toLocaleString()} {challenge.prize_currency} prize
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error message helper
// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-400 mt-1">{message}</p>
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

const DRAFT_KEY = (cycleId: string) => `openmoon_draft_${cycleId}`

const DEFAULT_VALUES: FormValues = {
  team_name: '',
  team_members: [{ display_name: '', email: '', github_username: '', role_in_team: '', is_lead: true }],
  project_title: '',
  tagline: '',
  description: '',
  problem_statement: '',
  solution_description: '',
  tech_stack: [],
  github_url: '',
  demo_url: '',
  demo_video_url: '',
  deck_url: '',
  challenge_ids: [],
  moonpay_features: [],
}

export function SubmissionWizard({ cycle, challenges }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  })

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control,
    name: 'team_members',
  })

  // ---------------------------------------------------------------------------
  // Draft persistence
  // ---------------------------------------------------------------------------

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(cycle.id))
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormValues>
        Object.entries(saved).forEach(([key, val]) => {
          setValue(key as keyof FormValues, val as never)
        })
      }
    } catch {
      // ignore parse errors
    }
  }, [cycle.id, setValue])

  // Save draft on every change
  const formValues = watch()
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY(cycle.id), JSON.stringify(formValues))
    } catch {
      // ignore storage errors
    }
  }, [formValues, cycle.id])

  // ---------------------------------------------------------------------------
  // Step navigation
  // ---------------------------------------------------------------------------

  const STEP_FIELDS: Record<1 | 2 | 3 | 4, (keyof FormValues)[]> = {
    1: ['team_name', 'team_members'],
    2: ['project_title', 'description'],
    3: ['challenge_ids'],
    4: [],
  }

  const goNext = useCallback(async () => {
    const fields = STEP_FIELDS[step]
    const valid = await trigger(fields)
    if (!valid) return
    setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))
  }, [step, trigger])

  const goPrev = useCallback(() => {
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))
  }, [])

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle_id: cycle.id,
          team_name: values.team_name,
          project_title: values.project_title,
          tagline: values.tagline || null,
          description: values.description,
          problem_statement: values.problem_statement || null,
          solution_description: values.solution_description || null,
          tech_stack: values.tech_stack ?? [],
          moonpay_features: values.moonpay_features ?? [],
          github_url: values.github_url || null,
          demo_url: values.demo_url || null,
          demo_video_url: values.demo_video_url || null,
          deck_url: values.deck_url || null,
          challenge_ids: values.challenge_ids,
          team_members: values.team_members.map((m) => ({
            display_name: m.display_name,
            email: m.email || undefined,
            github_username: m.github_username || undefined,
            role_in_team: m.role_in_team || undefined,
            is_lead: m.is_lead,
          })),
        }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setSubmitError(json.error?.message ?? 'Submission failed. Please try again.')
        return
      }

      // Clear draft
      try {
        localStorage.removeItem(DRAFT_KEY(cycle.id))
      } catch {}

      // Fire-and-forget AI analysis
      const submissionId = json.data?.id
      if (submissionId) {
        fetch(`/api/submissions/${submissionId}/analyze`, { method: 'POST' }).catch(() => {})
      }

      setSuccessMessage('Your project has been submitted! Redirecting to your dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Current watched values for review step
  // ---------------------------------------------------------------------------

  const values = getValues()

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (successMessage) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="rounded-full bg-[#6A04D4]/20 size-16 flex items-center justify-center mx-auto mb-4">
          <Check className="size-8 text-[#6A04D4]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Submission received!</h2>
        <p className="text-white/50">{successMessage}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Submit Your Project</h1>
        <p className="text-white/50 mt-1 text-sm">{cycle.title}</p>
      </div>

      <StepIndicator current={step} />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ------------------------------------------------------------------ */}
        {/* STEP 1 — Team Info                                                  */}
        {/* ------------------------------------------------------------------ */}
        {step === 1 && (
          <GlowCard glow="none" hover={false} className="border border-white/8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-0.5">Team Information</h2>
              <p className="text-sm text-white/40">Tell us who is building this project.</p>
            </div>

            {/* Team name */}
            <div className="space-y-1.5">
              <Label htmlFor="team_name" className="text-white/70">
                Team Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="team_name"
                {...register('team_name')}
                placeholder="e.g. Moonshot Labs"
                className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70"
              />
              <FieldError message={errors.team_name?.message} />
            </div>

            {/* Team members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white/70">
                  Team Members <span className="text-red-400">*</span>
                </Label>
                {memberFields.length < 4 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-[#A855F7] hover:text-white hover:bg-[#6A04D4]/20 text-xs"
                    onClick={() =>
                      appendMember({
                        display_name: '',
                        email: '',
                        github_username: '',
                        role_in_team: '',
                        is_lead: false,
                      })
                    }
                  >
                    <Plus className="size-3.5 mr-1" /> Add Member
                  </Button>
                )}
              </div>

              {memberFields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative rounded-lg border border-white/8 bg-white/2 p-4 space-y-3"
                >
                  {memberFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="absolute top-3 right-3 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-white/50">
                        Display Name <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        {...register(`team_members.${index}.display_name`)}
                        placeholder="Jane Doe"
                        className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70 h-8 text-sm"
                      />
                      <FieldError message={errors.team_members?.[index]?.display_name?.message} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/50">Email</Label>
                      <Input
                        {...register(`team_members.${index}.email`)}
                        type="email"
                        placeholder="jane@example.com"
                        className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70 h-8 text-sm"
                      />
                      <FieldError message={errors.team_members?.[index]?.email?.message} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/50">GitHub Username</Label>
                      <Input
                        {...register(`team_members.${index}.github_username`)}
                        placeholder="janedoe"
                        className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70 h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/50">Role</Label>
                      <Input
                        {...register(`team_members.${index}.role_in_team`)}
                        placeholder="e.g. Frontend Dev"
                        className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70 h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Controller
                      name={`team_members.${index}.is_lead`}
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id={`is_lead_${index}`}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-white/20 data-[state=checked]:bg-[#6A04D4] data-[state=checked]:border-[#6A04D4]"
                        />
                      )}
                    />
                    <Label htmlFor={`is_lead_${index}`} className="text-xs text-white/50 cursor-pointer">
                      Team Lead
                    </Label>
                  </div>
                </div>
              ))}

              <FieldError message={errors.team_members?.root?.message ?? errors.team_members?.message} />
            </div>
          </GlowCard>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 2 — Project Details                                            */}
        {/* ------------------------------------------------------------------ */}
        {step === 2 && (
          <GlowCard glow="none" hover={false} className="border border-white/8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-0.5">Project Details</h2>
              <p className="text-sm text-white/40">Describe what you built.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project_title" className="text-white/70">
                Project Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="project_title"
                {...register('project_title')}
                placeholder="e.g. DeFi Portfolio Manager"
                className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70"
              />
              <FieldError message={errors.project_title?.message} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tagline" className="text-white/70">Tagline</Label>
                <span className="text-xs text-white/30">
                  {watch('tagline')?.length ?? 0}/120
                </span>
              </div>
              <Input
                id="tagline"
                {...register('tagline')}
                maxLength={120}
                placeholder="A one-sentence pitch for your project"
                className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70"
              />
              <FieldError message={errors.tagline?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-white/70">
                Description <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                rows={5}
                placeholder="Describe your project in detail…"
                className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70 resize-y"
              />
              <FieldError message={errors.description?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="problem_statement" className="text-white/70">Problem Statement</Label>
              <Textarea
                id="problem_statement"
                {...register('problem_statement')}
                rows={3}
                placeholder="What problem are you solving?"
                className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70 resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="solution_description" className="text-white/70">Solution</Label>
              <Textarea
                id="solution_description"
                {...register('solution_description')}
                rows={3}
                placeholder="How does your project solve it?"
                className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70 resize-y"
              />
            </div>

            {/* Tech stack tag input */}
            <div className="space-y-1.5">
              <Label className="text-white/70">Tech Stack</Label>
              <Controller
                name="tech_stack"
                control={control}
                render={({ field }) => (
                  <TagInput
                    tags={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />
              <p className="text-xs text-white/30">Press Enter or comma to add a tag</p>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <Label className="text-white/70">Links</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-white/40">GitHub Repository</Label>
                  <Input
                    {...register('github_url')}
                    type="url"
                    placeholder="https://github.com/…"
                    className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70"
                  />
                  <FieldError message={errors.github_url?.message} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/40">Live Demo</Label>
                  <Input
                    {...register('demo_url')}
                    type="url"
                    placeholder="https://myapp.com"
                    className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70"
                  />
                  <FieldError message={errors.demo_url?.message} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/40">Demo Video</Label>
                  <Input
                    {...register('demo_video_url')}
                    type="url"
                    placeholder="https://youtube.com/…"
                    className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70"
                  />
                  <FieldError message={errors.demo_video_url?.message} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/40">Pitch Deck</Label>
                  <Input
                    {...register('deck_url')}
                    type="url"
                    placeholder="https://slides.com/…"
                    className="bg-white/4 border-white/12 text-white placeholder:text-white/25 focus:border-[#6A04D4]/70"
                  />
                  <FieldError message={errors.deck_url?.message} />
                </div>
              </div>
            </div>
          </GlowCard>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 3 — Challenges & MoonPay                                       */}
        {/* ------------------------------------------------------------------ */}
        {step === 3 && (
          <GlowCard glow="none" hover={false} className="border border-white/8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-0.5">Challenges & MoonPay</h2>
              <p className="text-sm text-white/40">Select the challenges you are entering and the MoonPay features you used.</p>
            </div>

            {/* Challenge selector */}
            <div className="space-y-3">
              <Label className="text-white/70">
                Challenges <span className="text-red-400">*</span>
              </Label>
              <p className="text-xs text-white/30">Select at least one challenge to enter.</p>
              <Controller
                name="challenge_ids"
                control={control}
                render={({ field }) => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {challenges.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        selected={field.value.includes(challenge.id)}
                        onToggle={() => {
                          const next = field.value.includes(challenge.id)
                            ? field.value.filter((id) => id !== challenge.id)
                            : [...field.value, challenge.id]
                          field.onChange(next)
                        }}
                      />
                    ))}
                    {challenges.length === 0 && (
                      <p className="text-sm text-white/40 col-span-2 py-4 text-center">
                        No challenges available for this cycle yet.
                      </p>
                    )}
                  </div>
                )}
              />
              <FieldError message={errors.challenge_ids?.message} />
            </div>

            {/* MoonPay features */}
            <div className="space-y-3">
              <Label className="text-white/70">MoonPay Agent Stack Features Used</Label>
              <p className="text-xs text-white/30">Check all that apply.</p>
              <Controller
                name="moonpay_features"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {MOONPAY_FEATURES.map((feat) => (
                      <label
                        key={feat}
                        className="flex items-center gap-2.5 rounded-md border border-white/8 px-3 py-2.5 cursor-pointer hover:border-white/20 transition-colors"
                      >
                        <Checkbox
                          checked={(field.value ?? []).includes(feat)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...(field.value ?? []), feat]
                              : (field.value ?? []).filter((f) => f !== feat)
                            field.onChange(next)
                          }}
                          className="border-white/20 data-[state=checked]:bg-[#6A04D4] data-[state=checked]:border-[#6A04D4]"
                        />
                        <span className="text-xs text-white/60 leading-tight">{feat}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          </GlowCard>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 4 — Review                                                     */}
        {/* ------------------------------------------------------------------ */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-white mb-0.5">Review & Submit</h2>
              <p className="text-sm text-white/40">Double-check everything before submitting.</p>
            </div>

            {/* Team */}
            <GlowCard glow="none" hover={false} className="border border-white/8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Team</h3>
              <p className="text-sm font-semibold text-white mb-3">{values.team_name}</p>
              <div className="space-y-2">
                {values.team_members.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <span className="size-5 rounded-full bg-[#6A04D4]/30 flex items-center justify-center text-[10px] text-[#A855F7] font-bold flex-shrink-0">
                      {m.display_name.charAt(0).toUpperCase()}
                    </span>
                    <span>{m.display_name}</span>
                    {m.role_in_team && <span className="text-white/30">· {m.role_in_team}</span>}
                    {m.is_lead && (
                      <span className="text-[10px] bg-[#6A04D4]/20 text-[#A855F7] rounded px-1.5 py-0.5">Lead</span>
                    )}
                  </div>
                ))}
              </div>
            </GlowCard>

            {/* Project */}
            <GlowCard glow="none" hover={false} className="border border-white/8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Project</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-white/30">Title</dt>
                  <dd className="text-sm text-white font-medium">{values.project_title}</dd>
                </div>
                {values.tagline && (
                  <div>
                    <dt className="text-xs text-white/30">Tagline</dt>
                    <dd className="text-sm text-white/70 italic">"{values.tagline}"</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-white/30">Description</dt>
                  <dd className="text-sm text-white/70 line-clamp-3">{values.description}</dd>
                </div>
                {values.tech_stack && values.tech_stack.length > 0 && (
                  <div>
                    <dt className="text-xs text-white/30 mb-1">Tech Stack</dt>
                    <dd className="flex flex-wrap gap-1">
                      {values.tech_stack.map((tag) => (
                        <span key={tag} className="text-xs bg-white/8 text-white/60 rounded px-2 py-0.5">{tag}</span>
                      ))}
                    </dd>
                  </div>
                )}
                {(values.github_url || values.demo_url || values.demo_video_url || values.deck_url) && (
                  <div>
                    <dt className="text-xs text-white/30 mb-1">Links</dt>
                    <dd className="space-y-1 text-xs text-white/50">
                      {values.github_url && <div>GitHub: {values.github_url}</div>}
                      {values.demo_url && <div>Demo: {values.demo_url}</div>}
                      {values.demo_video_url && <div>Video: {values.demo_video_url}</div>}
                      {values.deck_url && <div>Deck: {values.deck_url}</div>}
                    </dd>
                  </div>
                )}
              </dl>
            </GlowCard>

            {/* Challenges */}
            <GlowCard glow="none" hover={false} className="border border-white/8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Challenges Entered</h3>
              <div className="space-y-2">
                {values.challenge_ids.map((id) => {
                  const c = challenges.find((ch) => ch.id === id)
                  if (!c) return null
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{c.title}</span>
                      {c.partner && <span className="text-xs text-white/30">{c.partner.name}</span>}
                    </div>
                  )
                })}
              </div>
              {values.moonpay_features && values.moonpay_features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/8">
                  <p className="text-xs text-white/30 mb-2">MoonPay Features Used</p>
                  <div className="flex flex-wrap gap-1.5">
                    {values.moonpay_features.map((feat) => (
                      <span key={feat} className="text-xs bg-[#6A04D4]/15 text-[#A855F7] rounded px-2 py-0.5">{feat}</span>
                    ))}
                  </div>
                </div>
              )}
            </GlowCard>

            {submitError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Navigation buttons                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="border border-white/12 text-white/70 bg-transparent hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="size-4 mr-1" />
            Previous
          </Button>

          {step < 4 ? (
            <Button
              type="button"
              onClick={goNext}
              className="bg-[#6A04D4] text-white hover:bg-[#7B14E4]"
            >
              Next
              <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#6A04D4] text-white hover:bg-[#7B14E4] min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Project'
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
