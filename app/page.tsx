import Link from 'next/link'
import { MoonPayIcon, MoonPayLogo } from '@/components/brand/MoonPayLogo'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Mooncycle, Partner } from '@/types/database'
import { ArrowRight } from 'lucide-react'

async function getActiveCycle() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase
    .from('mooncycles')
    .select('*')
    .in('status', ['active', 'upcoming'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .single()
  return data as Mooncycle | null
}

async function getPartners() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase
    .from('partners')
    .select('id, name, slug')
    .eq('is_active', true)
    .limit(6)
  return (data ?? []) as Partner[]
}

const FALLBACK_PARTNERS = ['Polymarket', 'dFlow', 'Jupiter', '+ more']

export default async function HomePage() {
  const [activeCycle, partners] = await Promise.all([getActiveCycle(), getPartners()])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 md:p-8"
      style={{ backgroundColor: '#050505' }}
    >
      {/* Cinematic background glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120vw', height: '120vh',
          background: `
            radial-gradient(circle at 20% 30%, rgba(255,107,53,0.4) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(74,144,226,0.3) 0%, transparent 40%)
          `,
          opacity: 0.15,
          zIndex: -2,
          filter: 'blur(80px)',
        }}
        aria-hidden="true"
      />

      {/* CSS star field */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 10%, #fff, transparent),
            radial-gradient(1px 1px at 20% 20%, rgba(255,255,255,0.5), transparent),
            radial-gradient(2px 2px at 30% 60%, rgba(255,255,255,0.25), transparent),
            radial-gradient(1px 1px at 80% 40%, #fff, transparent),
            radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.38), transparent),
            radial-gradient(1px 1px at 65% 15%, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 90% 55%, rgba(255,255,255,0.35), transparent)
          `,
          backgroundSize: '500px 500px',
          opacity: 0.3,
          zIndex: -1,
        }}
        aria-hidden="true"
      />

      {/* Glass panel */}
      <main
        className="w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: '1400px',
          minHeight: '90vh',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'clamp(16px, 3vw, 32px)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        {/* ── NAV ── */}
        <nav className="relative z-20 flex justify-between items-center px-5 py-6 sm:px-8 sm:py-8 md:px-12">
          <div className="flex items-center gap-2.5">
            <MoonPayIcon size={22} color="#ffffff" />
            <span className="font-bold text-[15px] tracking-tight text-white">MoonPay</span>
            <span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.55)' }}>Agents</span>
          </div>

          <div className="hidden md:flex gap-8 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <Link href="/mooncycles" className="hover:text-white transition-colors">Cycles</Link>
            <Link href="/projects"   className="hover:text-white transition-colors">Projects</Link>
            <Link href="/partners"   className="hover:text-white transition-colors">Partners</Link>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-2 text-sm font-medium text-white group transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '9999px',
              padding: '8px 20px',
            }}
          >
            Apply for Access
            <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </nav>

        {/* ── HERO ── */}
        <section className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-8 sm:pt-10 overflow-hidden"
          style={{ paddingBottom: 'clamp(140px, 28vw, 260px)' }}
        >
          {/* Moon horizon — scales with viewport so always visible */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '-5%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'max(110%, 900px)',
              height: 'max(110%, 900px)',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 48%, #1a1a1a 60%, #2a2a2a 80%, #111 100%)',
              boxShadow: `
                inset 0 30px 80px -10px rgba(255,255,255,0.85),
                inset 0 60px 160px -30px rgba(255,255,255,0.15),
                0 -60px 120px -20px rgba(255,255,255,0.12),
                0 -20px 60px -10px rgba(255,255,255,0.08)
              `,
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          {/* Floating content */}
          <div
            className="relative z-10 max-w-4xl mx-auto space-y-8"
            style={{ animation: 'float 6s ease-in-out infinite' }}
          >
            {/* Status badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', color: '#bfdbfe' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {activeCycle?.status === 'active'
                ? `${activeCycle.title} — Live Now`
                : 'New Challenge Every Moon Cycle'}
            </div>

            {/* Headline */}
            <h1
              className="font-medium tracking-tighter leading-[0.95]"
              style={{
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                background: 'linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.6))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Build the Future of<br />the Agent Economy.
            </h1>

            {/* Sub */}
            <p
              className="text-lg md:text-xl max-w-xl mx-auto leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              OpenMoon by MoonPay. A recurring hackathon for elite agent builders — new challenges
              from top protocols every lunar cycle. The best agents win.
            </p>

            {/* CTAs */}
            <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-4">
              <Link
                href="/mooncycles"
                className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
                style={{ boxShadow: '0 0 40px -10px rgba(255,255,255,0.5)' }}
              >
                View Current Cycle
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 rounded-full font-medium transition-colors flex items-center gap-2"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Apply Now <span>↗</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── STATS GRID ── */}
        <section
          className="relative z-10 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(24px)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

            {/* Monthly Prize */}
            <div className="p-7 md:p-10 flex flex-col justify-between hover:bg-white/5 transition-colors cursor-default"
              style={{ borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '14rem' }}
            >
              <div>
                <h3 className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Monthly Prize</h3>
                <p className="text-3xl font-light tracking-tight">$5k USDC</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>+ Mac Mini from MoonPay</p>
              </div>
              <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Plus exclusive rewards from each cycle's partner protocol.
              </p>
            </div>

            {/* How it works */}
            <div className="p-7 md:p-10 flex flex-col justify-between hover:bg-white/5 transition-colors cursor-default"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '14rem' }}
            >
              <div>
                <h3 className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>How It Works</h3>
                <ul className="space-y-3 mt-4">
                  {[
                    { n: '01', t: 'New challenge drops each moon cycle' },
                    { n: '02', t: "Build agents on MoonPay's stack" },
                    { n: '03', t: 'Winners showcased + rewarded' },
                  ].map(({ n, t }) => (
                    <li key={n} className="flex items-start gap-3" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      <span className="font-mono text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{n}</span>
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Trajectory */}
            <div className="p-7 md:p-10 flex flex-col justify-between hover:bg-white/5 transition-colors cursor-default"
              style={{ borderRight: '1px solid rgba(255,255,255,0.08)', minHeight: '14rem' }}
            >
              <div>
                <h3 className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Trajectory</h3>
                <div className="space-y-4 border-l pl-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  {[
                    { filled: true,  label: 'New Moon',   sub: 'Challenge Drops'    },
                    { filled: false, label: '~14 Days',   sub: 'Build Window'       },
                    { filled: false, label: 'Full Moon',  sub: 'Winners Announced'  },
                  ].map(({ filled, label, sub }) => (
                    <div key={label} className="relative">
                      <span
                        className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full"
                        style={filled ? { background: '#ffffff' } : { border: '1px solid rgba(255,255,255,0.4)', background: '#000' }}
                      />
                      <p className="text-sm font-semibold" style={filled ? {} : { color: 'rgba(255,255,255,0.6)' }}>{label}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cycle Partners */}
            <div className="p-7 md:p-10 flex flex-col justify-between hover:bg-white/5 transition-colors cursor-default"
              style={{ minHeight: '14rem' }}
            >
              <div>
                <h3 className="text-sm font-medium uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Cycle Partners</h3>
                <div className="flex flex-wrap gap-2">
                  {(partners.length > 0 ? partners.map(p => p.name) : FALLBACK_PARTNERS).map((name) => (
                    <span
                      key={name}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/partners" className="text-sm text-white flex items-center gap-2 mt-auto hover:gap-3 transition-all">
                View All Partners <span>↗</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer
          className="border-t p-5 sm:p-6 md:px-12 flex flex-col sm:flex-row justify-between items-center text-xs gap-4"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}
        >
          <p>OpenMoon is an initiative by MoonPay Inc.</p>
          <div className="flex gap-6">
            <Link href="/mooncycles" className="hover:text-white transition-colors">Mooncycles</Link>
            <Link href="/projects"   className="hover:text-white transition-colors">Projects</Link>
            <Link href="/partners"   className="hover:text-white transition-colors">Partners</Link>
          </div>
          <MoonPayLogo height={12} color="rgba(255,255,255,0.3)" />
        </footer>
      </main>
    </div>
  )
}
