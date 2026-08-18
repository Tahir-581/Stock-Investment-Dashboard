import type { FormType } from './types'
import type { Sector } from './types'

export const TICKER_SECTOR: Record<string, Sector> = {
  AAPL: 'tech',
  NVDA: 'tech',
  META: 'tech',
  MSFT: 'tech',
  AMZN: 'tech',
  PLTR: 'tech',
  SNOW: 'tech',
  SPY: 'tech',
  TSM: 'tech',
  HON: 'tech',
  CVX: 'energy',
  OXY: 'energy',
  BAC: 'finance',
  AXP: 'finance',
  KO: 'consumer',
  WMT: 'consumer',
  PG: 'consumer',
  COST: 'consumer',
  JNJ: 'healthcare',
  PFE: 'healthcare',
  UNH: 'healthcare',
  MRK: 'healthcare',
}

export function getSectorForTicker(ticker: string): Sector {
  return TICKER_SECTOR[ticker.toUpperCase()] ?? 'tech'
}

export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000_000) {
    const val = abs / 1_000_000_000_000
    return `$${val < 10 ? val.toFixed(1) : Math.round(val)}T`
  }
  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000
    return `$${val < 10 ? val.toFixed(1) : Math.round(val)}B`
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000
    return `$${val < 10 ? val.toFixed(1) : Math.round(val)}M`
  }
  const val = abs / 1_000
  return `$${val < 10 ? val.toFixed(1) : Math.round(val)}K`
}

export function formatPct(pct: number, signed = false): string {
  const rounded = pct.toFixed(1)
  if (signed && pct > 0) return `+${rounded}%`
  if (signed && pct < 0) return `${rounded}%`
  return `${rounded}%`
}

function parseValidDate(iso: string | null | undefined): Date | null {
  if (iso == null || !String(iso).trim()) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(iso: string): string {
  const date = parseValidDate(iso)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatShortDate(iso: string): string {
  const date = parseValidDate(iso)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-[#B5D4F4]', text: 'text-[#0C447C]' },
  green: { bg: 'bg-[#C0DD97]', text: 'text-[#27500A]' },
  amber: { bg: 'bg-[#FAC775]', text: 'text-[#633806]' },
  purple: { bg: 'bg-[#CECBF6]', text: 'text-[#3C3489]' },
  teal: { bg: 'bg-[#9FE1CB]', text: 'text-[#085041]' },
  coral: { bg: 'bg-[#F5C4B3]', text: 'text-[#712B13]' },
}

export function getAvatarColors(color: string): { bg: string; text: string } {
  return AVATAR_COLORS[color] ?? AVATAR_COLORS.blue
}

export function getCurrentQuarterLabel(date = new Date()): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `Q${quarter} ${date.getFullYear()}`
}

export function getFormBadgeColors(form: FormType): { bg: string; text: string } {
  switch (form) {
    case '13F':
      return {
        bg: 'bg-blue-100 dark:bg-blue-950',
        text: 'text-blue-800 dark:text-blue-400',
      }
    case '4':
      return {
        bg: 'bg-green-100 dark:bg-green-950',
        text: 'text-green-800 dark:text-green-400',
      }
    case '13D':
    case '13G':
      return {
        bg: 'bg-amber-100 dark:bg-amber-950',
        text: 'text-amber-800 dark:text-amber-400',
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-300',
      }
  }
}

export function formatTimeAgo(iso: string): string {
  const date = parseValidDate(iso)
  if (!date) return 'Date unknown'
  const then = date.getTime()
  const now = Date.now()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return `${Math.max(diffSec, 1)} sec ago`
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60)
    return mins === 1 ? '1 min ago' : `${mins} min ago`
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (diffSec < 172800) return 'Yesterday'
  const days = Math.floor(diffSec / 86400)
  if (days < 30) return `${days} days ago`
  return formatDate(iso)
}

export function formatRelativeTime(iso: string): string {
  const date = parseValidDate(iso)
  if (!date) return 'Date unknown'
  const then = date.getTime()
  const now = Date.now()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return `${Math.max(diffSec, 1)} sec ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 172800) return 'Filed yesterday'
  return `Filed ${formatDate(iso)}`
}

export function formatShares(shares: number): string {
  const abs = Math.abs(shares)
  if (abs >= 1_000_000_000_000) {
    const val = abs / 1_000_000_000_000
    return `${val < 10 ? val.toFixed(1) : Math.round(val)}T`
  }
  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000
    return `${val < 10 ? val.toFixed(1) : Math.round(val)}B`
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000
    return `${val < 10 ? val.toFixed(1) : Math.round(val)}M`
  }
  if (abs >= 1_000) {
    const val = abs / 1_000
    return `${val < 10 ? val.toFixed(1) : Math.round(val)}K`
  }
  return String(Math.round(abs))
}

export function formatSignedCurrency(amount: number): string {
  if (amount === 0) return formatCurrency(0)
  const prefix = amount > 0 ? '+' : '−'
  return `${prefix}${formatCurrency(amount)}`
}

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  hedge_fund: 'Hedge fund',
  pe_activist: 'PE / Activist',
  individual: 'Insider',
  mutual_fund: 'Mutual fund',
  value_fund: 'Value fund',
}

export function getInvestorTypeLabel(type: string): string {
  return INVESTOR_TYPE_LABELS[type] ?? type
}
