import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({
  queue: { concurrency: 1 },
  suppressNotices: ['yahooSurvey'],
})

export const CHECKPOINT_HOURS = [1, 8, 16, 24] as const
export type CheckpointHour = (typeof CHECKPOINT_HOURS)[number]

const YAHOO_DELAY_MS = 1500
const YAHOO_MAX_RETRIES = 5
const YAHOO_BACKOFF_MS = [3000, 6000, 12000, 24000, 48000]

const priceCache = new Map<string, number | null>()
const unpriceableTickers = new Set<string>()

export class YahooRateLimitError extends Error {
  constructor(message = 'Yahoo Finance rate limit exceeded') {
    super(message)
    this.name = 'YahooRateLimitError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function isRateLimitError(err: unknown): boolean {
  const message = errorMessage(err)
  return (
    message.includes('Too Many Requests') ||
    message.includes('429') ||
    message.includes("Unexpected token 'T'")
  )
}

function isUnpriceableError(err: unknown): boolean {
  const message = errorMessage(err)
  return (
    message.includes('No data found') ||
    message.includes('delisted') ||
    message.includes('Not Found')
  )
}

function markUnpriceable(ticker: string, err: unknown): void {
  if (unpriceableTickers.has(ticker)) return
  unpriceableTickers.add(ticker)
  console.warn(
    `Price unavailable for ${ticker} (${errorMessage(err)}) — skipping further Yahoo lookups`
  )
}

function isTickerUnpriceable(ticker: string): boolean {
  return unpriceableTickers.has(ticker)
}

async function withYahooDelay<T>(fn: () => Promise<T>): Promise<T> {
  await sleep(YAHOO_DELAY_MS)
  return fn()
}

async function yahooCall<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= YAHOO_MAX_RETRIES; attempt++) {
    try {
      return await withYahooDelay(fn)
    } catch (err) {
      if (isRateLimitError(err) && attempt < YAHOO_MAX_RETRIES) {
        await sleep(YAHOO_BACKOFF_MS[attempt] ?? 48000)
        continue
      }
      if (isRateLimitError(err)) {
        throw new YahooRateLimitError(String(err))
      }
      throw err
    }
  }
  throw new YahooRateLimitError('yahooCall exhausted retries')
}

function cacheKey(
  ticker: string,
  interval: string,
  period1: Date,
  period2: Date
): string {
  return `${ticker}|${interval}|${period1.toISOString()}|${period2.toISOString()}`
}

const CHECKPOINT_FIELDS: Record<
  CheckpointHour,
  { price: string; pct: string }
> = {
  1: { price: 'price_1h_after', pct: 'pct_move_1h' },
  8: { price: 'price_8h_after', pct: 'pct_move_8h' },
  16: { price: 'price_16h_after', pct: 'pct_move_16h' },
  24: { price: 'price_24h_after', pct: 'pct_move_24h' },
}

const MENTIONS_NEEDING_PRICES_SQL = `
  SELECT
    id, ticker, posted_at, price_at_mention,
    price_1h_after, price_8h_after, price_16h_after, price_24h_after
  FROM trump_mentions
  WHERE ticker != 'PRIVATE'
  AND COALESCE(prices_unavailable, 0) = 0
  AND (
    price_at_mention IS NULL
    OR (price_1h_after IS NULL AND datetime(posted_at, '+1 hour') < datetime('now'))
    OR (price_8h_after IS NULL AND datetime(posted_at, '+8 hours') < datetime('now'))
    OR (price_16h_after IS NULL AND datetime(posted_at, '+16 hours') < datetime('now'))
    OR (price_24h_after IS NULL AND datetime(posted_at, '+24 hours') < datetime('now'))
  )
  ORDER BY posted_at ASC
`

export async function fetchCurrentPrice(ticker: string): Promise<number | null> {
  if (ticker === 'PRIVATE' || isTickerUnpriceable(ticker)) return null

  const key = `${ticker}|quote|current`
  if (priceCache.has(key)) return priceCache.get(key) ?? null

  try {
    const quote = await yahooCall(() => yahooFinance.quote(ticker))
    const price = quote.regularMarketPrice ?? null
    priceCache.set(key, price)
    return price
  } catch (err) {
    if (err instanceof YahooRateLimitError) throw err
    if (isUnpriceableError(err)) {
      markUnpriceable(ticker, err)
      return null
    }
    console.warn(`fetchCurrentPrice failed for ${ticker}: ${errorMessage(err)}`)
    return null
  }
}

