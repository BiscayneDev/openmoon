import { cn } from '@/lib/utils/cn'

interface OrbitLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OrbitLoader({ size = 'md', className }: OrbitLoaderProps) {
  const dimensions = { sm: 24, md: 40, lg: 64 }[size]
  const orbitSize = dimensions
  const moonSize = { sm: 4, md: 6, lg: 10 }[size]
  const centerSize = { sm: 8, md: 12, lg: 20 }[size]

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: orbitSize, height: orbitSize }}
      aria-label="Loading..."
      role="status"
    >
      {/* Center planet */}
      <div
        className="absolute rounded-full bg-white/60 glow-white"
        style={{ width: centerSize, height: centerSize }}
      />
      {/* Orbit ring */}
      <div
        className="absolute rounded-full border border-white/15"
        style={{ width: orbitSize - 2, height: orbitSize - 2 }}
      />
      {/* Orbiting moon */}
      <div
        className="absolute"
        style={{
          width: orbitSize - 2,
          height: orbitSize - 2,
          animation: 'orbit 1.2s linear infinite',
        }}
      >
        <div
          className="absolute rounded-full bg-white"
          style={{
            width: moonSize,
            height: moonSize,
            top: -moonSize / 2,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    </div>
  )
}
