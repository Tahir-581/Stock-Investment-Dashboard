'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MentionCard } from '@/components/trump/MentionCard'
import { TrumpWatchEmptyState } from '@/components/trump/TrumpWatchEmptyState'
import {
  SOURCE_LABELS,
  mapTrumpMentionRow,
  mapWatchlistRow,
  formatPctMove,
  formatPrice,
  getSourcePostBaseId,
  isCheckpointReady,
  computePctMoveFromPrices,
  formatCheckpointMove,
  getCheckpointMoveClass,
  getLiveMoveClass,
  type TrumpMentionRow,
  type TrumpQuoteResponse,
  type WatchlistRow,
} from '@/lib/trump/map-api'
import type { TrumpMention } from '@/lib/types'
import { formatTimeAgo, formatDate } from '@/lib/utils'
import { swrFetcher } from '@/lib/swr-fetcher'

const QUOTE_REFRESH_MS = 300_000
const CHECKPOINT_COLUMNS = [
  { hours: 1, label: '+1h', getPct: (m: TrumpMention) => m.pctMove1h },
  { hours: 8, label: '+8h', getPct: (m: TrumpMention) => m.pctMove8h },
  { hours: 16, label: '+16h', getPct: (m: TrumpMention) => m.pctMove16h },
  { hours: 24, label: '+24h', getPct: (m: TrumpMention) => m.pctMove24h },
] as const

function truncateQuote(text: string, max = 80): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