export async function fetchHistoricalPrice(
  ticker: string,
  date: string
): Promise<number | null> {
  if (ticker === 'PRIVATE' || isTickerUnpriceable(ticker)) return null

  const dateObj = new Date(date)
  const nextDay = new Date(dateObj)
  nextDay.setDate(nextDay.getDate() + 2)

  const key = cacheKey(ticker, '1d', dateObj, nextDay)
  if (priceCache.has(key)) return priceCache.get(key) ?? null

  try {
    const result = await yahooCall(() =>
      yahooFinance.chart(ticker, {
        period1: dateObj,
        period2: nextDay,
        interval: '1d',
      })
    )

    const quotes = result.quotes?.filter((q) => q.close != null) ?? []
    const price = quotes[0]?.close ?? null
    priceCache.set(key, price)
    return price
  } catch (err) {
    if (err instanceof YahooRateLimitError) throw err
    if (isUnpriceableError(err)) {
      markUnpriceable(ticker, err)
      return null
    }
    console.warn(`fetchHistoricalPrice failed for ${ticker}: ${errorMessage(err)}`)
    return null
  }
}

function closestQuoteClose(
  quotes: { date: Date; close: number | null }[],
  target: Date
): number | null {
  const valid = quotes.filter((q) => q.close != null)
  if (valid.length === 0) return null

  let closest = valid[0]
  let minDiff = Math.abs(closest.date.getTime() - target.getTime())
  for (const q of valid) {
    const diff = Math.abs(q.date.getTime() - target.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closest = q
    }
  }
  return closest.close ?? null
}

export async function fetchPriceNearTimestamp(
  ticker: string,
  isoTimestamp: string
): Promise<number | null> {
  if (ticker === 'PRIVATE' || isTickerUnpriceable(ticker)) return null

  const target = new Date(isoTimestamp)
  const now = new Date()
  const ageMs = now.getTime() - target.getTime()

  if (ageMs >= 0 && ageMs < 15 * 60 * 1000) {
    const current = await fetchCurrentPrice(ticker)
    if (current != null) return current
  }

  const hoursSinceTarget = ageMs / (60 * 60 * 1000)

  if (hoursSinceTarget <= 48) {
    const windowMs = 30 * 60 * 1000
    const period1 = new Date(target.getTime() - windowMs)
    const period2 = new Date(target.getTime() + windowMs)

    const key = cacheKey(ticker, '5m', period1, period2)
    if (priceCache.has(key)) return priceCache.get(key) ?? null

    try {
      const result = await yahooCall(() =>
        yahooFinance.chart(ticker, {
          period1,
          period2,
          interval: '5m',
        })
      )

      const price = closestQuoteClose(result.quotes ?? [], target)
      priceCache.set(key, price)
      if (price != null) return price
    } catch (err) {
      if (err instanceof YahooRateLimitError) throw err
      if (isUnpriceableError(err)) {
        markUnpriceable(ticker, err)
        return null
      }
      console.warn(`Intraday chart failed for ${ticker}: ${errorMessage(err)}`)
    }
  }

  return fetchHistoricalPrice(ticker, isoTimestamp)
}

export function computePctMove(
  base: number,
  price: number
): number {
  return Math.round(((price - base) / base) * 10000) / 100
}

export async function enrichWithPrice(mentionData: {
  ticker: string
  postedAt: string
}): Promise<{ priceAtMention: number | null }> {
  const price = await fetchPriceNearTimestamp(
    mentionData.ticker,
    mentionData.postedAt
  )
  return { priceAtMention: price }
}

type MentionRow = {
  id: string
  ticker: string
  posted_at: string
  price_at_mention: number | null
  price_1h_after: number | null
  price_8h_after: number | null
  price_16h_after: number | null
  price_24h_after: number | null
}

function checkpointPriceField(hours: CheckpointHour): keyof MentionRow {
  return CHECKPOINT_FIELDS[hours].price as keyof MentionRow
}

function isCheckpointEligible(postedAt: string, hours: number): boolean {
  const target = new Date(postedAt).getTime() + hours * 60 * 60 * 1000
  return Date.now() >= target
}

function interpolateCheckpointPrice(
  row: MentionRow,
  hours: CheckpointHour
): number | null {
  if (hours <= 1 || hours >= 24) return null
  const price1h = row.price_1h_after
  const price24h = row.price_24h_after
  if (price1h == null || price24h == null) return null

  const t = (hours - 1) / 23
  return Math.round((price1h + (price24h - price1h) * t) * 100) / 100
}

