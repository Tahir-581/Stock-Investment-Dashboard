'use client'

import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TrumpMention } from '@/lib/types'
import {
  formatPrice,
  formatPctMove,
  computePctMoveFromPrices,
  getLiveMoveClass,
} from '@/lib/trump/map-api'
import { formatTimeAgo } from '@/lib/utils'
import { QuoteCard } from './QuoteCard'
import { SentimentBadge } from './SentimentBadge'
import { SourceBadge } from './SourceBadge'

type MentionCardProps = {
  mention: TrumpMention
  currentPrice?: number | null
  onClick?: () => void
  animate?: boolean
}

export function MentionCard({
  mention,
  currentPrice,
  onClick,
  animate = false,
}: MentionCardProps) {
  const router = useRouter()
  const sinceNewsPct = computePctMoveFromPrices(
    mention.priceAtMention,
    currentPrice
  )

  function handleClick() {
    if (onClick) {
      onClick()
      return
    }
    router.push(`/dashboard/trump-watch/${mention.ticker}`)
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={[
        'cursor-pointer rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-blue-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800',
        animate ? 'animate-fade-in' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <SourceBadge
          sourceType={mention.sourceType}
          sourceUrl={mention.sourceUrl}
          sourceTitle={mention.sourceTitle}
        />
        <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
          {formatTimeAgo(mention.postedAt)}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          {mention.ticker}
        </span>
        <span className="text-[12px] text-gray-700 dark:text-gray-300">
          {mention.companyName}
        </span>
        <SentimentBadge sentiment={mention.sentiment} />
      </div>

      <QuoteCard
        quote={mention.trumpQuote}
        ticker={mention.ticker}
        companyName={mention.companyName}
        postedAt={mention.postedAt}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge
            sourceType={mention.sourceType}
            sourceUrl={mention.sourceUrl}
            sourceTitle={mention.sourceTitle}
          />
          <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
            <CheckCircle className="size-3" aria-hidden />
            Verified source
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Price: {formatPrice(mention.priceAtMention)}
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Now: {formatPrice(currentPrice)}
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span
            className={`font-medium ${getLiveMoveClass(sinceNewsPct)}`}
          >
            Since news:{' '}
            {sinceNewsPct != null ? formatPctMove(sinceNewsPct) : '—'}
          </span>
        </div>
      </div>
    </article>
  )
}
