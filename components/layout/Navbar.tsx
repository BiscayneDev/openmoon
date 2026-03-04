import Link from 'next/link'
import { AuthButton } from '@/components/auth/AuthButton'
import { MoonPayIcon } from '@/components/brand/MoonPayLogo'

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo: OpenMoon × MoonPay icon mark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <MoonPayIcon size={22} color="#ffffff" className="group-hover:opacity-80 transition-opacity" />
          <span className="font-bold text-[15px] tracking-tight text-white group-hover:text-white/80 transition-colors">
            OpenMoon
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium">
          {[
            { href: '/mooncycles', label: 'Mooncycles' },
            { href: '/projects', label: 'Projects' },
            { href: '/partners', label: 'Partners' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-white/45 hover:text-white transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/mooncycles"
            className="hidden md:inline-flex items-center text-[13px] font-medium text-white/45 hover:text-white transition-colors"
          >
            View Cycles
          </Link>
          <AuthButton />
        </div>
      </div>
    </header>
  )
}
