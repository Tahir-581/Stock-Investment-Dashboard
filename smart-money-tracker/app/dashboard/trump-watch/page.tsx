'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Bell, RotateCw } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState'
import { FilterChips } from '@/components/FilterChips'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MetricCard } from '@/components/MetricCard'
import { MentionCard } from '@/components/trump/MentionCard'
import { TrumpWatchEmptyState } from '@/components/trump/TrumpWatchEmptyState'
import type { TrumpMention } from '@/lib/types'
import type { TrumpSentiment } from '@/lib/types'
import {
  mapTrumpMentionRow,
  formatPctMove,
  SOURCE_LABELS,
  type TrumpMentionRow,
  type TrumpStatsResponse,
} from '@/lib/trump/map-api'
import {
  getTrumpWatchStorage,
  updateTrumpWatchPreferences,
  type TrumpWatchPreferences,
} from '@/lib/trump-watch-alerts'
import { swrFetcher } from '@/lib/swr-fetcher'

const SENTIMENT_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Positive', value: 'positive' },
  { label: 'Negative', value: 'negative' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Mixed', value: 'mixed' },
]

const SOURCE_FILTERS = [
  { label: 'All sources', value: 'all' },
  { label: 'Truth Social', value: 'truth_social' },
  { label: 'Press Conference', value: 'press_conference' },
  { label: 'White House', value: 'whitehouse_remarks' },
  { label: 'Reuters/AP', value: 'reuters_ap' },
]

const SOURCE_BAR_COLORS: Record<string, string> = {
  truth_social: 'bg-orange-500',
  press_conference: 'bg-blue-500',
  whitehouse_remarks: 'bg-gray-500',
  reuters_ap: 'bg-red-500',
  financial_news: 'bg-purple-500',
}

