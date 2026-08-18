import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatPctMove } from '@/lib/trump/map-api'

type PriceReactionBadgeProps = {
  pctMove: number | null | undefined
  label: string
}

export function PriceReactionBadge({ pctMove, label }: PriceReactionBadgeProps) {
  if (pctMove == null || Number.isNaN(pctMove)) {
    return (
      <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500">
        — <span className="font-normal text-gray-400">{label}</span>
      </span>
    )
  }

  const isPositive = pctMove >= 0
  const formatted = formatPctMove(pctMove)

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${
        isPositive
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      {isPositive ? (
        <ArrowUp className="size-3" aria-hidden />
      ) : (
        <ArrowDown className="size-3" aria-hidden />
      )}
      {formatted}
      {label ? (
        <>
          {' '}
          <span className="font-normal text-gray-500 dark:text-gray-400">
            {label}
          </span>
        </>
      ) : null}
    </span>
  )
}
