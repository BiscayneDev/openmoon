import { formatDistanceToNow, format, isPast, isFuture, differenceInDays } from 'date-fns'

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt)
}

export function formatDatetime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm UTC')
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function daysUntil(date: string | Date): number {
  return differenceInDays(new Date(date), new Date())
}

export function isActive(startsAt: string, endsAt: string): boolean {
  const now = new Date()
  return isFuture(new Date(endsAt)) && isPast(new Date(startsAt))
}

export function getCyclePhase(startsAt: string, endsAt: string, judgingEndsAt?: string | null): string {
  const now = new Date()
  if (isFuture(new Date(startsAt))) return 'upcoming'
  if (isFuture(new Date(endsAt))) return 'active'
  if (judgingEndsAt && isFuture(new Date(judgingEndsAt))) return 'judging'
  return 'ended'
}
