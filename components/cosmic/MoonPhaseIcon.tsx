import { cn } from '@/lib/utils/cn'

type MoonPhase = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' |
  'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent'

const PHASE_LABELS: Record<MoonPhase, string> = {
  'new': '🌑',
  'waxing-crescent': '🌒',
  'first-quarter': '🌓',
  'waxing-gibbous': '🌔',
  'full': '🌕',
  'waning-gibbous': '🌖',
  'last-quarter': '🌗',
  'waning-crescent': '🌘',
}

interface MoonPhaseIconProps {
  phase?: MoonPhase
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  glow?: boolean
}

const SIZE_MAP = { sm: 'text-lg', md: 'text-3xl', lg: 'text-5xl', xl: 'text-7xl' }

export function MoonPhaseIcon({ phase = 'full', size = 'md', className, glow = false }: MoonPhaseIconProps) {
  return (
    <span
      className={cn(
        SIZE_MAP[size],
        'select-none inline-block leading-none',
        glow && 'drop-shadow-[0_0_12px_oklch(0.65_0.22_295/80%)]',
        className
      )}
      aria-label={`Moon phase: ${phase}`}
      role="img"
    >
      {PHASE_LABELS[phase]}
    </span>
  )
}

// Derives phase from cycle number (1-based)
export function getCyclePhaseIcon(cycleNumber: number): MoonPhase {
  const phases: MoonPhase[] = [
    'new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous',
    'full', 'waning-gibbous', 'last-quarter', 'waning-crescent',
  ]
  return phases[(cycleNumber - 1) % 8]
}