export async function enrichMentionPrices(row: MentionRow): Promise<number> {
  const { updatePrices, markPricesUnavailable } = await import('./db')
  let fieldsUpdated = 0

  let basePrice = row.price_at_mention

  if (basePrice == null) {
    basePrice = await fetchPriceNearTimestamp(row.ticker, row.posted_at)
    if (basePrice != null) {
      updatePrices(row.id, { price_at_mention: basePrice })
      fieldsUpdated++
    } else if (isTickerUnpriceable(row.ticker)) {
      markPricesUnavailable(row.id)
      return fieldsUpdated
    }
  }

  if (basePrice == null) return fieldsUpdated

  for (const hours of CHECKPOINT_HOURS) {
    const priceKey = checkpointPriceField(hours)
    if (row[priceKey] != null) continue
    if (!isCheckpointEligible(row.posted_at, hours)) continue

    const checkpointTime = new Date(
      new Date(row.posted_at).getTime() + hours * 60 * 60 * 1000
    ).toISOString()

    let checkpointPrice = await fetchPriceNearTimestamp(
      row.ticker,
      checkpointTime
    )
    if (checkpointPrice == null) {
      checkpointPrice = interpolateCheckpointPrice(row, hours)
    }
    if (checkpointPrice == null) continue

    const pct = computePctMove(basePrice, checkpointPrice)
    switch (hours) {
      case 1:
        updatePrices(row.id, {
          price_1h_after: checkpointPrice,
          pct_move_1h: pct,
        })
        break
      case 8:
        updatePrices(row.id, {
          price_8h_after: checkpointPrice,
          pct_move_8h: pct,
        })
        break
      case 16:
        updatePrices(row.id, {
          price_16h_after: checkpointPrice,
          pct_move_16h: pct,
        })
        break
      case 24:
        updatePrices(row.id, {
          price_24h_after: checkpointPrice,
          pct_move_24h: pct,
        })
        break
    }
    fieldsUpdated++
  }

  return fieldsUpdated
}

export async function updatePastPriceReactions(
  limit = 20
): Promise<number> {
  const result = await backfillAllTrumpPrices({ limit })
  return result.updated
}

export type BackfillProgress = {
  index: number
  total: number
  ticker: string
  mentionId: string
}

export type BackfillResult = {
  fieldsUpdated: number
  updated: number
  skipped: number
  rateLimited: number
  total: number
}

export async function backfillAllTrumpPrices(options?: {
  limit?: number
  batchSize?: number
  onProgress?: (progress: BackfillProgress) => void
}): Promise<BackfillResult> {
  const { getDb } = await import('./db')
  const db = getDb()

  const limit = options?.limit
  const batchSize = options?.batchSize ?? 10

  const sql =
    limit != null
      ? `${MENTIONS_NEEDING_PRICES_SQL}\n  LIMIT ?`
      : MENTIONS_NEEDING_PRICES_SQL

  const rows = (
    limit != null
      ? db.prepare(sql).all(limit)
      : db.prepare(sql).all()
  ) as MentionRow[]

  let fieldsUpdated = 0
  let updated = 0
  let skipped = 0
  let rateLimited = 0
  let batchHadRateLimit = false

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    options?.onProgress?.({
      index: i + 1,
      total: rows.length,
      ticker: row.ticker,
      mentionId: row.id,
    })

    try {
      const count = await enrichMentionPrices(row)
      fieldsUpdated += count
      if (count > 0) {
        updated++
      } else {
        skipped++
      }
    } catch (err) {
      if (err instanceof YahooRateLimitError) {
        rateLimited++
        batchHadRateLimit = true
        console.warn(`Rate limited for mention ${row.id} (${row.ticker})`)
      } else {
        console.warn(`Backfill failed for mention ${row.id}:`, err)
        skipped++
      }
    }

    const isEndOfBatch =
      (i + 1) % batchSize === 0 || i === rows.length - 1
    if (isEndOfBatch && batchHadRateLimit && i < rows.length - 1) {
      console.log('Rate limit detected in batch — pausing 5s before continuing...')
      await sleep(5000)
      batchHadRateLimit = false
    }
  }

  return {
    fieldsUpdated,
    updated,
    skipped,
    rateLimited,
    total: rows.length,
  }
}