const SENTIMENT_DOT: Record<TrumpSentiment, string> = {
  positive: 'bg-green-500',
  negative: 'bg-red-500',
  neutral: 'bg-gray-400',
  mixed: 'bg-yellow-500',
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-[12px] text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 size-4 rounded-full bg-white transition-transform',
            checked ? 'left-4' : 'left-0.5',
          ].join(' ')}
        />
      </button>
    </label>
  )
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function TrumpWatchPage() {
  const router = useRouter()
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [offset, setOffset] = useState(0)
  const [extraMentions, setExtraMentions] = useState<TrumpMention[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  const [prefs, setPrefs] = useState<TrumpWatchPreferences>(() =>
    typeof window !== 'undefined'
      ? getTrumpWatchStorage().preferences
      : {
          enabled: false,
          highConfidenceOnly: false,
          marketMovingOnly: false,
          email: '',
        }
  )

  useEffect(() => {
    setPrefs(getTrumpWatchStorage().preferences)
  }, [])

  const mentionsKey = `/api/trump/mentions?limit=20&offset=0`
  const {
    data: mentionsRaw,
    error: mentionsError,
    isLoading: mentionsLoading,
    mutate: refreshMentions,
  } = useSWR<TrumpMentionRow[]>(mentionsKey, swrFetcher, {
    refreshInterval: 30000,
  })

  const {
    data: stats,
    error: statsError,
    mutate: refreshStats,
  } = useSWR<TrumpStatsResponse>('/api/trump/stats', swrFetcher, {
    refreshInterval: 30000,
  })

  const baseMentions = useMemo(
    () => (mentionsRaw ?? []).map(mapTrumpMentionRow),
    [mentionsRaw]
  )

  const allMentions = useMemo(() => {
    const map = new Map<string, TrumpMention>()
    for (const m of [...baseMentions, ...extraMentions]) {
      if (m.id) map.set(m.id, m)
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
    )
  }, [baseMentions, extraMentions])

  useEffect(() => {
    if (mentionsRaw) {
      setLastUpdatedAt(Date.now())
      setOffset(0)
      setExtraMentions([])
    }
  }, [mentionsRaw])

  useEffect(() => {
    if (!allMentions.length) return
    const currentIds = new Set(
      allMentions.map((m) => m.id).filter(Boolean) as string[]
    )
    const fresh = new Set<string>()
    currentIds.forEach((id) => {
      if (!seenIdsRef.current.has(id)) fresh.add(id)
    })
    seenIdsRef.current = currentIds
    if (fresh.size > 0) setNewIds(fresh)
  }, [allMentions])

  useEffect(() => {
    if (!lastUpdatedAt) return
    const update = () =>
      setSecondsAgo(Math.floor((Date.now() - lastUpdatedAt) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lastUpdatedAt])

  const filteredMentions = useMemo(() => {
    return allMentions.filter((m) => {
      if (sentimentFilter !== 'all' && m.sentiment !== sentimentFilter) {
        return false
      }
      if (sourceFilter !== 'all' && m.sourceType !== sourceFilter) {
        return false
      }
      return true
    })
  }, [allMentions, sentimentFilter, sourceFilter])

  const hasActiveFilters =
    sentimentFilter !== 'all' || sourceFilter !== 'all'

  const todayMentions = useMemo(
    () => allMentions.filter((m) => isToday(m.postedAt)),
    [allMentions]
  )

  const topMentionedToday = useMemo(() => {
    const counts = new Map<
      string,
      { ticker: string; count: number; sentiments: TrumpSentiment[] }
    >()
    for (const m of todayMentions) {
      const cur = counts.get(m.ticker) ?? {
        ticker: m.ticker,
        count: 0,
        sentiments: [],
      }
      cur.count += 1
      cur.sentiments.push(m.sentiment)
      counts.set(m.ticker, cur)
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [todayMentions])

  const sourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of todayMentions) {
      counts.set(m.sourceType, (counts.get(m.sourceType) ?? 0) + 1)
    }
    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    const max = entries[0]?.[1] ?? 1
    return { entries, max }
  }, [todayMentions])

  const handleRefresh = useCallback(() => {
    refreshMentions()
    refreshStats()
    setLastUpdatedAt(Date.now())
  }, [refreshMentions, refreshStats])

  const handleLoadMore = useCallback(async () => {
    const nextOffset = offset + 20
    setLoadingMore(true)
    try {
      const rows = await swrFetcher<TrumpMentionRow[]>(
        `/api/trump/mentions?limit=20&offset=${nextOffset}`
      )
      const mapped = rows.map(mapTrumpMentionRow)
      setExtraMentions((prev) => {
        const map = new Map<string, TrumpMention>()
        for (const m of [...prev, ...mapped]) {
          if (m.id) map.set(m.id, m)
        }
        return Array.from(map.values())
      })
      setOffset(nextOffset)
    } finally {
      setLoadingMore(false)
    }
  }, [offset])

  function savePreferences() {
    updateTrumpWatchPreferences(prefs)
  }

  if (mentionsLoading && !mentionsRaw) {
    return (
      <div>
        <LoadingSkeleton rows={6} columns={1} />
      </div>
    )
  }

  if (mentionsError || statsError) {
    return (
      <ErrorState
        message="Failed to load Trump Watch data"
        onRetry={handleRefresh}
      />
    )
  }

  const avgMove = stats?.avgMarketMove ?? 0
  const biggestMover = stats?.biggestMover

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <div className="min-w-0 flex-1 lg:w-[65%]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Trump Watch
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Stocks mentioned by President Trump
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RotateCw className="size-3.5" aria-hidden />
              Manual refresh
            </button>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Last updated {secondsAgo} sec ago
            </span>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <MetricCard
            label="Mentions today"
            value={String(stats?.mentionsToday ?? 0)}
          />
          <MetricCard
            label="Tickers tracked"
            value={String(stats?.tickersTracked ?? 0)}
            sub="All-time"
          />
          <MetricCard
            label="Avg 24h move"
            value={formatPctMove(avgMove)}
            subPositive={avgMove >= 0}
          />
          <MetricCard
            label="Biggest mover"
            value={biggestMover?.ticker ?? '—'}
            sub={
              biggestMover ? formatPctMove(biggestMover.pct) : undefined
            }
            subPositive={(biggestMover?.pct ?? 0) >= 0}
          />
        </div>

        <div className="mb-3">
          <FilterChips
            options={SENTIMENT_FILTERS}
            selected={sentimentFilter}
            onChange={setSentimentFilter}
          />
        </div>
        <div className="mb-4">
          <FilterChips
            options={SOURCE_FILTERS}
            selected={sourceFilter}
            onChange={setSourceFilter}
          />
        </div>

        {filteredMentions.length === 0 ? (
          <TrumpWatchEmptyState
            showClearFilters={hasActiveFilters}
            onClearFilters={() => {
              setSentimentFilter('all')
              setSourceFilter('all')
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredMentions.map((mention) => (
              <MentionCard
                key={mention.id ?? `${mention.ticker}-${mention.postedAt}`}
                mention={mention}
                animate={mention.id ? newIds.has(mention.id) : false}
              />
            ))}
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mx-auto mt-2 rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 lg:sticky lg:top-16 lg:w-[35%] lg:self-start">
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="size-4 text-gray-700 dark:text-gray-300" />
            <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
              Alert settings
            </span>
          </div>
          <ToggleSwitch
            checked={prefs.enabled}
            onChange={(v) => setPrefs((p) => ({ ...p, enabled: v }))}
            label="Alert me when Trump mentions a stock"
          />
          {prefs.enabled ? (
            <>
              <ToggleSwitch
                checked={prefs.highConfidenceOnly}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, highConfidenceOnly: v }))
                }
                label="Only high-confidence mentions (≥ 0.9)"
              />
              <ToggleSwitch
                checked={prefs.marketMovingOnly}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, marketMovingOnly: v }))
                }
                label="Only market-moving mentions"
              />
            </>
          ) : null}
          <div className="mt-2">
            <label className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
              Notify at:
            </label>
            <input
              type="email"
              value={prefs.email}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="you@email.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>
          <button
            type="button"
            onClick={savePreferences}
            className="mt-3 w-full rounded-lg bg-gray-900 py-2 text-[12px] font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Save
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-[13px] font-medium text-gray-900 dark:text-gray-100">
            Most mentioned today
          </h3>
          {topMentionedToday.length === 0 ? (
            <p className="text-[12px] text-gray-400">No mentions today yet</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Ticker</th>
                  <th className="pb-2 font-medium">Count</th>
                  <th className="pb-2 font-medium">Sent.</th>
                </tr>
              </thead>
              <tbody>
                {topMentionedToday.map((row, i) => {
                  const dominant = row.sentiments.sort(
                    (a, b) =>
                      row.sentiments.filter((s) => s === b).length -
                      row.sentiments.filter((s) => s === a).length
                  )[0]
                  return (
                    <tr
                      key={row.ticker}
                      className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                      onClick={() =>
                        router.push(
                          `/dashboard/trump-watch/${row.ticker}`
                        )
                      }
                    >
                      <td className="py-2 text-gray-500">{i + 1}</td>
                      <td className="py-2 font-semibold text-gray-900 dark:text-gray-100">
                        {row.ticker}
                      </td>
                      <td className="py-2">{row.count}</td>
                      <td className="py-2">
                        <span
                          className={`inline-block size-2 rounded-full ${SENTIMENT_DOT[dominant]}`}
                          title={dominant}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="hidden rounded-xl border border-gray-200 bg-white p-4 md:block dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-[13px] font-medium text-gray-900 dark:text-gray-100">
            Source breakdown
          </h3>
          {sourceBreakdown.entries.length === 0 ? (
            <p className="text-[12px] text-gray-400">No data today</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sourceBreakdown.entries.map(([source, count]) => (
                <div key={source} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-[11px] text-gray-600 dark:text-gray-400">
                    {SOURCE_LABELS[source] ?? source}
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${SOURCE_BAR_COLORS[source] ?? 'bg-gray-400'}`}
                      style={{
                        width: `${(count / sourceBreakdown.max) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11px] text-gray-500">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-gray-400">
          <Link
            href="/dashboard/trump-watch/alerts"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Manage all alerts →
          </Link>
        </p>
      </aside>
    </div>
  )
}
