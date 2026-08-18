import type {
  TrumpMention,
  TrumpMentionType,
  TrumpSentiment,
  TrumpSourceType,
} from '@/lib/types'

export type TrumpMentionRow = {
  id: string
  created_at?: string
  ticker: string
  company_name: string
  sector?: string
  sentiment: TrumpSentiment
  mention_type?: TrumpMentionType
  trump_quote: string
  context?: string
  confidence: number
  market_impact_likely: number | boolean
  source_type: TrumpSourceType | string
  source_url: string
  source_title?: string
  posted_at: string
  price_at_mention?: number | null
  price_1h_after?: number | null
  price_8h_after?: number | null
  price_16h_after?: number | null
  price_24h_after?: number | null
  pct_move_1h?: number | null
  pct_move_8h?: number | null
  pct_move_16h?: number | null
  pct_move_24h?: number | null
  source_post_id: string
}

export type TrumpQuoteResponse = {
  ticker: string
  currentPrice: number | null
  updatedAt: string
  marketState?: string
}

export type WatchlistRow = {
  ticker: string
  company_name: string
  sector: string
  total_mentions: number
  positive_count: number
  negative_count: number
  neutral_count: number
  avg_confidence: number
  avg_24h_move: number | null
  avg_1h_move: number | null
  last_mentioned_at: string
  first_mentioned_at: string
  ever_market_moving: number | boolean
}

export type TrumpStatsResponse = {
  totalMentions: number
  mentionsToday: number
  tickersTracked: number
  avgMarketMove: number
  biggestMover: { ticker: string; pct: number } | null
  lastCheckedAt: string
}

export type MappedWatchlistEntry = {
  ticker: string
  companyName: string
  sector: string
  totalMentions: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  avgConfidence: number
  avg24hMove: number | null
  avg1hMove: number | null
  lastMentionedAt: string
  firstMentionedAt: string
  everMarketMoving: boolean
}

function toBool(value: number | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value
  return value === 1
}

export function mapTrumpMentionRow(row: TrumpMentionRow): TrumpMention {
  return {
    id: row.id,
    createdAt: row.created_at,
    ticker: row.ticker,
    companyName: row.company_name,
    sector: row.sector,
    sentiment: row.sentiment,
    mentionType: row.mention_type,
    trumpQuote: row.trump_quote,
    context: row.context,
    confidence: row.confidence,
    marketImpactLikely: toBool(row.market_impact_likely),
    sourceType: row.source_type as TrumpSourceType,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    postedAt: row.posted_at,
    priceAtMention: row.price_at_mention,
    price1hAfter: row.price_1h_after,
    price8hAfter: row.price_8h_after,
    price16hAfter: row.price_16h_after,
    price24hAfter: row.price_24h_after,
    pctMove1h: row.pct_move_1h,
    pctMove8h: row.pct_move_8h,
    pctMove16h: row.pct_move_16h,
    pctMove24h: row.pct_move_24h,
    sourcePostId: row.source_post_id,
  }
}

export function mapWatchlistRow(row: WatchlistRow): MappedWatchlistEntry {
  return {
    ticker: row.ticker,
    companyName: row.company_name,
    sector: row.sector,
    totalMentions: row.total_mentions,
    positiveCount: row.positive_count,
    negativeCount: row.negative_count,
    neutralCount: row.neutral_count,
    avgConfidence: row.avg_confidence,
    avg24hMove: row.avg_24h_move,
    avg1hMove: row.avg_1h_move,
    lastMentionedAt: row.last_mentioned_at,
    firstMentionedAt: row.first_mentioned_at,
    everMarketMoving: toBool(row.ever_market_moving),
  }
}

export function formatPctMove(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `$${value.toFixed(2)}`
}

export function isCheckpointReady(postedAt: string, hours: number): boolean {
  const elapsed = Date.now() - new Date(postedAt).getTime()
  return elapsed >= hours * 60 * 60 * 1000
}

export function computePctMoveFromPrices(
  base: number | null | undefined,
  current: number | null | undefined
): number | null {
  if (base == null || current == null || base === 0) return null
  return Math.round(((current - base) / base) * 10000) / 100
}

export function formatCheckpointMove(
  pct: number | null | undefined,
  ready: boolean
): string {
  if (!ready) return 'Pending'
  return formatPctMove(pct)
}

export function getCheckpointMoveClass(
  pct: number | null | undefined,
  ready: boolean
): string {
  if (!ready || pct == null || Number.isNaN(pct)) {
    return 'text-gray-400 dark:text-gray-500'
  }
  return pct >= 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
}

export function getLiveMoveClass(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) {
    return 'text-gray-700 dark:text-gray-300'
  }
  return pct >= 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
}

export const QUOTE_BORDER_COLORS = [
  'border-l-blue-500',
  'border-l-green-500',
  'border-l-purple-500',
  'border-l-orange-500',
  'border-l-pink-500',
  'border-l-teal-500',
] as const

export function hashTicker(ticker: string): number {
  let hash = 0
  for (let i = 0; i < ticker.length; i++) {
    hash = (hash + ticker.charCodeAt(i) * (i + 1)) % 1000
  }
  return hash
}

export function getQuoteBorderColor(ticker: string): string {
  return QUOTE_BORDER_COLORS[hashTicker(ticker) % QUOTE_BORDER_COLORS.length]
}

export function getSourcePostBaseId(sourcePostId: string): string {
  const lastUnderscore = sourcePostId.lastIndexOf('_')
  if (lastUnderscore <= 0) return sourcePostId
  const suffix = sourcePostId.slice(lastUnderscore + 1)
  if (/^[A-Z]{1,5}$/.test(suffix)) {
    return sourcePostId.slice(0, lastUnderscore)
  }
  return sourcePostId
}

export const SOURCE_LABELS: Record<string, string> = {
  truth_social: 'Truth Social',
  press_conference: 'Press Conference',
  whitehouse_remarks: 'White House',
  reuters_ap: 'Reuters/AP',
  financial_news: 'Financial News',
}
