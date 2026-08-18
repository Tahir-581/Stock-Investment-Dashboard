'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { ErrorState } from '@/components/ErrorState'
import { FilingBadge } from '@/components/FilingBadge'
import { InvestorAvatar } from '@/components/InvestorAvatar'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MetricCard } from '@/components/MetricCard'
import { TickerPill } from '@/components/TickerPill'
import { useToast } from '@/components/Toast'
import {
  appendAlert,
  PROFILE_TRIGGER_LABELS,
  type ProfileAlertTrigger,
} from '@/lib/alerts'
import type { Filing, Holding, InvestorProfile } from '@/lib/types'
import {
  formatCurrency,
  formatPct,
  formatShares,
  formatShortDate,
  formatSignedCurrency,
  getInvestorTypeLabel,
} from '@/lib/utils'
import { swrFetcher } from '@/lib/swr-fetcher'

type Tab = 'holdings' | 'changes' | 'filings'

type SortColumn =
  | 'companyName'
  | 'ticker'
  | 'value'
  | 'shares'
  | 'portfolioPct'
  | 'qoqChange'

type SortState = {
  column: SortColumn
  direction: 'asc' | 'desc'
}

const HOLDINGS_COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'companyName', label: 'Company' },
  { key: 'ticker', label: 'Ticker' },
  { key: 'value', label: 'Value' },
  { key: 'shares', label: 'Shares' },
  { key: 'portfolioPct', label: '% of portfolio' },
  { key: 'qoqChange', label: 'QoQ change' },
]

const HOLDINGS_PAGE_SIZE = 50

type HoldingsResponse = {
  holdings: Holding[]
  total: number
  page: number
  limit: number
  reportPeriod: string
  periods: string[]
  summary?: {
    totalValue: number
    holdingsCount: number
    top5Concentration: number
  }
}

function sortColumnToApi(column: SortColumn): string {
  switch (column) {
    case 'companyName':
      return 'name'
    case 'ticker':
      return 'ticker'
    case 'portfolioPct':
      return 'pct'
    case 'qoqChange':
      return 'qoq'
    case 'shares':
      return 'shares'
    default:
      return 'value'
  }
}
const PROFILE_TRIGGERS: ProfileAlertTrigger[] = [
  '13f',
  'new_position',
  'add_position',
  '13d',
]

function normalizeCik(cik: string): string {
  return cik.replace(/^0+/, '')
}

function getQoQDisplay(holding: Holding): {
  label: string
  className: string
} {
  if (holding.isNew) {
    return {
      label: '— New',
      className: 'text-blue-600 dark:text-blue-400',
    }
  }
  if (holding.qoqChange === 0) {
    return {
      label: '— Unchanged',
      className: 'text-gray-500 dark:text-gray-400',
    }
  }
  if (holding.qoqChange > 0) {
    return {
      label: `▲ ${formatPct(holding.qoqChange, true)}`,
      className: 'text-green-600 dark:text-green-400',
    }
  }
  return {
    label: `▼ ${formatPct(holding.qoqChange)}`,
    className: 'text-red-600 dark:text-red-400',
  }
}

function sortHoldings(
  rows: Holding[],
  { column, direction }: SortState
): Holding[] {
  const mult = direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    let cmp = 0
    switch (column) {
      case 'companyName':
        cmp = a.companyName.localeCompare(b.companyName)
        break
      case 'ticker':
        cmp = a.ticker.localeCompare(b.ticker)
        break
      case 'value':
        cmp = a.value - b.value
        break
      case 'shares':
        cmp = a.shares - b.shares
        break
      case 'portfolioPct':
        cmp = a.portfolioPct - b.portfolioPct
        break
      case 'qoqChange':
        cmp = a.qoqChange - b.qoqChange
        break
    }
    return cmp * mult
  })
}

function ProfileSkeleton() {
  return (
    <div>
      <div className="mb-5 h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="mb-4 h-9 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <LoadingSkeleton rows={6} columns={6} />
    </div>
  )
}

