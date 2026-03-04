import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { StarField } from '@/components/cosmic/StarField'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StarField count={100} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  )
}
