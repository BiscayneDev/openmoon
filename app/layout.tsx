import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: { default: 'OpenMoon', template: '%s | OpenMoon' },
  description: 'Build with MoonPay Agents. Win $10k USDC + Mac Minis. Every Mooncycle brings new challenges with partner sponsors.',
  keywords: ['hackathon', 'MoonPay', 'crypto', 'AI agents', 'web3', 'OpenMoon'],
  openGraph: {
    type: 'website',
    title: 'OpenMoon',
    description: 'Build with MoonPay Agents. Win $10k USDC + Mac Minis.',
    siteName: 'OpenMoon',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenMoon',
    description: 'Build with MoonPay Agents. Win $10k USDC + Mac Minis.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  )
}
