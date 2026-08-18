'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ErrorState } from '@/components/ErrorState'
import { FilingBadge } from '@/components/FilingBadge'
import { FilterChips } from '@/components/FilterChips'
import { InvestorAvatar } from '@/components/InvestorAvatar'
import { MetricCard } from '@/components/MetricCard'
import { TickerPill } from '@/components/TickerPill'
import type { ActionType, InvestmentRow } from '@/lib/types'
import {
  formatCurrency,
  formatPct,
  formatShares,
  formatShortDate,
  formatSignedCurrency,
} from '@/lib/utils'
import { swrFetcher } from '@/lib/swr-fetcher'

const PAGE_SIZE = 20

const ACTION_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'New positions', value: 'new' },
  { label: 'Increased', value: 'increased' },
  { label: 'Reduced', value: 'reduced' },
  { label: 'Exited', value: 'exited' },
]

const SECTOR_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Tech', value: 'tech' },
  { label: 'Energy', value: 'energy' },
  { label: 'Finance', value: 'finance' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Consumer', value: 'consumer' },
]

type SortColumn =
  | 'investor'
  | 'ticker'
  | 'action'
  | 'date'
  | 'amount'
  | 'portfolioPct'
  | 'shares'
  | 'avgPrice'
  | 'form'

type SortState = {
  column: SortColumn
  direction: 'asc' | 'desc'
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'investor', label: 'Investor' },
  { key: 'ticker', label: 'Ticker' },
  { key: 'action', label: 'Action' },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'portfolioPct', label: '% of portfolio' },
  { key: 'shares', label: 'Shares' },
  { key: 'avgPrice', label: 'Avg price' },
  { key: 'form', label: 'Form' },
]

function computeInvestmentMetrics(rows: InvestmentRow[]) {
  const investorKeys = new Set(
    rows.map((r) => r.investorCik || r.investorName)
  )
  const tickers = new Set(rows.map((r) => r.ticker).filter(Boolean))
  const totalAum = rows.reduce(
    (sum, r) => sum + Math.abs(r.amount ?? 0),
    0
  )
  const newThisQuarter = rows.filter((r) => r.action === 'new').length

  return {
    trackedInvestors: investorKeys.size,
    uniqueTickers: tickers.size,
    totalAum,
    newThisQuarter,
  }
}

function getActionDisplay(action?: ActionType): {
  icon: string
  label: string
  className: string
} {
  switch (action) {
    case 'new':
      return {
        icon: '●',
        label: 'New',
        className: 'text-blue-600 dark:text-blue-400',
      }
    case 'increased':
    case 'buy':
      return {
        icon: '▲',
        label: action === 'buy' ? 'Buy' : 'Added',
        className: 'text-green-600 dark:text-green-400',
      }
    case 'reduced':
    case 'sell':
      return {
        icon: '▼',
        label: action === 'sell' ? 'Sell' : 'Reduced',
        className: 'text-red-600 dark:text-red-400',
      }
    case 'exited':
      return {
        icon: '▼',
        label: 'Exited',
        className: 'text-red-600 dark:text-red-400',
      }
    default:
      return {
        icon: '●',
        label: '—',
        className: 'text-gray-500 dark:text-gray-400',
      }
  }
}

function sortRows(
  rows: InvestmentRow[],
  { column, direction }: SortState
): InvestmentRow[] {
  const mult = direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    let cmp = 0
    switch (column) {
      case 'investor':
        cmp = a.investorName.localeCompare(b.investorName)
        break
      case 'ticker':
        cmp = (a.ticker ?? '').localeCompare(b.ticker ?? '')
        break
      case 'action':
        cmp = (a.action ?? '').localeCompare(b.action ?? '')
        break
      case 'date':
        cmp =
          new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime()
        break
      case 'amount':
        cmp = (a.amount ?? 0) - (b.amount ?? 0)
        break
      case 'portfolioPct':
        cmp = (a.portfolioPct ?? 0) - (b.portfolioPct ?? 0)
        break
      case 'shares':
        cmp = (a.shares ?? 0) - (b.shares ?? 0)
        break
      case 'avgPrice':
        cmp = (a.avgPrice ?? 0) - (b.avgPrice ?? 0)
        break
      case 'form':
        cmp = a.formType.localeCompare(b.formType)
        break
    }
    return cmp * mult
  })
}

