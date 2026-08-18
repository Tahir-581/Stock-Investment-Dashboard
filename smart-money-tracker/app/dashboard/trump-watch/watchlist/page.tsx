'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { CheckCircle, Search } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MetricCard } from '@/components/MetricCard'
import { PriceReactionBadge } from '@/components/trump/PriceReactionBadge'
import { TrumpWatchEmptyState } from '@/components/trump/TrumpWatchEmptyState'
import {
  mapWatchlistRow,
  formatPctMove,
  type WatchlistRow,
  type MappedWatchlistEntry,
} from '@/lib/trump/map-api'
import { formatTimeAgo } from '@/lib/utils'
import { swrFetcher } from '@/lib/swr-fetcher'

type SortKey = keyof MappedWatchlistEntry

type SortDir = 'asc' | 'desc'

function SortHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
}) {
  const active = currentKey === sortKey
  return (
    <th
      className="cursor-pointer whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

export default function TrumpWatchlistPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('totalMentions')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data, error, isLoading, mutate } = useSWR<WatchlistRow[]>(
    '/api/trump/watchlist',
    swrFetcher,
    { refreshInterval: 300000 }
  )

  const entries = useMemo(
    () => (data ?? []).map(mapWatchlistRow),
    [data]
  )

  const metrics = useMemo(() => {
    if (!entries.length) {
      return {
        totalTickers: 0,
        totalMentions: 0,
        mostPositive: '—',
        bestAvg24h: '—',
      }
    }
    const totalMentions = entries.reduce((s, e) => s + e.totalMentions, 0)
    const mostPositive = [...entries].sort(
      (a, b) => b.positiveCount - a.positiveCount
    )[0]
    const bestAvg24h = [...entries]
      .filter((e) => e.avg24hMove != null)
      .sort((a, b) => (b.avg24hMove ?? 0) - (a.avg24hMove ?? 0))[0]

    return {
      totalTickers: entries.length,
      totalMentions,
      mostPositive: mostPositive
        ? `${mostPositive.ticker} (${mostPositive.positiveCount})`
        : '—',
      bestAvg24h: bestAvg24h
        ? `${bestAvg24h.ticker} ${formatPctMove(bestAvg24h.avg24hMove)}`
        : '—',
    }
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = entries
    if (q) {
      list = list.filter(
        (e) =>
          e.ticker.toLowerCase().includes(q) ||
          e.companyName.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return sortDir === 'asc'
          ? Number(av) - Number(bv)
          : Number(bv) - Number(av)
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc'
          ? av.localeCompare(bv)
          : bv.localeCompare(av)
      }
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number)
    })
  }, [entries, search, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (isLoading) {
    return <LoadingSkeleton rows={8} columns={5} />
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load watchlist"
        onRetry={() => mutate()}
      />
    )
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          All-Time Watchlist
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          Every stock Trump has ever mentioned
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard
          label="Total tickers"
          value={String(metrics.totalTickers)}
          sub="Ever mentioned"
        />
        <MetricCard
          label="Total mentions"
          value={String(metrics.totalMentions)}
          sub="All-time"
        />
        <MetricCard
          label="Most positive"
          value={metrics.mostPositive.split(' ')[0]}
          sub={metrics.mostPositive.includes('(') ? metrics.mostPositive : undefined}
        />
        <MetricCard
          label="Best avg 24h"
          value={metrics.bestAvg24h.split(' ')[0]}
          sub={
            metrics.bestAvg24h !== '—'
              ? metrics.bestAvg24h.split(' ').slice(1).join(' ')
              : undefined
          }
        />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ticker or company…"
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-[13px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
      </div>

      {filtered.length === 0 ? (
        <TrumpWatchEmptyState
          showClearFilters={!!search}
          onClearFilters={() => setSearch('')}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[900px] text-[12px]">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500">
                  Rank
                </th>
                <SortHeader
                  label="Ticker"
                  sortKey="ticker"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Company"
                  sortKey="companyName"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Sector"
                  sortKey="sector"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Mentions"
                  sortKey="totalMentions"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Positive"
                  sortKey="positiveCount"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Negative"
                  sortKey="negativeCount"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Avg 1h"
                  sortKey="avg1hMove"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Avg 24h"
                  sortKey="avg24hMove"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Last mentioned"
                  sortKey="lastMentionedAt"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500">
                  Market-moving
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={row.ticker}
                  onClick={() =>
                    router.push(`/dashboard/trump-watch/${row.ticker}`)
                  }
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="px-3 py-2.5 text-gray-500">{index + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-gray-100">
                    {row.ticker}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                    {row.companyName}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {row.sector}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-gray-100">
                    {row.totalMentions}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-green-600 dark:text-green-400">
                    {row.positiveCount}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-red-600 dark:text-red-400">
                    {row.negativeCount}
                  </td>
                  <td className="px-3 py-2.5">
                    <PriceReactionBadge
                      pctMove={row.avg1hMove}
                      label=""
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <PriceReactionBadge
                      pctMove={row.avg24hMove}
                      label=""
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">
                    {formatTimeAgo(row.lastMentionedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.everMarketMoving ? (
                      <CheckCircle
                        className="size-4 text-green-600 dark:text-green-400"
                        aria-label="Ever market-moving"
                      />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
