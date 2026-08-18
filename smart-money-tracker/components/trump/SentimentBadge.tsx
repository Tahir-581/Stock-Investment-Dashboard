import type { TrumpSentiment } from '@/lib/types'

const SENTIMENT_STYLES: Record<
  TrumpSentiment,
  { label: string; className: string }
> = {
  positive: {
    label: 'Bullish',
    className:
      'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
  },
  negative: {
    label: 'Bearish',
    className:
      'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  },
  neutral: {
    label: 'Neutral',
    className:
      'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
  mixed: {
    label: 'Mixed',
    className:
      'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800',
  },
}

type SentimentBadgeProps = {
  sentiment: TrumpSentiment
}

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const style = SENTIMENT_STYLES[sentiment]
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${style.className}`}
    >
      {style.label}
    </span>
  )
}
