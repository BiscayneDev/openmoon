import type { PrizeCurrency } from '@/types/database'

export function formatPrize(amount: number | null, currency: PrizeCurrency = 'USDC'): string {
  if (!amount) return 'TBD'
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  return `$${formatted} ${currency}`
}

export function formatPrizeShort(amount: number | null, currency: PrizeCurrency = 'USDC'): string {
  if (!amount) return 'TBD'
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k ${currency}`
  }
  return formatPrize(amount, currency)
}
