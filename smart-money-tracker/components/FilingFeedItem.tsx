'use client'

import { useRouter } from 'next/navigation'
import { FilingBadge } from '@/components/FilingBadge'
import { TickerPill } from '@/components/TickerPill'
import type { Filing } from '@/lib/types'
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatSignedCurrency,
  getCurrentQuarterLabel,
  getInvestorTypeLabel,
} from '@/lib/utils'

function getDotColor(filing: Filing): string {
  if (filing.formType === '4') {
    return filing.action === 'buy' ? 'bg-green-500' : 'bg-red-500'
  }
  if (filing.formType === '13G') return 'bg-amber-500'
  if (filing.formType === '13F' || filing.formType === '13D') return 'bg-blue-500'
  return 'bg-gray-400'
}

function getActionPhrase(filing: Filing): string {
  if (filing.formType === '4') {
    return filing.action === 'buy' ? 'bought' : 'sold'
  }
  if (filing.formType === '13D' || filing.formType === '13G') {
    return filing.action === 'new' ? 'filed on' : 'increased stake in'
  }
  if (filing.formType === '13F') {
    return `— ${getCurrentQuarterLabel(new Date(filing.filedAt))} holdings`
  }
  return 'filed a'
}

function getAmountDisplay(filing: Filing): { text: string; className: string } {
  if (filing.formType === '13F' && filing.aum != null) {
    return {
      text: `${formatCurrency(filing.aum)} AUM`,
      className: 'text-gray-500 dark:text-gray-400',
    }
  }
  if (filing.amount == null) {
    return { text: '—', className: 'text-gray-500 dark:text-gray-400' }
  }
  if (filing.amount > 0) {
    return {
      text: formatSignedCurrency(filing.amount),
      className: 'text-green-600 dark:text-green-400',
    }
  }
  if (filing.amount < 0) {
    return {
      text: formatSignedCurrency(filing.amount),
      className: 'text-red-600 dark:text-red-400',
    }
  }
  return {
    text: formatCurrency(0),
    className: 'text-gray-500 dark:text-gray-400',
  }
}

type FilingFeedItemProps = {
  filing: Filing
  isNew?: boolean
}

export function FilingFeedItem({ filing, isNew }: FilingFeedItemProps) {
  const router = useRouter()
  const clickable = Boolean(filing.investorCik)
  const amount = getAmountDisplay(filing)

  const metaParts = [
    filing.companyName,
    getInvestorTypeLabel(filing.investorType),
    `Filed ${formatRelativeTime(filing.filedAt)}`,
    filing.transactionDate
      ? `Trans. date ${formatDate(filing.transactionDate)}`
      : null,
  ].filter(Boolean)

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => {
        if (clickable) router.push(`/dashboard/investor/${filing.investorCik}`)
      }}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          router.push(`/dashboard/investor/${filing.investorCik}`)
        }
      }}
      className={`flex gap-3 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-800 ${
        clickable
          ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50'
          : ''
      } ${isNew ? 'animate-fade-in' : ''}`}
    >
      <div
        className={`mt-1.5 size-2 shrink-0 rounded-full ${getDotColor(filing)}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
          <FilingBadge form={filing.formType} />{' '}
          <span>{filing.investorName}</span>{' '}
          <span className="font-normal text-gray-700 dark:text-gray-300">
            {getActionPhrase(filing)}
          </span>{' '}
          {filing.ticker ? <TickerPill ticker={filing.ticker} /> : null}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
          {metaParts.join(' · ')}
        </div>
      </div>
      <div
        className={`shrink-0 text-xs font-medium whitespace-nowrap ${amount.className}`}
      >
        {amount.text}
      </div>
    </div>
  )
}