function InvestmentsSkeleton() {
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
      <div className="mb-2 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="mb-3.5 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="h-9 animate-pulse bg-gray-100 dark:bg-gray-900" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
          />
        ))}
      </div>
    </div>
  )
}

export default function InvestmentsPage() {
  const router = useRouter()
  const [actionFilter, setActionFilter] = useState('all')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [sort, setSort] = useState<SortState>({
    column: 'date',
    direction: 'desc',
  })
  const [page, setPage] = useState(0)

  const { data, error, isLoading, mutate } = useSWR<{
    investments: InvestmentRow[]
  }>('/api/investments', swrFetcher, { refreshInterval: 120000 })

  const investments = useMemo(
    () => data?.investments ?? [],
    [data?.investments]
  )

  const metrics = useMemo(
    () => computeInvestmentMetrics(investments),
    [investments]
  )

  const filtered = useMemo(() => {
    let rows = investments
    if (actionFilter !== 'all') {
      rows = rows.filter((r) => r.action === actionFilter)
    }
    if (sectorFilter !== 'all') {
      rows = rows.filter((r) => r.sector === sectorFilter)
    }
    return rows
  }, [investments, actionFilter, sectorFilter])

  const sorted = useMemo(
    () => sortRows(filtered, sort),
    [filtered, sort]
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = sorted.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  )

  const showingFrom = sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const showingTo = Math.min((safePage + 1) * PAGE_SIZE, sorted.length)

  function handleSort(column: SortColumn) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    )
    setPage(0)
  }

  function handleActionChange(value: string) {
    setActionFilter(value)
    setPage(0)
  }

  function handleSectorChange(value: string) {
    setSectorFilter(value)
    setPage(0)
  }

  if (isLoading) {
    return <InvestmentsSkeleton />
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
          label="Tracked investors"
          value={String(metrics.trackedInvestors)}
        />
        <MetricCard
          label="Unique tickers"
          value={String(metrics.uniqueTickers)}
        />
        <MetricCard
          label="Total tracked AUM"
          value={formatCurrency(metrics.totalAum)}
        />
        <MetricCard
          label="New this quarter"
          value={String(metrics.newThisQuarter)}
          sub="positions opened"
        />
      </div>

      <div className="mb-3">
        <h2 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          All investments
        </h2>
      </div>

      <FilterChips
        options={ACTION_FILTERS}
        selected={actionFilter}
        onChange={handleActionChange}
      />
      <FilterChips
        options={SECTOR_FILTERS}
        selected={sectorFilter}
        onChange={handleSectorChange}
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full min-w-[900px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="cursor-pointer px-3 py-2 text-left text-[11px] font-medium text-gray-600 select-none dark:text-gray-400"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sort.column === col.key ? (
                    <span className="ml-1">
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No investments match these filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const action = getActionDisplay(row.action)
                const clickable = Boolean(row.investorCik)
                const amountClass =
                  (row.amount ?? 0) > 0
                    ? 'text-green-600 dark:text-green-400'
                    : (row.amount ?? 0) < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'

                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      if (clickable) {
                        router.push(`/dashboard/investor/${row.investorCik}`)
                      }
                    }}
                    className={`border-b border-gray-200 last:border-b-0 dark:border-gray-800 ${
                      clickable
                        ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50'
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <InvestorAvatar
                          initials={row.avatarInitials}
                          color={row.avatarColor}
                          size="sm"
                        />
                        <span className="text-gray-900 dark:text-gray-100">
                          {row.investorName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {row.ticker ? <TickerPill ticker={row.ticker} /> : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[11px] font-medium ${action.className}`}
                      >
                        {action.icon} {action.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {formatShortDate(row.filedAt)}
                    </td>
                    <td className={`px-3 py-2 font-medium ${amountClass}`}>
                      {row.amount != null
                        ? formatSignedCurrency(row.amount)
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {row.portfolioPct != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          {formatPct(row.portfolioPct)}
                          <span className="inline-block h-1 w-20 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                            <span
                              className="block h-full rounded bg-blue-500"
                              style={{
                                width: `${Math.min(row.portfolioPct, 100)}%`,
                              }}
                            />
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {row.shares != null ? formatShares(row.shares) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {row.avgPrice != null
                        ? `$${row.avgPrice.toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <FilingBadge form={row.formType} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
        <span>
          Showing {showingFrom}–{showingTo} of {sorted.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-gray-200 bg-white px-3 py-1 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded border border-gray-200 bg-white px-3 py-1 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
