'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { ErrorState } from '@/components/ErrorState'
import { MetricCard } from '@/components/MetricCard'
import { formatShortDate } from '@/lib/utils'
import { swrFetcher } from '@/lib/swr-fetcher'

const PAGE_SIZE = 50

type InsiderRow = {
  id: number
  name: string
  company_name: string
  ticker: string | null
  action: string | null
  filed_at: string
  amount: number | null
  shares: number | null
}

type InsidersResponse = {
  insiders: InsiderRow[]
  total: number
  page: number
  limit: number
}

export default function InsidersPage() {
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
      page: String(page + 1),
      limit: String(PAGE_SIZE),
    })
    if (debouncedQ) params.set('q', debouncedQ)
    return `/api/insiders?${params.toString()}`
  }, [debouncedQ, page])

  const { data, error, isLoading, mutate } = useSWR<InsidersResponse>(
    apiUrl,
    swrFetcher
  )

  const insiders = data?.insiders ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (error) {
    return (
      <ErrorState message="Failed to load insiders" onRetry={() => mutate()} />
    )
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <MetricCard label="Insider filings" value={total.toLocaleString()} />
        <MetricCard label="On this page" value={String(insiders.length)} />
        <MetricCard label="Source" value="Form 4" />
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
            Corporate insiders
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Form 4 trade disclosures — individual transactions, not full portfolios.
          </p>
        </div>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search insider or company…"
          className="w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {isLoading && !data ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      ) : insiders.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No insider filings yet. Run{' '}
          <code className="text-xs">npm run ingest:form4</code> to populate.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[600px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  Insider
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  Company
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  Action
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  Filed
                </th>
              </tr>
            </thead>
            <tbody>
              {insiders.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-200 last:border-b-0 dark:border-gray-800"
                >
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {row.company_name}
                    {row.ticker ? ` (${row.ticker})` : ''}
                  </td>
                  <td
                    className={`px-3 py-2 font-medium ${
                      row.action === 'buy'
                        ? 'text-green-600 dark:text-green-400'
                        : row.action === 'sell'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {row.action ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {formatShortDate(row.filed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-gray-700"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-gray-700"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
