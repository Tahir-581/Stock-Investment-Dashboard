type TickerPillProps = {
  ticker: string
}

export function TickerPill({ ticker }: TickerPillProps) {
  return (
    <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      {ticker}
    </span>
  )
}
