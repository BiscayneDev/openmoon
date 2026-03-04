import Link from 'next/link'
import Image from 'next/image'
import { MoonPayIcon } from '@/components/brand/MoonPayLogo'

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {/* Astronaut background image */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Image
          src="/astronaut-bg.png"
          alt=""
          fill
          className="object-cover object-left"
          style={{ opacity: 0.28 }}
          priority={false}
        />
        {/* Fade overlay — stronger on right so text stays legible */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.75) 55%, rgba(5,5,5,0.95) 100%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(5,5,5,0.6) 100%)' }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2.5">
              <MoonPayIcon size={20} color="#ffffff" />
              <span className="font-bold gradient-text-moon">OpenMoon</span>
            </Link>
            <p className="text-xs text-muted-foreground max-w-xs">
              Building the future of AI-powered crypto with MoonPay Agents. Every Mooncycle, new challenges. New rewards.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link href="/mooncycles" className="text-muted-foreground hover:text-foreground transition-colors">Mooncycles</Link>
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">Projects</Link>
            <Link href="/partners" className="text-muted-foreground hover:text-foreground transition-colors">Partners</Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <span>© {new Date().getFullYear()} OpenMoon. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Powered by{' '}
            <a href="https://www.moonpay.com/agents" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline underline-offset-2">
              MoonPay Agents
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