function groupByMonth(mentions: TrumpMention[]): Map<string, TrumpMention[]> {
  const groups = new Map<string, TrumpMention[]>()
  for (const m of mentions) {
    const d = new Date(m.postedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const list = groups.get(key) ?? []
    list.push(m)
    groups.set(key, list)
  }
  return new Map(
    Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  )
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export default function TrumpTickerPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = String(params.ticker ?? '').toUpperCase()

  const mentionsKey = `/api/trump/mentions?ticker=${encodeURIComponent(ticker)}&limit=50`
  const quoteKey =
    ticker && ticker !== 'PRIVATE'
      ? `/api/trump/quote?ticker=${encodeURIComponent(ticker)}`
      : null

  const {
    data: mentionsRaw,
    error: mentionsError,
    isLoading: mentionsLoading,
    mutate: refreshMentions,
  } = useSWR<TrumpMentionRow[]>(mentionsKey, swrFetcher)

  const { data: watchlistRaw } = useSWR<WatchlistRow[]>(
    '/api/trump/watchlist',
    swrFetcher
  )

  const { data: quote } = useSWR<TrumpQuoteResponse>(quoteKey, swrFetcher, {
    refreshInterval: QUOTE_REFRESH_MS,
  })

  const mentions = useMemo(
    () => (mentionsRaw ?? []).map(mapTrumpMentionRow),
    [mentionsRaw]
  )

  const watchlistEntry = useMemo(() => {
    const row = (watchlistRaw ?? []).find(
      (r) => r.ticker.toUpperCase() === ticker
    )
    return row ? mapWatchlistRow(row) : null
  }, [watchlistRaw, ticker])

  const currentPrice = quote?.currentPrice ?? null
  const latestMention = mentions[0] ?? null
  const sinceLastMentionPct = computePctMoveFromPrices(
    latestMention?.priceAtMention,
    currentPrice
  )

  const companyName =
    watchlistEntry?.companyName ?? mentions[0]?.companyName ?? ticker
  const sector = watchlistEntry?.sector ?? mentions[0]?.sector ?? '—'

  const sentimentTotal = watchlistEntry
    ? watchlistEntry.positiveCount +
      watchlistEntry.negativeCount +
      watchlistEntry.neutralCount
    : 0

  const sentimentPcts = watchlistEntry && sentimentTotal > 0
    ? {
        positive: (watchlistEntry.positiveCount / sentimentTotal) * 100,
        neutral: (watchlistEntry.neutralCount / sentimentTotal) * 100,
        negative: (watchlistEntry.negativeCount / sentimentTotal) * 100,
      }
    : null

  const groupedMentions = useMemo(
    () => groupByMonth(mentions),
    [mentions]
  )

  const relatedTickers = useMemo(() => {
    const related = new Set<string>()
    for (const m of mentions) {
      const baseId = getSourcePostBaseId(m.sourcePostId)
      for (const other of mentions) {
        if (other.ticker === ticker) continue
        if (getSourcePostBaseId(other.sourcePostId) === baseId) {
          related.add(other.ticker)
        }
      }
    }
    return Array.from(related)
  }, [mentions, ticker])

  const priceDataPoints = mentions.filter(
    (m) =>
      m.pctMove1h != null ||
      m.pctMove8h != null ||
      m.pctMove16h != null ||
      m.pctMove24h != null
  ).length

  if (mentionsLoading) {
    return <LoadingSkeleton rows={6} columns={1} />
  }

  if (mentionsError) {
    return (
      <ErrorState
        message="Failed to load ticker mentions"
        onRetry={() => refreshMentions()}
      />
    )
  }

  return (
    <div>
      <nav className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">
        <Link
          href="/dashboard/trump-watch"
          className="hover:text-blue-600 dark:hover:text-blue-400"
        >
          Trump Watch
        </Link>
        <span className="mx-2">→</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {ticker}
        </span>
      </nav>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-gray-900 px-3 py-1 text-[20px] font-bold text-white dark:bg-gray-100 dark:text-gray-900">
            {ticker}
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {companyName}
          </h1>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {sector}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <StatPill
            label="Total mentions"
            value={String(watchlistEntry?.totalMentions ?? mentions.length)}
          />
          <StatPill
            label="First mentioned"
            value={
              watchlistEntry?.firstMentionedAt
                ? formatDate(watchlistEntry.firstMentionedAt)
                : mentions.length
                  ? formatDate(mentions[mentions.length - 1].postedAt)
                  : '—'
            }
          />
          <StatPill
            label="Last mentioned"
            value={
              watchlistEntry?.lastMentionedAt
                ? formatTimeAgo(watchlistEntry.lastMentionedAt)
                : mentions[0]
                  ? formatTimeAgo(mentions[0].postedAt)
                  : '—'
            }
          />
          <StatPill
            label="Current price"
            value={formatPrice(currentPrice)}
          />
          <StatPill
            label="Since last mention"
            value={
              sinceLastMentionPct != null
                ? formatPctMove(sinceLastMentionPct)
                : '—'
            }
            valueClassName={getLiveMoveClass(sinceLastMentionPct)}
          />
          <StatPill
            label="Avg 24h move"
            value={formatPctMove(watchlistEntry?.avg24hMove)}
          />
          <StatPill label="Sentiment" value="Breakdown →" />
        </div>

        {sentimentPcts ? (
          <div className="flex h-3 overflow-hidden rounded-full">
            <div
              className="bg-green-500"
              style={{ width: `${sentimentPcts.positive}%` }}
              title={`Positive ${sentimentPcts.positive.toFixed(0)}%`}
            />
            <div
              className="bg-gray-400"
              style={{ width: `${sentimentPcts.neutral}%` }}
              title={`Neutral ${sentimentPcts.neutral.toFixed(0)}%`}
            />
            <div
              className="bg-red-500"
              style={{ width: `${sentimentPcts.negative}%` }}
              title={`Negative ${sentimentPcts.negative.toFixed(0)}%`}
            />
          </div>
        ) : null}
        {sentimentPcts ? (
          <div className="mt-1.5 flex gap-4 text-[10px] text-gray-500">
            <span className="text-green-600">
              {sentimentPcts.positive.toFixed(0)}% positive
            </span>
            <span>{sentimentPcts.neutral.toFixed(0)}% neutral</span>
            <span className="text-red-600">
              {sentimentPcts.negative.toFixed(0)}% negative
            </span>
          </div>
        ) : null}
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-[13px] font-medium text-gray-900 dark:text-gray-100">
          All quotes from Trump
        </h2>
        {mentions.length === 0 ? (
          <TrumpWatchEmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {Array.from(groupedMentions.entries()).map(([monthKey, group]) => (
              <div key={monthKey}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">
                    {formatMonthLabel(monthKey)}
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                </div>
                <div className="flex flex-col gap-3">
                  {group.map((mention) => (
                    <MentionCard
                      key={
                        mention.id ??
                        `${mention.postedAt}-${mention.ticker}`
                      }
                      mention={mention}
                      currentPrice={currentPrice}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-[13px] font-medium text-gray-900 dark:text-gray-100">
          Price reaction history
        </h2>
        {mentions.length === 0 ? (
          <TrumpWatchEmptyState />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full min-w-[960px] text-[12px]">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Quote
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Source
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">
                      Price
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">
                      Now
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">
                      Since news
                    </th>
                    {CHECKPOINT_COLUMNS.map((col) => (
                      <th
                        key={col.label}
                        className="px-3 py-2 text-right font-medium text-gray-500"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mentions.map((m) => {
                    const sinceNewsPct = computePctMoveFromPrices(
                      m.priceAtMention,
                      currentPrice
                    )
                    return (
                      <tr
                        key={m.id ?? m.postedAt}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                          {formatDate(m.postedAt)}
                        </td>
                        <td className="max-w-xs px-3 py-2 italic text-gray-600 dark:text-gray-400">
                          {truncateQuote(m.trumpQuote)}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {SOURCE_LABELS[m.sourceType] ?? m.sourceType}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatPrice(m.priceAtMention)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatPrice(currentPrice)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${getLiveMoveClass(sinceNewsPct)}`}
                        >
                          {sinceNewsPct != null
                            ? formatPctMove(sinceNewsPct)
                            : '—'}
                        </td>
                        {CHECKPOINT_COLUMNS.map((col) => {
                          const ready = isCheckpointReady(m.postedAt, col.hours)
                          const pct = col.getPct(m)
                          return (
                            <td
                              key={col.label}
                              className={`px-3 py-2 text-right font-medium ${getCheckpointMoveClass(pct, ready)}`}
                            >
                              {formatCheckpointMove(pct, ready)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Live price refreshes every 5 minutes. Based on {priceDataPoints}{' '}
              checkpoint data point{priceDataPoints === 1 ? '' : 's'}.
            </p>
          </>
        )}
      </section>

      {relatedTickers.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[13px] font-medium text-gray-900 dark:text-gray-100">
            Related mentions
          </h2>
          <p className="mb-2 text-[12px] text-gray-500 dark:text-gray-400">
            Other tickers mentioned in the same post
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedTickers.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => router.push(`/dashboard/trump-watch/${t}`)}
                className="rounded-full bg-gray-100 px-3 py-1 text-[12px] font-semibold text-gray-800 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-blue-950 dark:hover:text-blue-400"
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function StatPill({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
      <div className="text-[10px] text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div
        className={`text-[13px] font-semibold text-gray-900 dark:text-gray-100 ${valueClassName ?? ''}`}
      >
        {value}
      </div>
    </div>
  )
}
