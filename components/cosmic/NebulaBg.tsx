import { cn } from '@/lib/utils/cn'
import type { ReactNode } from 'react'

interface NebulaBgProps {
  children?: ReactNode
  className?: string
  variant?: 'hero' | 'section' | 'subtle'
}

export function NebulaBg({ children, className, variant = 'section' }: NebulaBgProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {variant === 'hero' && (
        <>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(255,107,53,0.12), transparent)' }} />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 80% 70%, rgba(74,144,226,0.08), transparent)' }} />
        </>
      )}
      {variant === 'section' && (
        <>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.04), transparent)' }} />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 40% 30% at 80% 100%, rgba(74,144,226,0.05), transparent)' }} />
        </>
      )}
      {variant === 'subtle' && (
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(255,255,255,0.03), transparent)' }} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
