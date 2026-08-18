'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { ErrorState } from '@/components/ErrorState'
import { FeedSkeleton } from '@/components/FeedSkeleton'
import { FilingFeedItem } from '@/components/FilingFeedItem'
import { FilterChips } from '@/components/FilterChips'
import { MetricCard } from '@/components/MetricCard'
import type { Filing } from '@/lib/types'
import { swrFetcher } from '@/lib/swr-fetcher'
import { formatCurrency } from '@/lib/utils'

const FEED_FILTERS = [
  { label: 'All Forms', value: 'all' },
  { label: '13F', value: '13F' },
  { label: 'Form 4', value: '4' },
  { label: '13D/G', value: '13DG' },
  { label: 'Hedge Funds', value: 'hedge_fund' },
  { label: 'PE', value: 'pe' },
  { label: 'Insiders', value: 'insiders' },
]

function filterFilings(filings: Filing[], filter: string): Filing[] {
  switch (filter) {
    case '13F':
      return filings.filter((f) => f.formType === '13F')
    case '4':
      return filings.filter((f) => f.formType === '4')
    case '13DG':
      return filings.filter(
        (f) => f.formType === '13D' || f.formType === '13G'
      )
    case 'hedge_fund':
      return filings.filter((f) => f.investorType === 'hedge_fund')
    case 'pe':
      return filings.filter((f) => f.investorType === 'pe_activist')
    case 'insiders':
      return filings.filter((f) => f.investorType === 'individual')
    default:
      return filings
  }
}

function computeFeedMetrics(filings: Filing[]) {
  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000

  const last24h = filings.filter(
    (f) => new Date(f.filedAt).getTime() >= dayAgo
  )

  const totalValue = filings.reduce(
    (sum, f) => sum + Math.abs(f.amount ?? f.aum ?? 0),
    0
  )

  const insiderBuys = filings.filter(
    (f) => f.formType === '4' && f.action === 'buy'
  ).length

  const newThirteenDG = filings.filter(
    (f) =>
      (f.formType === '13D' || f.formType === '13G') &&
      (f.action === 'new' || f.action === 'increased')
  ).length

  const tickerCount = new Set(
    filings.filter((f) => f.ticker).map((f) => f.ticker)
  ).size

  return {
    filingsToday: last24h.length,
    totalValue,
    insiderBuys,
    newThirteenDG,
    tickerCount,
  }
}

export default function FeedPage() {
  const [filter, setFilter] = useState('all')
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  const { data, error, isLoading, mutate } = useSWR<{
    filings: Filing[]
  }>('/api/filings', swrFetcher, { refreshInterval: 60000 })

  const filings = useMemo(() => data?.filings ?? [], [data?.filings])

  useEffect(() => {
    if (data?.filings) {
      setLastUpdatedAt(Date.now())
    }
  }, [data?.filings])

  useEffect(() => {
    if (!filings.length) return

    const currentIds = new Set(filings.map((f) => f.id))
    const fresh = new Set<string>()

    currentIds.forEach((id) => {
      if (!seenIdsRef.current.has(id)) {
        fresh.add(id)
      }
    })

    seenIdsRef.current = currentIds
    if (fresh.size > 0) {
      setNewIds(fresh)
    }
  }, [filings])

  useEffect(() => {
    if (!lastUpdatedAt) return
    const update = () => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdatedAt) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lastUpdatedAt])

  const metrics = useMemo(() => computeFeedMetrics(filings), [filings])

  const sortedFilings = useMemo(
    () =>
      [...filings].sort(
        (a, b) => new Date(b.filedAt).getTime() - new Date(a.filedAt).getTime()
      ),
    [filings]
  )

  const filteredFilings = useMemo(
    () => filterFilings(sortedFilings, filter),
    [sortedFilings, filter]
  )

  if (isLoading) {
    return <FeedSkeleton />
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load data"
        onRetry={() => mutate()}
      />
    )
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard
          label="Filings today"
          value={String(metrics.filingsToday)}
          sub={`Last 24 hours`}
        />
        <MetricCard
          label="Total value filed"
          value={formatCurrency(metrics.totalValue)}
          sub={`Across ${metrics.tickerCount} tickers`}
        />
        <MetricCard
          label="Insider buys"
          value={String(metrics.insiderBuys)}
          sub="Form 4 · last 24h"
        />
        <MetricCard
          label="New 13D/G alerts"
          value={String(metrics.newThirteenDG)}
          sub="5%+ threshold"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          Recent filings
        </h2>
      </div>

      <FilterChips
        options={FEED_FILTERS}
        selected={filter}
        onChange={setFilter}
      />

      <div className="rounded-lg border border-gray-200 px-3.5 dark:border-gray-800">
        {filteredFilings.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No filings match this filter.
          </p>
        ) : (
          filteredFilings.map((filing) => (
            <FilingFeedItem
              key={filing.id}
              filing={filing}
              isNew={newIds.has(filing.id)}
            />
          ))
        )}
      </div>

      <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
        Last updated: {secondsAgo} seconds ago
      </p>
    </div>
  )
}
