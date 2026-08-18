import { getQuoteBorderColor } from '@/lib/trump/map-api'
import { formatTimeAgo } from '@/lib/utils'

type QuoteCardProps = {
  quote: string
  ticker: string
  companyName: string
  postedAt: string
}

export function QuoteCard({
  quote,
  ticker,
  companyName,
  postedAt,
}: QuoteCardProps) {
  const borderColor = getQuoteBorderColor(ticker)

  return (
    <div
      className={`rounded-r-lg border-l-[3px] bg-gray-50 p-3 dark:bg-gray-900 ${borderColor}`}
    >
      <p className="text-[13px] italic leading-relaxed text-gray-700 dark:text-gray-300">
        {quote}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          {ticker}
        </span>
        <span className="text-[11px] text-gray-600 dark:text-gray-400">
          {companyName}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {formatTimeAgo(postedAt)}
        </span>
      </div>
    </div>
  )
}