export default function InvestorProfilePage({
  params,
}: {
  params: { cik: string }
}) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('holdings')
  const [showAlertPanel, setShowAlertPanel] = useState(false)
  const [alertTrigger, setAlertTrigger] = useState<ProfileAlertTrigger>('13f')
  const [alertEmail, setAlertEmail] = useState('')
  const [sort, setSort] = useState<SortState>({
    column: 'portfolioPct',
    direction: 'desc',
  })
  const [holdingsPage, setHoldingsPage] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [companySearch, setCompanySearch] = useState('')
  const [debouncedCompanyQ, setDebouncedCompanyQ] = useState('')

  const {
    data: profile,
    error,
    isLoading,
    mutate,
  } = useSWR<InvestorProfile>(`/api/investor/${params.cik}`, swrFetcher)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCompanyQ(companySearch.trim())
      setHoldingsPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [companySearch])

  const holdingsUrl = useMemo(() => {
    if (activeTab === 'filings') return null
    const search = new URLSearchParams({
      page: String(holdingsPage + 1),
      limit: String(HOLDINGS_PAGE_SIZE),
      sort: sortColumnToApi(sort.column),
      order: sort.direction,
    })
    if (selectedPeriod) search.set('period', selectedPeriod)
    if (activeTab === 'changes') search.set('changes', 'true')
    if (debouncedCompanyQ) search.set('q', debouncedCompanyQ)
    return `/api/investor/${params.cik}/holdings?${search.toString()}`
  }, [
    params.cik,
    holdingsPage,
    sort.column,
    sort.direction,
    selectedPeriod,
    activeTab,
    debouncedCompanyQ,
  ])

  const {
    data: holdingsData,
    error: holdingsError,
    isLoading: holdingsLoading,
    mutate: mutateHoldings,
  } = useSWR<HoldingsResponse>(holdingsUrl, swrFetcher)

  useEffect(() => {
    if (
      holdingsData?.reportPeriod &&
      !selectedPeriod &&
      holdingsData.periods.length
    ) {
      setSelectedPeriod(holdingsData.reportPeriod)
    }
  }, [holdingsData?.reportPeriod, holdingsData?.periods.length, selectedPeriod])

  useEffect(() => {
    setHoldingsPage(0)
  }, [activeTab, selectedPeriod, sort.column, sort.direction])

  const {
    data: filingsData,
    error: filingsError,
    isLoading: filingsLoading,
    mutate: mutateFilings,
  } = useSWR<{ filings: Filing[] }>('/api/filings', swrFetcher)

  const investorFilings = useMemo(() => {
    const filings = filingsData?.filings ?? []
    const normalized = normalizeCik(params.cik)
    return filings.filter(
      (f) => normalizeCik(f.investorCik) === normalized
    )
  }, [filingsData?.filings, params.cik])

  const holdings = useMemo(
    () => holdingsData?.holdings ?? profile?.holdings ?? [],
    [holdingsData?.holdings, profile?.holdings]
  )

  const holdingsTotal = holdingsData?.total ?? profile?.totalHoldings ?? holdings.length
  const holdingsTotalPages = Math.max(
    1,
    Math.ceil(holdingsTotal / HOLDINGS_PAGE_SIZE)
  )
  const periods = holdingsData?.periods ?? profile?.reportPeriods ?? []

  const displayAum =
    holdingsData?.summary?.totalValue ?? profile?.aum ?? 0
  const displayHoldingsCount =
    holdingsData?.summary?.holdingsCount ??
    profile?.totalHoldings ??
    profile?.holdingsCount ??
    0
  const displayTop5 =
    holdingsData?.summary?.top5Concentration ??
    profile?.top5Concentration ??
    0

  const displayRows = useMemo(() => {
    if (holdingsData) return holdings
    return sortHoldings(holdings, sort)
  }, [holdings, holdingsData, sort])

  function handleSort(column: SortColumn) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    )
  }

  function handleSaveAlert() {
    if (!profile) return

    appendAlert({
      id: `profile-${profile.cik}-${Date.now()}`,
      name: `${profile.name}: ${PROFILE_TRIGGER_LABELS[alertTrigger]}`,
      alertType: alertTrigger,
      trigger: alertTrigger,
      investor: profile.name,
      investorCik: profile.cik,
      investorName: profile.name,
      email: alertEmail,
      active: true,
      description: PROFILE_TRIGGER_LABELS[alertTrigger],
    })

    showToast('Alert saved')
    setShowAlertPanel(false)
    setAlertEmail('')
  }

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load data"
        onRetry={() => mutate()}
      />
    )
  }

  if (!profile?.name) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Investor not found.
        </p>
        <Link
          href="/dashboard/investors"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to investors
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-4">
            <InvestorAvatar
              initials={profile.avatarInitials}
              color={profile.avatarColor}
              size="lg"
            />
            <div>
              <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {profile.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getInvestorTypeLabel(profile.type)} · CIK {profile.cik}
              </p>
              {profile.description ? (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {profile.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/dashboard/investor/${params.cik}/analysis`}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              Analyze thesis
            </Link>
            <button
              type="button"
              onClick={() => setShowAlertPanel((open) => !open)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
            >
              Set alert
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height] duration-300 ${
            showAlertPanel ? 'max-h-96' : 'max-h-0'
          }`}
        >
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="mb-3 text-xs font-medium text-gray-700 dark:text-gray-300">
              Alert me when this investor:
            </p>
            <div className="mb-4 flex flex-col gap-2">
              {PROFILE_TRIGGERS.map((trigger) => (
                <label
                  key={trigger}
                  className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="radio"
                    name="alert-trigger"
                    checked={alertTrigger === trigger}
                    onChange={() => setAlertTrigger(trigger)}
                    className="text-blue-600"
                  />
                  {PROFILE_TRIGGER_LABELS[trigger]}
                </label>
              ))}
            </div>
            <div className="mb-4">
              <label
                htmlFor="alert-email"
                className="mb-1 block text-xs text-gray-600 dark:text-gray-400"
              >
                Notify at:
              </label>
              <input
                id="alert-email"
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveAlert}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Save alert
              </button>
              <button
                type="button"
                onClick={() => setShowAlertPanel(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label="AUM" value={formatCurrency(displayAum)} />
        <MetricCard
          label="Holdings count"
          value={displayHoldingsCount.toLocaleString()}
        />
        <MetricCard
          label="Top 5 concentration"
          value={formatPct(displayTop5)}
        />
        <MetricCard
          label="Report period"
          value={
            selectedPeriod || profile.latestReportPeriod
              ? formatShortDate(
                  selectedPeriod || profile.latestReportPeriod || ''
                )
              : '—'
          }
        />
      </div>

      {activeTab !== 'filings' ? (
        <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
          Holdings reflect the latest SEC 13F quarter-end snapshot (filed up to 45
          days after quarter end). Not real-time positions.
        </p>
      ) : null}

      <div className="mb-4 flex border-b border-gray-200 dark:border-gray-800">
        {(
          [
            { id: 'holdings' as Tab, label: 'Holdings' },
            { id: 'changes' as Tab, label: 'Changes this quarter' },
            { id: 'filings' as Tab, label: 'All filings' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'filings' ? (
        filingsError ? (
          <ErrorState
            message="Failed to load filings"
            onRetry={() => mutateFilings()}
          />
        ) : filingsLoading ? (
          <LoadingSkeleton rows={4} columns={4} />
        ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full min-w-[500px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  Form
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  Ticker
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-600 dark:text-gray-400">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {investorFilings.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No filings found for this investor.
                  </td>
                </tr>
              ) : (
                investorFilings.map((filing) => {
                  const amount = filing.amount ?? filing.aum
                  const amountClass =
                    (amount ?? 0) > 0
                      ? 'text-green-600 dark:text-green-400'
                      : (amount ?? 0) < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400'

                  return (
                    <tr
                      key={filing.id}
                      className="border-b border-gray-200 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-3 py-2">
                        <FilingBadge form={filing.formType} />
                      </td>
                      <td className="px-3 py-2">
                        {filing.ticker ? (
                          <TickerPill ticker={filing.ticker} />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {formatShortDate(filing.filedAt)}
                      </td>
                      <td className={`px-3 py-2 font-medium ${amountClass}`}>
                        {amount != null ? formatSignedCurrency(amount) : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        )
      ) : (
        <>
          {periods.length > 1 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Quarter:
              </span>
              {periods.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    (selectedPeriod || periods[0]) === period
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {formatShortDate(period)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mb-3">
            <input
              type="search"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search company or ticker…"
              className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {holdingsError ? (
            <ErrorState
              message="Failed to load holdings"
              onRetry={() => mutateHoldings()}
            />
          ) : holdingsLoading && !holdingsData ? (
            <LoadingSkeleton rows={6} columns={6} />
          ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          {holdingsTotal > 0 ? (
            <p className="border-b border-gray-200 px-3 py-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Showing {holdingsPage * HOLDINGS_PAGE_SIZE + 1}–
              {Math.min((holdingsPage + 1) * HOLDINGS_PAGE_SIZE, holdingsTotal)}{' '}
              of {holdingsTotal.toLocaleString()} holdings
            </p>
          ) : null}
          <table className="w-full min-w-[700px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                {HOLDINGS_COLUMNS.map((col) => (
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
              {displayRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={HOLDINGS_COLUMNS.length}
                    className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {activeTab === 'changes'
                      ? 'No position changes this quarter.'
                      : 'No holdings data available.'}
                  </td>
                </tr>
              ) : (
                displayRows.map((holding, idx) => {
                  const qoq = getQoQDisplay(holding)
                  return (
                    <tr
                      key={`${holding.ticker}-${holding.companyName}-${idx}`}
                      className="border-b border-gray-200 last:border-b-0 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {holding.companyName}
                      </td>
                      <td className="px-3 py-2">
                        <TickerPill ticker={holding.ticker} />
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {formatCurrency(holding.value)}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {formatShares(holding.shares)}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center gap-1.5">
                          {formatPct(holding.portfolioPct)}
                          <span className="inline-block h-1 w-20 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                            <span
                              className="block h-full rounded bg-blue-500"
                              style={{
                                width: `${Math.min(holding.portfolioPct, 100)}%`,
                              }}
                            />
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[11px] font-medium ${qoq.className}`}
                        >
                          {qoq.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
          )}

          {holdingsTotalPages > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={holdingsPage === 0}
                onClick={() => setHoldingsPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {holdingsPage + 1} of {holdingsTotalPages}
              </span>
              <button
                type="button"
                disabled={holdingsPage >= holdingsTotalPages - 1}
                onClick={() =>
                  setHoldingsPage((p) => Math.min(holdingsTotalPages - 1, p + 1))
                }
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
