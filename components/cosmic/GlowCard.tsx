import { cn } from '@/lib/utils/cn'
import type { ReactNode } from 'react'

interface GlowCardProps {
  children: ReactNode
  className?: string
  glow?: 'white' | 'purple' | 'blue' | 'none'
  hover?: boolean
}

export function GlowCard({ children, className, glow = 'white', hover = true }: GlowCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl glass p-6',
        (glow === 'white' || glow === 'purple') && 'border-glow',
        glow === 'blue' && 'border border-[rgba(74,144,226,0.25)]',
        hover && 'transition-all duration-300 hover:-translate-y-0.5',
        hover && (glow === 'white' || glow === 'purple') && 'hover:glow-white',
        hover && glow === 'blue' && 'hover:glow-blue',
        className
      )}
    >
      {children}
    </div>
  )
}
