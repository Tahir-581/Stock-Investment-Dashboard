'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { ErrorState } from '@/components/ErrorState'
import { FilterChips } from '@/components/FilterChips'
import { InvestorAvatar } from '@/components/InvestorAvatar'
import { MetricCard } from '@/components/MetricCard'
import type { Investor } from '@/lib/types'
import {
  formatCurrency,
  formatPct,
  formatShortDate,
  getInvestorTypeLabel,
} from '@/lib/utils'
import { swrFetcher } from '@/lib/swr-fetcher'

const TYPE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Hedge funds', value: 'hedge_fund' },
  { label: 'PE / Activist', value: 'pe_activist' },
  { label: 'Individuals', value: 'individual' },
  { label: 'Mutual funds', value: 'mutual_fund' },
]

const PAGE_SIZE = 50

type InvestorsResponse = {
  investors: Investor[]
  total: number
  page: number
  limit: number
  totalAum: number
}

function InvestorsSkeleton() {
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="mb-3.5 h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="mb-3.5 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          />
        ))}
      </div>
    </div>
  )
}

export default function InvestorsPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchInput.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: typeFilter,
      page: String(page + 1),
      limit: String(PAGE_SIZE),
      sort: 'aum',
    })
    if (debouncedQ) params.set('q', debouncedQ)
    return `/api/investors?${params.toString()}`
  }, [typeFilter, debouncedQ, page])

  const { data, error, isLoading, mutate } = useSWR<InvestorsResponse>(
    apiUrl,
    swrFetcher
  )

  const investors = data?.investors ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total)

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value)
    setPage(0)
  }, [])

  if (isLoading && !data) {
    return <InvestorsSkeleton />
  }

  if (error) {
    return (
      <ErrorState message="Failed to load data" onRetry={() => mutate()} />
    )
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label="Tracked investors" value={total.toLocaleString()} />
        <MetricCard
          label="Total AUM"
          value={formatCurrency(data?.totalAum ?? 0)}
        />
        <MetricCard
          label="On this page"
          value={String(investors.length)}
        />
        <MetricCard label="Page" value={`${page + 1} / ${totalPages}`} />
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          13F filers directory
        </h2>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name…"
          className="w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <FilterChips
        options={TYPE_FILTERS}
        selected={typeFilter}
        onChange={handleTypeChange}
      />

      {total > 0 ? (
        <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
          Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of{' '}
          {total.toLocaleString()} filers
        </p>
      ) : null}

      {investors.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No investors match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {investors.map((investor) => {
            const ytdPositive = investor.ytdChange >= 0
            return (
              <Link
                key={investor.cik}
                href={`/dashboard/investor/${investor.cik}`}
                className="block rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-blue-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800"
              >
                <div className="mb-3 flex items-center gap-2">
                  <InvestorAvatar
                    initials={investor.avatarInitials}
                    color={investor.avatarColor}
                    size="md"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {investor.name}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {getInvestorTypeLabel(investor.type)}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      AUM
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(investor.aum)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      Holdings
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {investor.holdingsCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      YTD change
                    </div>
                    <div
                      className={`font-medium ${
                        ytdPositive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatPct(investor.ytdChange, true)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span>
                    Top position:{' '}
                    <span className="text-gray-700 dark:text-gray-300">
                      {investor.topTicker} {formatPct(investor.topPct)}
                    </span>
                  </span>
                  <span>
                    Last filed:{' '}
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatShortDate(investor.lastFilingDate)}
                    </span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
